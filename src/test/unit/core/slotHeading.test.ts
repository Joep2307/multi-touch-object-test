/* Reading the orientation of a grid-coded puck.
 *
 * A slot puck has no distinguished foot: its identity *is* the pattern
 * of filled compartments, and bit 0 is the one the arrow points into.
 * So the heading is the rotation at which the measured feet line up
 * with the code this puck is known to carry.
 */
import { describe, expect, it } from "vitest";
import { DirectionPolicy, SlotHeadingSource } from "../../../core/base";
import type { ContactPoint } from "../../../core/contact";

const SLOTS = 12;
const WIDTH = 360 / SLOTS;
const FILLED = [0, 2, 5, 9];
const CODE = FILLED.reduce((mask, slot) => mask | (1 << slot), 0);
const CENTRE = { x: 400, y: 300 };

const at = (degrees: readonly number[]): ContactPoint[] =>
    degrees.map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return {
            id: i,
            x: CENTRE.x + 136 * Math.cos(rad),
            y: CENTRE.y + 136 * Math.sin(rad),
            radiusPX: 9,
            firstSeen: 0,
            lastSeen: 0,
        };
    });

const feetAt = (phase: number, jitterDeg = 0): ContactPoint[] =>
    at(
        FILLED.map(
            (slot, i) => phase + slot * WIDTH + Math.sin(i * 7.3) * jitterDeg,
        ),
    );

const source = (code = CODE): SlotHeadingSource =>
    new SlotHeadingSource(new DirectionPolicy(), SLOTS, code);

describe("SlotHeadingSource", () => {
    it("reads the phase of a clean code", () => {
        for (const phase of [0, 37, 118, 250, 341]) {
            const found = source().heading(feetAt(phase), CENTRE);
            expect(found?.headingDeg).toBeCloseTo(phase, 2);
        }
    });

    it("follows the puck all the way round", () => {
        for (let phase = 0; phase < 360; phase += 13) {
            const found = source().heading(feetAt(phase), CENTRE);
            expect(found?.headingDeg).toBeCloseTo(phase, 2);
        }
    });

    it("survives a foot trembling, as a real one does", () => {
        /* Every foot proposes a rotation, so with jitter the winner is
           surrounded by near-copies of itself. Counting those as rival
           orientations rejected every real reading until the rival had
           to be half a compartment away. */
        const found = source().heading(feetAt(100, 4), CENTRE);
        expect(found).not.toBeNull();
        expect(found?.headingDeg).toBeCloseTo(100, 0);
    });

    it("says nothing about a rotationally symmetric code", () => {
        /* 0b010101010101 repeats every two compartments, so it has
           several equally valid orientations. There is no honest
           answer, and guessing would make the puck flicker between
           them. */
        const symmetric = source(0b010101010101);
        const feet = at([0, 2, 4, 6, 8, 10].map((s) => s * WIDTH));
        expect(symmetric.heading(feet, CENTRE)).toBeNull();
    });

    it("says nothing when the feet are not this code at all", () => {
        expect(source().heading(at([0, 33, 71, 200]), CENTRE)).toBeNull();
    });

    it("says nothing for an empty code or no feet", () => {
        expect(source(0).heading(feetAt(0), CENTRE)).toBeNull();
        expect(source().heading([], CENTRE)).toBeNull();
    });
});
