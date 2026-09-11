import { ContactEventSource } from "../events/ContactEventSource";
import { PhysicalEventSource } from "../events/PhysicalEventSource";
import { RegionTracker } from "../presentation/RegionTracker";
import { RuleEngine } from "../behaviour/RuleEngine";
import { SpatialIndex } from "../relation/SpatialIndex";
import { StateMachineRunner } from "../behaviour/StateMachineRunner";
import { buildRenderPlan } from "../presentation/buildRenderPlan";
import { isTangible } from "../physical/isTangible";
import { physicalInstanceOf } from "../physical/physicalInstanceOf";
import type { ContactEventPolicy } from "../events/ContactEventPolicy";
import type { ContactFrame } from "../contact/ContactFrame";
import type { ConditionRegistry } from "../behaviour/ConditionRegistry";
import type { EffectRegistry } from "../behaviour/EffectRegistry";
import type { EventBus } from "../events/EventBus";
import type { InteractionEvent } from "../events/InteractionEvent";
import type { PhysicalEventPolicy } from "../events/PhysicalEventPolicy";
import type { PhysicalId } from "../physical/PhysicalId";
import type { PhysicalRegistry } from "../physical/PhysicalRegistry";
import type { ProgrammeDefinition } from "../programme/ProgrammeDefinition";
import type { RegionPolicy } from "../presentation/RegionPolicy";
import type { RenderPlan } from "../presentation/RenderPlan";
import type { RuleTrace } from "../behaviour/RuleTrace";
import type { Session } from "../session/Session";
import type { SpatialRelationPolicy } from "../relation/SpatialRelationPolicy";
import type { ActionId } from "../behaviour/ActionId";
import type { StateMachineId } from "../behaviour/StateMachineId";
import type { TransitionId } from "../behaviour/TransitionId";
import type { TablePresentation } from "../presentation/TablePresentation";

/* The loop in section 00 of the model, as one object.
 *
 * The table sees contact points, not objects. A signature groups those
 * points into something recognisable, that object gets a stable id,
 * its movements become events, events test rules, and rules change
 * state and image. Then a participant looks at the table and moves
 * something again.
 *
 * Everything in this class is wiring. Not one line of it decides
 * anything: the order the pieces run in is the only judgement here,
 * and every judgement it looks like it is making belongs to a
 * definition in the programme.
 *
 * **What it does not do is recognise.** Grouping contacts into objects
 * is the one thing the core has never owned — the existing recogniser
 * does it, and this plan promised not to build a second one. The
 * registry is filled by whoever knows how; `frame` takes it as it
 * finds it.
 */
export class Runtime {
    readonly #contacts: ContactEventSource;
    readonly #physicals: PhysicalEventSource;
    readonly #spatial: SpatialIndex;
    readonly #regions = new Map<string, RegionTracker>();
    readonly #engine: RuleEngine;
    readonly #machines = new Map<StateMachineId, StateMachineRunner>();
    readonly #entered = new Set<PhysicalId>();
    #plan: RenderPlan | null = null;

    constructor(
        private readonly programme: ProgrammeDefinition,
        private readonly session: Session,
        private readonly bus: EventBus,
        private readonly registry: PhysicalRegistry,
        trace: RuleTrace,
        conditions: ConditionRegistry,
        effects: EffectRegistry,
        policies: {
            readonly contact: ContactEventPolicy;
            readonly physical: PhysicalEventPolicy;
            readonly relation: SpatialRelationPolicy;
            readonly region: RegionPolicy;
        },
    ) {
        this.#contacts = new ContactEventSource(policies.contact);
        this.#physicals = new PhysicalEventSource(
            programme.gestures,
            policies.physical,
        );
        this.#spatial = new SpatialIndex(policies.relation);
        /* One tracker per table presentation, not one for the table.
           Which areas mean something changes with the mode — the
           voting area exists in Voting and nowhere else — and a single
           tracker built from the first presentation would have every
           mode watching the wrong edges. Each keeps its own
           membership, so leaving Voting and coming back is a fresh
           arrival rather than a silent continuation. */
        for (const presentation of programme.tablePresentations) {
            this.#regions.set(
                presentation.id,
                new RegionTracker(presentation.regions, policies.region),
            );
        }
        this.#engine = new RuleEngine(
            programme.actions,
            conditions,
            effects,
            trace,
        );
        for (const machine of programme.stateMachines) {
            this.#machines.set(
                machine.id,
                new StateMachineRunner(machine, conditions, effects, trace),
            );
        }

        /* One subscriber, doing three things in a fixed order: the
           rules, then the machines, then the log. The log last because
           it records what consumed the event, and it cannot know that
           before they have run. */
        this.bus.subscribe((event) => {
            this.#dispatch(event);
        });

        /* A departure is not a lift. The registry only announces
           `left` when an object is forgotten for good, which is
           exactly when a part should expire. */
        this.registry.subscribe((registryEvent) => {
            if (registryEvent.type !== "left") return;
            this.session.roles.departed(
                registryEvent.physical.id,
                this.session.at,
            );
            this.#physicals.forget(registryEvent.physical.id);
            this.#entered.delete(registryEvent.physical.id);
        });
    }

    get renderPlan(): RenderPlan | null {
        return this.#plan;
    }

    start(): void {
        this.session.changeMode(this.programme.initialModeId);
    }

    /* One frame. The order is the loop, and it is the whole of what
       this class decides.
     *
     * Contacts become events before objects do, because a finger that
     * is not part of any object still happened. Relations and regions
     * are measured before any rule runs, so a condition asking how far
     * apart two things are is answered from this frame rather than the
     * last one. The render plan is built last, from a table that has
     * finished changing. */
    frame(
        at: number,
        contacts: ContactFrame,
        pxPerMM: number,
    ): RenderPlan | null {
        this.session.beginFrame(at);
        this.#contacts.update(contacts, this.bus);

        const instances = this.session.instances();
        const spatial = this.#spatial.update(instances, pxPerMM);
        const table = this.#table();
        /* Every tracker but the active one is emptied. Which areas
           mean something changes with the mode, and a dormant tracker
           that kept its membership would say nothing at all when its
           mode came back — the objects standing in the voting area
           would already be "inside" it, so nobody would ever arrive. */
        for (const [id, other] of this.#regions) {
            if (id !== table?.id) other.reset();
        }
        const tracker = this.#regions.get(table?.id ?? "");
        const regions = tracker?.update(instances, pxPerMM) ?? {
            membership: new Map<string, readonly string[]>(),
            entered: [],
            exited: [],
        };
        this.session.observe(spatial.relations, regions.membership);

        for (const relation of spatial.entered) {
            this.bus.publish({
                type: "physical.nearPhysical",
                sourceId: relation.sourceId,
                targetId: relation.targetId,
                timestamp: at,
                payload: {
                    distancePX: relation.distancePX,
                    relation: relation.relation,
                },
                properties: {},
            });
        }
        for (const crossing of regions.entered) {
            this.#region("physical.enteredRegion", crossing, at);
        }
        for (const crossing of regions.exited) {
            this.#region("physical.exitedRegion", crossing, at);
        }

        for (const physical of this.registry.all()) {
            const instance = physicalInstanceOf(physical, at);
            const snapshot = isTangible(physical)
                ? physical.base.snapshot(at)
                : null;
            this.#physicals.update(
                instance,
                snapshot,
                physical.presence.state,
                at,
                this.bus,
            );
        }

        this.#plan = this.#draw();
        return this.#plan;
    }

    /* Take everything the effects asked the outside world to do. The
       core plays no sounds and draws nothing; whoever called `frame`
       is what actually does either. */
    drainOutbox(): ReturnType<Session["drainOutbox"]> {
        return this.session.drainOutbox();
    }

    #dispatch(event: InteractionEvent): void {
        /* The mode the event arose *in*, taken before anything runs.
           An event whose own effect changes the mode was otherwise
           filed under the mode it caused — so the menu choice that
           ended a round was recorded as having happened in the round
           that followed it, which is the one entry an account of the
           afternoon most needs to be right. */
        const modeId = this.session.activeModeId;
        if (event.type === "physical.detected") {
            this.#offerRole(event.sourceId);
            this.#enterMachine(event.sourceId);
        }
        /* A mode that enables a role has to let the objects already
           lying on the glass take it. Without this, a puck put down
           during Setup would hold no part for the rest of the
           afternoon, because roles were only ever offered on arrival —
           and the whole point of a mode is that the same objects
           behave differently in it. */
        if (event.type === "mode.changed") {
            for (const physical of this.registry.all()) {
                this.#offerRole(physical.id);
            }
        }
        /* What consumed the event, taken from the engine and the
           runners rather than read off the trace. The trace drops its
           oldest entries after a couple of hundred, so inferring this
           from it worked for the first minute of a session and
           silently recorded nothing after that. */
        const consumed: (ActionId | TransitionId)[] = [
            ...this.#engine.handle(event, this.session),
        ];
        for (const runner of this.#machines.values()) {
            const moved = runner.handle(event, this.session);
            if (moved !== null) consumed.push(moved);
        }
        this.session.log.append(event, modeId, consumed);
    }

    /* Offer an object the part its kind is for, if the active mode
       lets that part be played and the object is allowed to play it.
       The kind's default is all the core is entitled to decide; a rule
       can change it afterwards. */
    #offerRole(id: string | null): void {
        if (id === null) return;
        const physical = this.registry.get(id as PhysicalId);
        if (physical === null) return;
        /* From the frame's cache when there is one, and straight from
           the object when there is not. The very first mode change
           happens before any frame has run, and a table with pucks
           already on it would otherwise open its session with none of
           them holding a part. */
        const instance =
            this.session.instance(id) ??
            physicalInstanceOf(physical, this.session.at);
        if (instance.roleId !== null) return;
        const roleId = physical.kind.defaultRoleId;
        if (roleId === undefined) return;
        const mode = this.session.activeMode;
        if (mode !== null && !mode.enabledRoleIds.includes(roleId)) return;
        const role = this.programme.roles.find((r) => r.id === roleId);
        if (role === undefined) return;
        if (!this.session.roles.eligible(instance, role)) return;
        /* Through the session, so the ledger and every object's
           `roleId` are reconciled together — including whoever this
           grant may have displaced. */
        this.session.assignRole(physical.id, roleId);
    }

    /* Put a newly seen object into the machine its kind runs, once.
       Re-entering would run the initial state's entry effects again
       every time the object was noticed. */
    #enterMachine(id: string | null): void {
        if (id === null) return;
        const physical = this.registry.get(id as PhysicalId);
        if (physical === null) return;
        if (this.#entered.has(physical.id)) return;
        this.#entered.add(physical.id);
        const machineId = physical.kind.stateMachineId;
        if (machineId === undefined) return;
        this.#machines.get(machineId)?.enter(physical.id, this.session);
    }

    #region(
        type: "physical.enteredRegion" | "physical.exitedRegion",
        crossing: {
            physicalId: PhysicalId;
            regionId: string;
            accepted: boolean;
        },
        at: number,
    ): void {
        this.bus.publish({
            type,
            sourceId: crossing.physicalId,
            targetId: crossing.regionId,
            timestamp: at,
            /* Reported either way, marked. A region cannot keep
               anything out, so the useful thing is to say what arrived
               and whether it was welcome. */
            payload: {
                regionId: crossing.regionId,
                accepted: crossing.accepted,
            },
            properties: {},
        });
    }

    /* The table presentation the active mode asks for, falling back to
       the first the programme defines. A mode that names none still
       has to show something. */
    #table(): TablePresentation | undefined {
        const wanted = this.session.activeMode?.tablePresentationId;
        return (
            this.programme.tablePresentations.find((t) => t.id === wanted) ??
            this.programme.tablePresentations[0]
        );
    }

    #draw(): RenderPlan | null {
        const table = this.#table();
        if (table === undefined) return null;
        return buildRenderPlan(
            table,
            this.programme.presentations,
            this.session.instances(),
            this.session,
        );
    }
}
