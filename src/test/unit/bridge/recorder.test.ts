/* Capturing a session at the table.
 *
 * The round-trip test is the one that matters. Everything still open in
 * phases 1, 2 and 6 depends on recordings taken from the real glass,
 * and a recording that replays differently from the session it came
 * from would be worse than having none — it would produce confident
 * test results about a table that never happened.
 */
import {
    BaseSessionRecorder,
    ParityCheck,
    TrackBridge,
} from "../../../bridge";
import { ReplayContactSource } from "../../../core/contact";
import { describe, expect, it } from "vitest";
import type { TrackBridgeContact } from "../../../bridge";
import type { ContactRecording } from "../../../core/contact";
import type { Detection, Template } from "../../../types";

const TPL: Template = {
    id: "ring-1",
    verdict: "good",
    angles: [0, 70, 150, 210, 300],
    ringMM: 34,
};

const contacts = (cx: number, cy: number): TrackBridgeContact[] =>
    [0, 70, 150, 210, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return {
            sourceId: `pointer:${i}`,
            x: cx + 136 * Math.cos(rad),
            y: cy + 136 * Math.sin(rad),
            radiusPX: 0,
            simulated: false,
        };
    });

const detection = (cx: number, cy: number): Detection => ({
    tpl: TPL,
    conf: 0.9,
    x: cx,
    y: cy,
    angle: 0,
    contactIndices: [0, 1, 2, 3, 4],
    /* The same five feet the indices name. `recognise` fills these in
       from the contacts it was given; here the index is the id. */
    feet: contacts(cx, cy).map((contact, i) => ({
        id: i,
        x: contact.x,
        y: contact.y,
    })),
});

const rig = () => {
    const bridge = new TrackBridge(4);
    const parity = new ParityCheck();
    const recorder = new BaseSessionRecorder(bridge, parity);
    let at = 0;
    const step = (): void => {
        at += 16;
        bridge.update(at, contacts(400, 300), [
            {
                detection: detection(400, 300),
                trackId: "puck-1",
                visible: true,
            },
        ]);
        recorder.capture();
    };
    return { recorder, parity, step, now: () => at };
};

describe("BaseSessionRecorder", () => {
    it("captures nothing until it is armed", () => {
        const r = rig();
        for (let i = 0; i < 10; i += 1) r.step();
        expect(r.recorder.frameCount).toBe(0);
        expect(r.recorder.recording).toBe(false);
    });

    it("replays exactly what it recorded", () => {
        const r = rig();
        r.recorder.start("probe", r.now());
        for (let i = 0; i < 25; i += 1) r.step();
        expect(r.recorder.frameCount).toBe(25);

        const json = r.recorder.toJSON("2026-09-08T00:00:00.000Z");
        expect(json).not.toBeNull();
        const parsed = JSON.parse(json ?? "") as ContactRecording;
        expect(parsed.frames).toHaveLength(25);

        const replay = new ReplayContactSource(parsed);
        replay.frame(1000);
        expect(replay.frame(1000 + 10 * 16).points).toHaveLength(5);
    });

    it("keeps what it captured after stopping, so it can be saved", () => {
        /* The order a person actually uses: record, stop, save. An
           earlier version dropped the frames on stop, so the save
           button saw an empty recorder and disabled itself — the data
           only existed while recording, which is exactly when saving
           is not offered. Every test passed, because none of them
           stopped first. */
        const r = rig();
        r.recorder.start("probe", 0);
        for (let i = 0; i < 12; i += 1) r.step();
        r.recorder.stop(r.now());
        expect(r.recorder.recording).toBe(false);
        expect(r.recorder.frameCount).toBe(12);
        expect(r.recorder.saveable).toBe(true);
        expect(r.recorder.toJSON("2026-09-09T00:00:00.000Z")).not.toBeNull();
    });

    it("captures nothing more once stopped", () => {
        const r = rig();
        r.recorder.start("probe", 0);
        for (let i = 0; i < 5; i += 1) r.step();
        r.recorder.stop(r.now());
        for (let i = 0; i < 5; i += 1) r.step();
        expect(r.recorder.frameCount).toBe(5);
    });

    it("freezes the elapsed time when stopped", () => {
        const r = rig();
        r.recorder.start("probe", 1000);
        r.recorder.stop(11000);
        expect(r.recorder.elapsedMS(50000)).toBe(10000);
    });

    it("refuses to produce a file from an unarmed session", () => {
        const r = rig();
        for (let i = 0; i < 5; i += 1) r.step();
        expect(r.recorder.toJSON("2026-09-08T00:00:00.000Z")).toBeNull();
    });

    it("names a file a disk will accept", () => {
        const r = rig();
        r.recorder.start("twee pucks / draaien!", 1234);
        expect(r.recorder.fileName()).not.toMatch(/[^a-zA-Z0-9.-]/);
    });

    it("reports the worst divergence, not the average", () => {
        const r = rig();
        r.parity.compare(
            0,
            "t",
            "k",
            { seen: true, x: 0, y: 0, angleDeg: 0 },
            { seen: true, x: 40, y: 0, angleDeg: 0 },
        );
        expect(r.recorder.paritySummary()).toMatch(/40\.0 px/);
    });

    it("clears the score when a new recording starts", () => {
        const r = rig();
        r.parity.compare(
            0,
            "t",
            "k",
            { seen: true, x: 0, y: 0, angleDeg: 0 },
            { seen: true, x: 40, y: 0, angleDeg: 0 },
        );
        r.recorder.start("second", 0);
        expect(r.parity.divergenceCount).toBe(0);
    });
});
