/* Holding a triangle puck on two feet.
 *
 * Three feet are present on only 57 to 64 per cent of frames in every one
 * of the seven recordings made at the table on 9 September 2026. A dropout
 * is not an edge case; it is a third of every session, and until now a
 * triangle puck simply went unseen on all of them — there is no triple, so
 * there is no detection.
 *
 * The rule: whatever started with three feet stays that puck while two of
 * those feet are still recognisably there. Not two feet of anything — two
 * feet whose contact ids the table has been watching since the last whole
 * frame, still the same distance apart. Then those two say how the puck
 * moved and turned, and where the third foot must be.
 */
import { padsFor, recognise } from "../../puck/geometry";
import { track } from "../../puck";
import { templates, tracks, view } from "../../state";
import { afterEach, beforeEach, describe as suite, expect, it } from "vitest";
import type { Point, Template, TouchPoint } from "../../types";

const TPL: Template = {
    id: "puck-tri",
    verdict: "good",
    ratios: [0.62, 0.81],
    longestMM: 60,
};

const PX_PER_MM = 4;
const FRAME_MS = 16;
const CENTRE = { x: 400, y: 300 };

/* The puck's three feet, placed and turned, with the contact ids the glass
   would have given them. */
const feet = (cx = CENTRE.x, cy = CENTRE.y, rot = 0): TouchPoint[] =>
    padsFor(TPL, PX_PER_MM).map((p: Point, i: number) => ({
        id: i,
        x: cx + p.x * Math.cos(rot) - p.y * Math.sin(rot),
        y: cy + p.x * Math.sin(rot) + p.y * Math.cos(rot),
    }));

const saved = {
    list: templates.list,
    own: templates.own,
    pxPerMM: view.pxPerMM,
};

/* Two whole frames, which is `CFG.stableFrames`: the puck has to have been
   seen complete before it can be held on anything. */
const settle = (): number => {
    let at = 0;
    for (let i = 0; i < 2; i += 1) {
        track(recognise(feet()).pucks, at);
        at += FRAME_MS;
    }
    return at;
};

beforeEach(() => {
    templates.list = [TPL];
    templates.own = [];
    view.pxPerMM = PX_PER_MM;
    tracks.map.clear();
    tracks.memory.length = 0;
    tracks.seq = 0;
});

afterEach(() => {
    templates.list = saved.list;
    templates.own = saved.own;
    view.pxPerMM = saved.pxPerMM;
    tracks.map.clear();
    tracks.memory.length = 0;
    tracks.seq = 0;
});

suite("recognise, holding a triangle on two feet", () => {
    it("finds the whole puck first", () => {
        const found = recognise(feet()).pucks;
        expect(found).toHaveLength(1);
        expect(found[0]?.held).toBeUndefined();
        expect(found[0]?.x).toBeCloseTo(CENTRE.x, 6);
    });

    it("holds the puck when one foot goes missing", () => {
        settle();
        const two = feet().slice(0, 2);
        const found = recognise(two).pucks;
        expect(found).toHaveLength(1);
        expect(found[0]?.held).toBe(true);
        expect(found[0]?.tpl.id).toBe(TPL.id);
        /* The same centre as the whole puck, because the third foot was
           put back exactly where the puck took it. */
        expect(found[0]?.x).toBeCloseTo(CENTRE.x, 6);
        expect(found[0]?.y).toBeCloseTo(CENTRE.y, 6);
    });

    it("reads the move and the turn from the two feet that are left", () => {
        settle();
        const rot = 0.25;
        const moved = feet(CENTRE.x + 30, CENTRE.y - 20, rot);
        const whole = recognise(moved).pucks[0];
        const held = recognise(moved.slice(0, 2)).pucks[0];
        expect(held?.held).toBe(true);
        expect(held?.x).toBeCloseTo(whole?.x ?? NaN, 6);
        expect(held?.y).toBeCloseTo(whole?.y ?? NaN, 6);
        expect(held?.angle).toBeCloseTo(whole?.angle ?? NaN, 6);
    });

    it("hands the new pipeline the real feet only", () => {
        settle();
        const found = recognise(feet().slice(0, 2)).pucks[0];
        /* Two indices, not three: the bridge feeds those two to the new
           model, which reconstructs the third itself. Two independent
           reconstructions that have to agree are worth more than one
           answer copied across. */
        expect(found?.contactIndices).toHaveLength(2);
        expect(found?.feet.map((f) => f.id)).toEqual([0, 1]);
    });

    it("refuses two unrelated touches near a puck that was lifted", () => {
        settle();
        /* The right contact ids, at the wrong distance apart: a hand, not
           a rigid puck. */
        const two = feet().slice(0, 2);
        const second = two[1];
        if (second === undefined) throw new Error("no second foot");
        second.x += 40;
        expect(recognise(two).pucks).toHaveLength(0);
    });

    it("refuses two touches that are not this puck's feet", () => {
        settle();
        /* The right places, new contact ids. A foot that came back has a
           new id and is a different foot; matching by nearest would let
           any two fingers revive any puck. */
        const two = feet()
            .slice(0, 2)
            .map((p, i) => ({ ...p, id: 90 + i }));
        expect(recognise(two).pucks).toHaveLength(0);
    });

    it("never opens a puck on two feet", () => {
        /* Nothing has ever been seen whole, so there is no footprint to
           hold on to. Two fingers are two fingers. */
        expect(recognise(feet().slice(0, 2)).pucks).toHaveLength(0);
    });

    it("keeps the puck recognised, and its feet, across the dropout", () => {
        let at = settle();
        const before = [...tracks.map.values()][0]?.feet.map((f) => f.id);
        const two = feet().slice(0, 2);
        track(recognise(two).pucks, at);
        at += FRAME_MS;
        const puck = [...tracks.map.values()][0];
        expect(tracks.map.size).toBe(1);
        expect(puck?.state).toBe("recognised");
        expect(puck?.held).toBe(true);
        /* And the reference is untouched, so the next hold is still
           measured against the last whole frame rather than against this
           reconstruction. */
        expect(puck?.feet.map((f) => f.id)).toEqual(before);
    });

    it("takes the ordinary path back the moment the foot returns", () => {
        let at = settle();
        track(recognise(feet().slice(0, 2)).pucks, at);
        at += FRAME_MS;
        track(recognise(feet()).pucks, at);
        const puck = [...tracks.map.values()][0];
        expect(puck?.held).toBe(false);
        expect(puck?.state).toBe("recognised");
    });
});
