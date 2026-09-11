import { FULL_TURN_DEG } from "../base/direction/constants";
import type { PhysicalId } from "../physical/PhysicalId";
import type { PhysicalInstance } from "../physical/PhysicalInstance";
import type { RelationKind } from "./RelationKind";
import type { SpatialRelation } from "./SpatialRelation";
import type { SpatialRelationPolicy } from "./SpatialRelationPolicy";
import type { SpatialUpdate } from "./SpatialUpdate";
import type { Vec2 } from "../base/Vec2";

const NONE: SpatialUpdate = Object.freeze({
    relations: Object.freeze([]),
    entered: Object.freeze([]),
});

/* Every pair of objects on the glass, once a frame.
 *
 * Deliberately every pair, with no spatial partitioning and no
 * cleverness. **This table holds tens of objects, not thousands**, and
 * at that size a quadtree costs more to build each frame than the
 * comparisons it saves. Written down here so that nobody optimises it
 * on principle: if this ever becomes the slow part, the table has
 * changed shape and the fix is a different one.
 *
 * Objects the table still believes are here take part, whether or not
 * they were measured this frame. A puck that loses a foot for three
 * frames has not moved away from its neighbour, and dropping it would
 * announce that the pair had separated and met again — twice, for
 * every rule watching. What is excluded is what has been forgotten
 * entirely, which is the point at which a remembered position stops
 * being an observation and starts being an invention.
 */
export class SpatialIndex {
    readonly #was = new Map<string, RelationKind>();

    constructor(private readonly policy: SpatialRelationPolicy) {}

    update(
        instances: readonly PhysicalInstance[],
        pxPerMM: number,
    ): SpatialUpdate {
        const placed = instances.filter(
            (i) => i.status !== "removed" && i.pose?.position != null,
        );
        if (placed.length < 2) {
            this.#was.clear();
            return NONE;
        }

        const nearPX = this.policy.nearMM * pxPerMM;
        const farPX = this.policy.farMM * pxPerMM;
        const touchPX = this.policy.touchToleranceMM * pxPerMM;
        const relations: SpatialRelation[] = [];
        const entered: SpatialRelation[] = [];
        const announced = new Set<string>();
        const seen = new Set<string>();

        for (const source of placed) {
            const from = source.pose?.position;
            if (from == null) continue;
            let closest: { id: PhysicalId; distance: number } | null = null;
            const mine: {
                target: PhysicalInstance;
                distance: number;
                directionDeg: number;
            }[] = [];

            for (const target of placed) {
                if (target.id === source.id) continue;
                const to = target.pose?.position;
                if (to == null) continue;
                const distance = Math.hypot(to.x - from.x, to.y - from.y);
                mine.push({
                    target,
                    distance,
                    directionDeg: degreesOf({
                        x: to.x - from.x,
                        y: to.y - from.y,
                    }),
                });
                if (closest === null || distance < closest.distance) {
                    closest = { id: target.id, distance };
                }
            }

            for (const { target, distance, directionDeg } of mine) {
                const key = `${source.id}->${target.id}`;
                seen.add(key);
                const relation = this.#classify(
                    key,
                    distance,
                    (source.pose?.sizePX ?? 0) / 2,
                    (target.pose?.sizePX ?? 0) / 2,
                    { nearPX, farPX, touchPX },
                );
                const record: SpatialRelation = {
                    sourceId: source.id,
                    targetId: target.id,
                    distancePX: distance,
                    relativeDirectionDeg: directionDeg,
                    relation,
                    nearest: closest?.id === target.id,
                };
                relations.push(record);
                /* One entry per *pair*, not per direction. Being near
                   is symmetric, and `physical.nearPhysical` announced
                   from both sides would fire every rule watching for
                   it twice for one approach. Which direction survives
                   is decided by id order, so it is at least the same
                   one every time; anything that needs the direction
                   reads `relations`, which keeps both. */
                const pair =
                    source.id < target.id
                        ? `${source.id}|${target.id}`
                        : `${target.id}|${source.id}`;
                if (
                    relation !== "far" &&
                    this.#wasFar(key) &&
                    !announced.has(pair) &&
                    /* The direction that survives is chosen by id, not
                       by which object happened to be registered first.
                       Otherwise a rule filtering on source and target
                       fired or did not depending on which puck was put
                       down first, which is not a thing anyone can
                       reason about. */
                    source.id < target.id
                ) {
                    announced.add(pair);
                    entered.push(record);
                }
                this.#was.set(key, relation);
            }
        }

        for (const key of [...this.#was.keys()]) {
            if (!seen.has(key)) this.#was.delete(key);
        }
        return { relations, entered };
    }

    /* The ladder, closest first. Containment beats contact and contact
       beats proximity, because the stronger statement is always the
       more useful one: two pucks that overlap are also near, and
       saying so would tell a rule less than it already knew. */
    #classify(
        key: string,
        distance: number,
        sourceRadius: number,
        targetRadius: number,
        limits: { nearPX: number; farPX: number; touchPX: number },
    ): RelationKind {
        if (
            sourceRadius > 0 &&
            targetRadius > 0 &&
            distance + targetRadius <= sourceRadius
        ) {
            return "inside";
        }
        const rims = sourceRadius + targetRadius;
        if (rims > 0 && Math.abs(distance - rims) <= limits.touchPX) {
            return "touching";
        }
        if (rims > 0 && distance < rims) return "overlapping";
        /* The hysteresis: arriving takes `nearPX`, leaving takes the
           larger `farPX`, so a pair resting on the threshold does not
           flicker for as long as it lies there. */
        const was = this.#was.get(key);
        const limit =
            was === undefined || was === "far" ? limits.nearPX : limits.farPX;
        return distance <= limit ? "near" : "far";
    }

    #wasFar(key: string): boolean {
        const was = this.#was.get(key);
        return was === undefined || was === "far";
    }

    reset(): void {
        this.#was.clear();
    }
}

function degreesOf(v: Vec2): number {
    const deg = (Math.atan2(v.y, v.x) * FULL_TURN_DEG) / (2 * Math.PI);
    return deg < 0 ? deg + FULL_TURN_DEG : deg;
}
