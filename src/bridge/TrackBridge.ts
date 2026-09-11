import {
    AccelerationPolicy,
    DirectionPolicy,
    FootprintCompletionPolicy,
    MovePolicy,
    PositionPolicy,
    PxPerMMEstimator,
    PxPerMMPolicy,
    RotatePolicy,
    MotionHistoryPolicy,
} from "../core/base";
import {
    Apertured,
    BaseFactory,
    DuoHost,
    DuoInsert,
    FilledPuck,
    IdentityMap,
    KindRegistry,
    Nestable,
    Nesting,
    OpenPuck,
    PhysicalRegistry,
    Presence,
    PresencePolicy,
    SimulatedPuck,
    affordanceOf,
    isTangible,
} from "../core/physical";
import { MAX_RETURN_PX } from "./constants";
import { templateToKind } from "./templateToKind";
import type { TrackBridgeContact } from "./TrackBridgeContact";
import { ContactStatusTracker } from "../core/contact";
import type {
    ContactFrame,
    ContactPoint,
    SensedContact,
} from "../core/contact";
import type {
    BasePolicies,
    PhysicalId,
    KindId,
    PhysicalKindDefinition,
    TangibleObject,
} from "../core/physical";
import type { Template } from "../types/Template";
import type { TrackAssignment } from "../types/TrackAssignment";

type ContactLife = {
    readonly id: number;
    readonly firstSeen: number;
};

const EMPTY_POINTS: readonly ContactPoint[] = Object.freeze([]);

/* Runs the new physical model from exactly the detections and contacts the
   legacy tracker saw. It owns no browser state: the render loop supplies one
   frame, and the bridge advances every known physical once.

   The legacy tracker also supplies its detection-to-track assignments. That
   choice is deliberate. Re-matching by proximity here would create a second
   opinion about legacy identity, making an identity disagreement impossible
   to attribute to either pipeline. */
export class TrackBridge {
    readonly kinds = new KindRegistry();
    readonly physicals = new PhysicalRegistry();
    readonly #factory: BaseFactory;
    readonly #presencePolicy: PresencePolicy;
    readonly #identity: IdentityMap;
    readonly #contacts = new Map<string, ContactLife>();
    readonly #trackToPhysical = new Map<string, PhysicalId>();
    readonly #status = new ContactStatusTracker();
    /* When each kind was last learned, so a re-measured puck is
       converted again instead of served from the cache. */
    readonly #learned = new Map<KindId, string | number | null>();
    #frame: ContactFrame = Object.freeze({
        at: 0,
        points: EMPTY_POINTS,
        ended: EMPTY_POINTS,
    });
    #nextContactId = 0;
    #nextPhysicalId = 0;

    constructor(
        seedPxPerMM: number,
        policies: BasePolicies = defaultPolicies(),
        presencePolicy: PresencePolicy = new PresencePolicy(),
        maxReturnPX: number = MAX_RETURN_PX,
    ) {
        const estimator = new PxPerMMEstimator(
            seedPxPerMM,
            new PxPerMMPolicy(),
        );
        this.#factory = new BaseFactory(estimator, policies);
        this.#presencePolicy = presencePolicy;
        this.#identity = new IdentityMap(this.physicals, maxReturnPX);
    }

    update(
        at: number,
        contacts: readonly TrackBridgeContact[],
        assignments: readonly TrackAssignment[],
    ): void {
        const pointsByInput = this.#readFrame(at, contacts);
        const updated = new Set<PhysicalId>();

        for (const assignment of assignments) {
            if (!assignment.visible) continue;
            const detection = assignment.detection;
            const kind = this.#kindFor(detection.tpl);
            const selected = this.#select(
                detection.contactIndices,
                pointsByInput,
            );
            const simulated = detection.contactIndices.every((index) => {
                const contact = contacts[index];
                return contact !== undefined && contact.simulated;
            });
            const physical = this.#physicalFor(
                assignment.trackId,
                kind,
                { x: detection.x, y: detection.y },
                simulated,
                updated,
            );
            physical.update(at, { at, points: selected });
            updated.add(physical.id);
        }

        const missing = { at, points: EMPTY_POINTS };
        for (const physical of this.all()) {
            if (!updated.has(physical.id)) physical.update(at, missing);
        }
        this.physicals.sweep();
        this.#removeDeadLinks();
    }

    get contactFrame(): ContactFrame {
        return this.#frame;
    }

    all(): readonly TangibleObject[] {
        return this.physicals.all().filter(isTangible);
    }

    physicalForTrack(trackId: string): TangibleObject | null {
        const id = this.#trackToPhysical.get(trackId);
        if (id === undefined) return null;
        const physical = this.physicals.get(id);
        return physical !== null && isTangible(physical) ? physical : null;
    }

    trackIds(): readonly string[] {
        return [...this.#trackToPhysical.keys()];
    }

    #readFrame(
        at: number,
        contacts: readonly TrackBridgeContact[],
    ): readonly SensedContact[] {
        const seen = new Set<string>();
        const points = contacts.map((contact) => {
            if (seen.has(contact.sourceId)) {
                throw new Error(
                    `Duplicate bridge contact "${contact.sourceId}".`,
                );
            }
            seen.add(contact.sourceId);
            let life = this.#contacts.get(contact.sourceId);
            if (life === undefined) {
                life = {
                    id: this.#nextContactId,
                    firstSeen: at,
                };
                this.#nextContactId += 1;
                this.#contacts.set(contact.sourceId, life);
            }
            return Object.freeze({
                id: life.id,
                x: contact.x,
                y: contact.y,
                radiusPX: contact.radiusPX,
                firstSeen: life.firstSeen,
                lastSeen: at,
            });
        });
        for (const sourceId of this.#contacts.keys()) {
            if (!seen.has(sourceId)) this.#contacts.delete(sourceId);
        }
        /* Statuses are derived by the tracker rather than assembled
           here, so the bridge's frames say the same thing about a
           landing or lifting touch as any other source's would. */
        this.#frame = this.#status.apply(at, points);
        return points;
    }

    #select(
        indices: readonly number[],
        points: readonly SensedContact[],
    ): readonly SensedContact[] {
        const selected: SensedContact[] = [];
        for (const index of indices) {
            const point = points[index];
            if (point === undefined) {
                throw new Error(
                    `Detection contact index ${index} is outside its frame.`,
                );
            }
            selected.push(point);
        }
        return Object.freeze(selected);
    }

    #kindFor(template: Template): PhysicalKindDefinition {
        const known = this.kinds.get(template.id as KindId);
        /* A template whose shape has been re-measured with "Learn
           puck" is a different kind from the one registered a minute
           ago, and converting it once and caching forever left the
           model reading the puck by the shape it used to have. The
           learn stamp is what says it happened. */
        const stamp = template.learnedAt ?? null;
        if (known !== null && this.#learned.get(known.id) === stamp) {
            return known;
        }
        const made = templateToKind(template);
        if (known === null) this.kinds.register(made);
        else this.kinds.redefine(made);
        this.#learned.set(made.id, stamp);
        return made;
    }

    #physicalFor(
        trackId: string,
        kind: PhysicalKindDefinition,
        centre: { readonly x: number; readonly y: number },
        simulated: boolean,
        updated: ReadonlySet<PhysicalId>,
    ): TangibleObject {
        const current = this.physicalForTrack(trackId);
        /* The same kind *object*, not merely the same id. A puck whose
           shape has just been re-measured is being read differently, so
           the base built for the old shape has to go. */
        if (current !== null && current.kind === kind) return current;

        const returning = this.#identity.resolve(kind.id, centre);
        const physical =
            returning !== null &&
            isTangible(returning) &&
            /* Same kind *object*, not merely the same id. Identity
               recovery hands back the very physical whose kind has
               just been re-measured, and reusing it kept the base
               built from the old footprint — which quietly undid the
               relearn a few lines above. */
            returning.kind === kind &&
            !updated.has(returning.id)
                ? returning
                : this.#create(kind, simulated);
        for (const [knownTrackId, id] of this.#trackToPhysical) {
            if (id === physical.id) this.#trackToPhysical.delete(knownTrackId);
        }
        this.#trackToPhysical.set(trackId, physical.id);
        return physical;
    }

    #create(kind: PhysicalKindDefinition, simulated: boolean): TangibleObject {
        this.#nextPhysicalId += 1;
        const id = `physical-${this.#nextPhysicalId}` as PhysicalId;
        const presence = new Presence(this.#presencePolicy);
        /* A template becomes exactly one signature, so the choice the
           old pipeline never had to make does not arise here. When a
           kind grows a second one, the recogniser that picked it is
           what has to say which — not this. */
        const signature = kind.signatures[0];
        const base = this.#factory.create(signature);
        const physical = simulated
            ? new SimulatedPuck(id, kind, signature, presence, base)
            : affordanceOf(kind, Nestable) !== null
              ? new DuoInsert(id, kind, signature, presence, base)
              : affordanceOf(kind, Nesting) !== null
                ? new DuoHost(id, kind, signature, presence, base)
                : affordanceOf(kind, Apertured) !== null
                  ? new OpenPuck(id, kind, signature, presence, base)
                  : new FilledPuck(id, kind, signature, presence, base);
        this.physicals.add(physical);
        return physical;
    }

    #removeDeadLinks(): void {
        for (const [trackId, id] of this.#trackToPhysical) {
            if (this.physicals.get(id) === null) {
                this.#trackToPhysical.delete(trackId);
            }
        }
    }
}

function defaultPolicies(): BasePolicies {
    return {
        position: new PositionPolicy(),
        completion: new FootprintCompletionPolicy(),
        direction: new DirectionPolicy(),
        move: new MovePolicy(),
        rotate: new RotatePolicy(),
        motionHistory: new MotionHistoryPolicy(),
        acceleration: new AccelerationPolicy(),
    };
}
