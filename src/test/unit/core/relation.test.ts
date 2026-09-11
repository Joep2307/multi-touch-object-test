/* How objects stand to each other.
 *
 * The hysteresis tests are the point of this file. A single distance
 * threshold has no stable answer at exactly the threshold, and two
 * pucks left sitting on one would cross it on sensor noise alone —
 * which on this table means a rule firing sixty times a second for as
 * long as they lie there.
 */
import { describe, expect, it } from "vitest";
import { SpatialIndex, SpatialRelationPolicy } from "../../../core/relation";
import type {
    KindId,
    PhysicalId,
    PhysicalInstance,
} from "../../../core/physical";

const PX_PER_MM = 4;

const puck = (
    id: string,
    x: number,
    sizePX = 320,
    over: Partial<PhysicalInstance> = {},
): PhysicalInstance => ({
    id: id as PhysicalId,
    kindId: "triad-a" as KindId,
    signatureId: null,
    roleId: null,
    pose: {
        position: { x, y: 300 },
        directionDeg: 0,
        directionKnown: true,
        held: false,
        sizePX,
    },
    motion: null,
    currentStateId: null,
    properties: {},
    firstSeenAt: 0,
    lastSeenAt: 0,
    status: "detected",
    ...over,
});

const index = (): SpatialIndex =>
    new SpatialIndex(new SpatialRelationPolicy());

const between = (
    idx: SpatialIndex,
    a: PhysicalInstance,
    b: PhysicalInstance,
): { relation: string; entered: number } => {
    const update = idx.update([a, b], PX_PER_MM);
    const found = update.relations.find(
        (r) => r.sourceId === a.id && r.targetId === b.id,
    );
    return {
        relation: found?.relation ?? "none",
        entered: update.entered.length,
    };
};

describe("SpatialIndex", () => {
    it("says nothing when there is nothing to compare", () => {
        const update = index().update([puck("a", 0)], PX_PER_MM);
        expect(update.relations).toHaveLength(0);
        expect(update.entered).toHaveLength(0);
    });

    it("reports both directions, because they are different facts", () => {
        /* A small disc inside a large one is not the same as the large
           one inside the small. */
        const update = index().update(
            [puck("a", 400, 400), puck("b", 400, 80)],
            PX_PER_MM,
        );
        expect(update.relations).toHaveLength(2);
        const forward = update.relations.find((r) => r.sourceId === "a");
        const back = update.relations.find((r) => r.sourceId === "b");
        expect(forward?.relation).toBe("inside");
        expect(back?.relation).not.toBe("inside");
    });

    it("calls a small disc on a large one inside it", () => {
        const idx = index();
        expect(
            between(idx, puck("a", 400, 400), puck("b", 430, 60)).relation,
        ).toBe("inside");
    });

    it("calls two rims that meet touching", () => {
        /* Two 80 mm pucks at 4 px/mm have 160 px radii, so their rims
           meet at 320 px apart. */
        const idx = index();
        expect(between(idx, puck("a", 0), puck("b", 320)).relation).toBe(
            "touching",
        );
    });

    it("calls crossing circles overlapping", () => {
        const idx = index();
        expect(between(idx, puck("a", 0), puck("b", 250)).relation).toBe(
            "overlapping",
        );
    });

    it("crosses into near exactly once, with jitter on the threshold", () => {
        /* Near is 60 mm of clear distance between centres, which at
           four pixels to the millimetre is 240 px — but the pucks are
           320 px across, so anything that close is already touching.
           Held apart at the near/far band instead. */
        const idx = new SpatialIndex(new SpatialRelationPolicy(200, 260, 2));
        const a = puck("a", 0, 40);
        const jitterAtThreshold = [
            795, 805, 798, 802, 799, 801, 800, 803, 797,
        ];
        let crossings = 0;
        /* Well outside first, so the pair starts far. */
        crossings += idx.update([a, puck("b", 2000, 40)], PX_PER_MM).entered
            .length;
        for (const x of jitterAtThreshold) {
            crossings += idx.update([a, puck("b", x, 40)], PX_PER_MM).entered
                .length;
        }
        expect(crossings).toBe(1);
    });

    it("needs the wider distance to stop being near", () => {
        const idx = new SpatialIndex(new SpatialRelationPolicy(50, 100, 2));
        const a = puck("a", 0, 40);
        /* Far to begin with. */
        expect(between(idx, a, puck("b", 1000, 40)).relation).toBe("far");
        /* Inside the near distance: 50 mm at 4 px/mm is 200 px. */
        expect(between(idx, a, puck("b", 190, 40)).relation).toBe("near");
        /* Past near but not past far: still near. */
        expect(between(idx, a, puck("b", 300, 40)).relation).toBe("near");
        /* Past far: no longer near. */
        expect(between(idx, a, puck("b", 500, 40)).relation).toBe("far");
    });

    it("refuses a policy where leaving is easier than arriving", () => {
        expect(() => new SpatialRelationPolicy(80, 60, 2)).toThrow(/flickers/);
    });

    it("names one target nearest, out of several", () => {
        const update = index().update(
            [puck("a", 0, 40), puck("b", 500, 40), puck("c", 900, 40)],
            PX_PER_MM,
        );
        const fromA = update.relations.filter((r) => r.sourceId === "a");
        expect(fromA.filter((r) => r.nearest).map((r) => r.targetId)).toEqual([
            "b",
        ]);
    });

    it("keeps a briefly unmeasured object in the reckoning", () => {
        /* A puck that loses a foot for three frames has not moved away
           from its neighbour, and dropping it would announce that the
           pair had separated and met again — twice, for every rule
           watching. */
        const update = index().update(
            [puck("a", 0), puck("b", 100, 320, { status: "missing" })],
            PX_PER_MM,
        );
        expect(update.relations).toHaveLength(2);
    });

    it("drops an object the table has forgotten entirely", () => {
        /* The point at which a remembered position stops being an
           observation and starts being an invention. */
        const update = index().update(
            [puck("a", 0), puck("b", 100, 320, { status: "removed" })],
            PX_PER_MM,
        );
        expect(update.relations).toHaveLength(0);
    });

    it("forgets a pair once one of them has gone", () => {
        const idx = new SpatialIndex(new SpatialRelationPolicy(50, 100, 2));
        const a = puck("a", 0, 40);
        idx.update([a, puck("b", 1000, 40)], PX_PER_MM);
        idx.update([a, puck("b", 190, 40)], PX_PER_MM);
        /* b leaves the table, then comes back where it was. It has to
           read as a fresh crossing rather than inheriting the state of
           a pair that no longer existed. */
        idx.update([a], PX_PER_MM);
        const back = idx.update([a, puck("b", 190, 40)], PX_PER_MM);
        expect(back.entered).toHaveLength(1);
    });

    it("gives the direction from the source to the target", () => {
        const update = index().update(
            [puck("a", 0, 40), puck("b", 500, 40)],
            PX_PER_MM,
        );
        const forward = update.relations.find((r) => r.sourceId === "a");
        const back = update.relations.find((r) => r.sourceId === "b");
        expect(forward?.relativeDirectionDeg).toBeCloseTo(0, 6);
        expect(back?.relativeDirectionDeg).toBeCloseTo(180, 6);
    });
});
