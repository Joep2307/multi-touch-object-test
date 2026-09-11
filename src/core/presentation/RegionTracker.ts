import { regionContains } from "./regionContains";
import type { PhysicalId } from "../physical/PhysicalId";
import type { PhysicalInstance } from "../physical/PhysicalInstance";
import type { RegionCrossing } from "./RegionCrossing";
import type { RegionDefinition } from "./RegionDefinition";
import type { RegionId } from "./RegionId";
import type { RegionPolicy } from "./RegionPolicy";

/* What one frame's worth of looking at the regions produced. */
export type RegionUpdate = {
    readonly membership: ReadonlyMap<string, readonly RegionId[]>;
    readonly entered: readonly RegionCrossing[];
    readonly exited: readonly RegionCrossing[];
};

const NONE: RegionUpdate = Object.freeze({
    membership: new Map<string, readonly RegionId[]>(),
    entered: Object.freeze([]),
    exited: Object.freeze([]),
});

/* Which objects are standing in which parts of the table.
 *
 * The source of `physical.enteredRegion` and `physical.exitedRegion`,
 * which is what the behaviour layer reacts to. Crossings are reported
 * for every object, including one of a kind the region does not
 * accept: a region cannot keep anything out, so the useful thing is to
 * say what arrived and whether it was welcome.
 *
 * Hysteresis, like everywhere else two states are separated by a
 * threshold. Entering needs the object a little inside the edge and
 * leaving needs it a little outside, so a puck put down half on the
 * line stays where it was put rather than crossing in and out for as
 * long as it lies there.
 */
export class RegionTracker {
    #inside = new Map<string, Set<RegionId>>();
    /* Whether each object was welcome where it stood, so that its exit
       can say the same thing its arrival did. */
    #welcome = new Map<string, boolean>();

    constructor(
        private readonly regions: readonly RegionDefinition[],
        private readonly policy: RegionPolicy,
    ) {}

    update(
        instances: readonly PhysicalInstance[],
        pxPerMM: number,
    ): RegionUpdate {
        if (this.regions.length === 0 || pxPerMM <= 0) {
            this.#inside.clear();
            return NONE;
        }
        const membership = new Map<string, readonly RegionId[]>();
        const entered: RegionCrossing[] = [];
        const exited: RegionCrossing[] = [];
        const next = new Map<string, Set<RegionId>>();

        for (const instance of instances) {
            const position = instance.pose?.position;
            /* Anything the table still believes is here, measured
               this frame or not. A puck that loses a foot for three
               frames has not left the voting area, and saying it had
               would fire every watching rule twice. */
            if (instance.status === "removed" || position == null) continue;
            /* Pixels to millimetres, once, at the edge — so a
               programme file is screen-independent. */
            const pointMM = {
                x: position.x / pxPerMM,
                y: position.y / pxPerMM,
            };
            const was = this.#inside.get(instance.id) ?? new Set<RegionId>();
            const now = new Set<RegionId>();

            for (const region of this.regions) {
                const inBefore = was.has(region.id);
                /* Harder to get in than to stay in. */
                const margin = inBefore
                    ? this.policy.hysteresisMM
                    : -this.policy.hysteresisMM;
                if (!regionContains(region.shape, pointMM, margin)) {
                    if (inBefore) {
                        exited.push(this.#crossing(instance, region));
                    }
                    continue;
                }
                now.add(region.id);
                const crossing = this.#crossing(instance, region);
                this.#welcome.set(
                    `${instance.id}|${region.id}`,
                    crossing.accepted,
                );
                if (!inBefore) entered.push(crossing);
            }
            next.set(instance.id, now);
            membership.set(instance.id, [...now]);
        }

        /* An object the table can no longer see has left everything it
           was in. Silence would leave a rule waiting for an exit that
           never comes. */
        for (const [id, was] of this.#inside) {
            if (next.has(id)) continue;
            for (const regionId of was) {
                const region = this.regions.find((r) => r.id === regionId);
                if (region === undefined) continue;
                exited.push({
                    physicalId: id as PhysicalId,
                    regionId,
                    /* As it was on the way in. Hard-coding this true
                       made the log say the same object was unwelcome
                       when it arrived and welcome when it left. */
                    accepted: this.#welcome.get(`${id}|${regionId}`) ?? true,
                });
            }
        }

        this.#inside = next;
        for (const crossing of exited) {
            this.#welcome.delete(
                `${crossing.physicalId}|${crossing.regionId}`,
            );
        }
        return { membership, entered, exited };
    }

    #crossing(
        instance: PhysicalInstance,
        region: RegionDefinition,
    ): RegionCrossing {
        const kinds = region.acceptedPhysicalKinds;
        const roles = region.acceptedRoles;
        const kindOk = kinds === undefined || kinds.includes(instance.kindId);
        const roleOk =
            roles === undefined ||
            (instance.roleId !== null && roles.includes(instance.roleId));
        return {
            physicalId: instance.id,
            regionId: region.id,
            accepted: kindOk && roleOk,
        };
    }

    reset(): void {
        this.#inside.clear();
        this.#welcome.clear();
    }
}
