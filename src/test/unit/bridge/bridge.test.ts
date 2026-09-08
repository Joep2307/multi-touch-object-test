/* The bridge between the old pipeline and the new model.
 *
 * These tests matter out of proportion to their size: if the
 * translation of a template into a kind is wrong, the parity check in
 * phase 6 compares two pipelines that were never looking at the same
 * object, and reports differences that are its own fault.
 */
import { describe, expect, it } from "vitest";
import { ParityCheck } from "../../../bridge/ParityCheck";
import { TrackBridge } from "../../../bridge/TrackBridge";
import { templateToKind } from "../../../bridge/templateToKind";
import { triadCornersMM } from "../../../bridge/triadCornersMM";
import { CentroidSolver, footprintFrom } from "../../../core/base";
import { SimulatedPuck } from "../../../core/physical";
import { Apertured } from "../../../core/physical/affordance/Apertured";
import { Nestable } from "../../../core/physical/affordance/Nestable";
import { Nesting } from "../../../core/physical/affordance/Nesting";
import { affordanceOf } from "../../../core/physical/affordanceOf";
import type { TrackBridgeContact } from "../../../bridge/TrackBridgeContact";
import type { Detection } from "../../../types/Detection";
import type { Template } from "../../../types/Template";
import type { TrackAssignment } from "../../../types/TrackAssignment";

const ring = (extra: Partial<Template> = {}): Template => ({
    id: "ring-1",
    verdict: "good",
    angles: [0, 70, 150, 210, 300],
    ringMM: 34,
    ...extra,
});

const triadRadiusMM = (
    longestMM: number,
    ratios: readonly [number, number],
): number =>
    footprintFrom(triadCornersMM(longestMM, ratios), 80, new CentroidSolver())
        .footRadiusMM;

describe("triad footprint", () => {
    it("matches the hand-computable equilateral case", () => {
        /* An equilateral triangle of side L has its corners at
           L / sqrt(3) from the centroid. */
        const r = triadRadiusMM(60, [1, 1]);
        expect(r).toBeCloseTo(60 / Math.sqrt(3), 6);
    });

    it("is a constant of the shape, not of the size, up to scale", () => {
        const small = triadRadiusMM(30, [0.8, 0.9]);
        const large = triadRadiusMM(60, [0.8, 0.9]);
        expect(large / small).toBeCloseTo(2, 9);
    });

    it("handles a scalene triangle, which has no single radius", () => {
        /* The three corners sit at three different distances from the
           centroid; the mean of them is still fixed by the shape, and
           that is exactly what CentroidSolver measures. */
        expect(triadRadiusMM(60, [0.6, 0.8])).toBeGreaterThan(0);
    });

    it("returns zero for an impossible triangle rather than NaN", () => {
        expect(triadRadiusMM(60, [0.1, 0.1])).toBe(0);
        expect(triadRadiusMM(0, [1, 1])).toBe(0);
    });
});

describe("templateToKind", () => {
    it("reads a ring template as a ring kind", () => {
        const kind = templateToKind(ring());
        expect(kind.family).toBe("ring");
        expect(kind.footprint.expectedCount).toBe(5);
        expect(kind.footprint.footRadiusMM).toBe(34);
    });

    it("reads a slot template as a slot kind, counting its feet", () => {
        const kind = templateToKind(
            ring({ id: "slot-1", slots: 12, code: 0b101101 }),
        );
        expect(kind.family).toBe("slot");
        expect(kind.footprint.expectedCount).toBe(4);
    });

    it("reads a taped triangle as a triad kind", () => {
        const kind = templateToKind({
            id: "tri-1",
            verdict: "good",
            ratios: [0.8, 0.9],
            longestMM: 60,
        });
        expect(kind.family).toBe("triad");
        expect(kind.footprint.expectedCount).toBe(3);
        expect(kind.footprint.footRadiusMM).toBeGreaterThan(0);
    });

    it("gives an 80 mm puck an 80 mm outer diameter, not 90", () => {
        /* The old renderer sizes every puck from CFG.puckRadiusMM
           (45 mm), which draws a 90 mm ring on an 80 mm object. This
           is the fix, and it is the single biggest reason the drawn
           ring and the physical puck do not line up. */
        expect(templateToKind(ring()).footprint.outerDiameterMM).toBe(80);
    });

    it("lets the duo's small half keep its own diameter", () => {
        const kind = templateToKind(ring({ radiusMM: 26 }));
        expect(kind.footprint.outerDiameterMM).toBe(52);
    });

    it("gives every puck a viewing hole, as the renderer does", () => {
        expect(affordanceOf(templateToKind(ring()), Apertured)).not.toBeNull();
    });

    it("nests the tool into the host, and not the other way round", () => {
        const tool = templateToKind(
            ring({ id: "duo-tool", nest: true, role: "tool" }),
        );
        const host = templateToKind(ring({ id: "duo-host", nest: true }));
        expect(affordanceOf(tool, Nestable)).not.toBeNull();
        expect(affordanceOf(tool, Nesting)).toBeNull();
        expect(affordanceOf(host, Nesting)).not.toBeNull();
    });

    it("marks everything that exists today as legacy", () => {
        expect(templateToKind(ring()).legacy).toBe(true);
    });
});

describe("ParityCheck", () => {
    const seen = (x: number, y: number, angleDeg: number) => ({
        seen: true,
        x,
        y,
        angleDeg,
    });
    const blind = { seen: false, x: 0, y: 0, angleDeg: 0 };

    it("says nothing when the two agree", () => {
        const check = new ParityCheck();
        const out = check.compare(
            0,
            "t1",
            "k1",
            seen(400, 300, 90),
            seen(402, 301, 90.4),
        );
        expect(out).toBeNull();
        expect(check.divergenceCount).toBe(0);
        expect(check.frameCount).toBe(1);
    });

    it("says nothing when neither sees a puck", () => {
        const check = new ParityCheck();
        expect(check.compare(0, "t1", "k1", blind, blind)).toBeNull();
    });

    it("reports a centre that has drifted too far", () => {
        const check = new ParityCheck();
        const out = check.compare(
            16,
            "t1",
            "k1",
            seen(400, 300, 0),
            seen(430, 300, 0),
        );
        expect(out?.centreOffPX).toBeCloseTo(30, 6);
        expect(check.divergenceCount).toBe(1);
    });

    it("does not call a wrap-point crossing a disagreement", () => {
        /* 359.8 and 0.2 are half a degree apart. Plain subtraction
           would call that 359.6 and fill the report with noise. */
        const check = new ParityCheck();
        const out = check.compare(
            0,
            "t1",
            "k1",
            seen(400, 300, 359.8),
            seen(400, 300, 0.2),
        );
        expect(out).toBeNull();
    });

    it("reports a real angular disagreement across the wrap point", () => {
        const check = new ParityCheck();
        const out = check.compare(
            0,
            "t1",
            "k1",
            seen(400, 300, 350),
            seen(400, 300, 10),
        );
        expect(out?.angleOffDeg).toBeCloseTo(20, 6);
    });

    it("reports when only one pipeline sees the puck at all", () => {
        const check = new ParityCheck();
        const out = check.compare(0, "t1", "k1", seen(400, 300, 0), blind);
        expect(out?.seenByOld).toBe(true);
        expect(out?.seenByNew).toBe(false);
        expect(out?.centreOffPX).toBeNull();
    });

    it("reports when only one pipeline knows the direction", () => {
        const check = new ParityCheck();
        const out = check.compare(0, "t1", "k1", seen(400, 300, 0), {
            ...seen(400, 300, 0),
            angleDeg: null,
        });
        expect(out?.angleOffDeg).toBeNull();
        expect(out?.angleKnownByOld).toBe(true);
        expect(out?.angleKnownByNew).toBe(false);
    });

    it("keeps the worst disagreement, not the average", () => {
        const check = new ParityCheck();
        check.compare(0, "t1", "k1", seen(0, 0, 0), seen(20, 0, 0));
        check.compare(16, "t1", "k1", seen(0, 0, 0), seen(90, 0, 0));
        check.compare(32, "t1", "k1", seen(0, 0, 0), seen(30, 0, 0));
        expect(check.worst()?.centreOffPX).toBeCloseTo(90, 6);
    });

    it("treats a one-sided sighting as the worst kind", () => {
        const check = new ParityCheck();
        check.compare(0, "t1", "k1", seen(0, 0, 0), seen(90, 0, 0));
        check.compare(16, "t1", "k1", blind, seen(0, 0, 0));
        expect(check.worst()?.centreOffPX).toBeNull();
    });
});

const bridgeContacts = (
    cx: number,
    cy: number,
    prefix: string,
    simulated: boolean = false,
): TrackBridgeContact[] =>
    [0, 70, 150, 210, 300].map((degrees, index) => {
        const radians = (degrees * Math.PI) / 180;
        return {
            sourceId: `${prefix}:${index}`,
            x: cx + 136 * Math.cos(radians),
            y: cy + 136 * Math.sin(radians),
            radiusPX: 0,
            simulated,
        };
    });

const assignment = (
    trackId: string,
    template: Template,
    contactIndices: readonly number[],
    x: number,
    y: number,
): TrackAssignment => {
    const detection: Detection = {
        tpl: template,
        conf: 1,
        x,
        y,
        angle: 0,
        contactIndices,
    };
    return { detection, trackId, visible: true };
};

describe("TrackBridge", () => {
    it("builds a ContactFrame and updates the matched physical", () => {
        const bridge = new TrackBridge(4);
        const template = ring();
        const contacts = bridgeContacts(400, 300, "real");
        const match = assignment(
            "track-1",
            template,
            contacts.map((_, index) => index),
            400,
            300,
        );

        bridge.update(100, contacts, [match]);
        const physical = bridge.physicalForTrack("track-1");
        expect(bridge.contactFrame.points).toHaveLength(5);
        expect(bridge.contactFrame.points[0]?.firstSeen).toBe(100);
        expect(physical?.presence.state).toBe("placed");
        expect(physical?.base.position.snapshot().centre?.x).toBeCloseTo(
            400,
            6,
        );

        bridge.update(116, contacts, [match]);
        expect(bridge.contactFrame.points[0]?.firstSeen).toBe(100);
        expect(bridge.contactFrame.points[0]?.lastSeen).toBe(116);
    });

    it("keeps core identity when the legacy tracker starts a new id", () => {
        const bridge = new TrackBridge(4);
        const template = ring();
        const first = bridgeContacts(400, 300, "first");
        const indices = first.map((_, index) => index);
        bridge.update(0, first, [
            assignment("track-old", template, indices, 400, 300),
        ]);
        const physical = bridge.physicalForTrack("track-old");

        bridge.update(1_500, [], []);
        expect(physical?.presence.state).toBe("lifted");
        const returned = bridgeContacts(405, 302, "returned");
        bridge.update(4_000, returned, [
            assignment("track-new", template, indices, 405, 302),
        ]);

        expect(bridge.physicalForTrack("track-new")).toBe(physical);
        expect(physical?.presence.state).toBe("placed");
        bridge.update(15_001, [], []);
        expect(bridge.physicalForTrack("track-new")).toBeNull();
        expect(bridge.all()).toHaveLength(0);
    });

    it("marks a model fed only simulated pads as simulated", () => {
        const bridge = new TrackBridge(4);
        const template = ring();
        const contacts = bridgeContacts(400, 300, "sim", true);
        bridge.update(0, contacts, [
            assignment(
                "track-sim",
                template,
                contacts.map((_, index) => index),
                400,
                300,
            ),
        ]);
        const physical = bridge.physicalForTrack("track-sim");
        expect(physical).toBeInstanceOf(SimulatedPuck);
        expect(physical?.virtual).toBe(true);
    });
});
