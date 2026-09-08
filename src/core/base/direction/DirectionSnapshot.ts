import type { Vec2 } from "../Vec2";

/* Which way the object is pointing.
 *
 * `known` is this frame's answer; `headingDeg` is the last good one.
 * They differ while a foot has dropped out, and keeping both is what
 * lets `Rotate` measure against the last *accepted* direction instead
 * of against a gap. A puck that loses a foot mid-turn should not read
 * as having spun.
 *
 * `reference` is the contact the heading was taken from — the apex of
 * a three-foot puck, the middle of the widest gap on a ring. Kept
 * because the dev overlay in phase 6 has to be able to draw it: "the
 * table thinks the nose is here" is the fastest way to see a heading
 * source picking the wrong foot.
 */
export type DirectionSnapshot = {
    readonly known: boolean;
    readonly headingDeg: number;
    readonly unit: Vec2;
    readonly reference: Vec2 | null;
};
