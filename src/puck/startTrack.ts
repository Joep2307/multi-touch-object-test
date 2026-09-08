import { CFG } from "../config/CFG";
import { tracks } from "../state/tracks";
import type { Detection } from "../types/Detection";
import type { Track } from "../types/Track";
import { puckSepPX } from "./puckSepPX";
import { ringIndexOf } from "./ring/ringIndexOf";
import { ringItems } from "./ring/ringItems";

export function startTrack(d: Detection, now: number): Track {
    const t: Track = {
        id: "puck-" + ++tracks.seq,
        tpl: d.tpl,
        x: d.x,
        y: d.y,
        angle: d.angle,
        measuredAngle: d.angle,
        filteredAngle: d.angle,
        lastRawAngle: d.angle,
        angleOrigin: d.angle,
        rawOrigin: d.angle,
        frames: 0,
        state: "candidate",
        buf: [],
        conf: d.conf,
        anchorX: d.x,
        anchorY: d.y,
        armed: true,
        flash: 0,
        ring: false,
        tapIdx: -1,
        tapT0: 0,
        panOX: d.x,
        panOY: d.y,
        panT: 0,
        zoomRot: d.angle,
        zoomCarry: 0,
        // The puck starts in the main menu. Whichever mode it lands in is
        // immediately its choice: place it with its nose on Zoom, and it
        // zooms, without first rotating away and without waiting.
        // `landing` says that choice still needs to be made; that happens
        // as soon as the puck is recognised (see track()).
        menu: "root",
        mode: "move",
        topicIdx: 0,
        landing: true,
        dwellIdx: -1,
        dwellT0: now,
        dwellDone: true,
        zoomRefY: d.y,
        zoomAnchor: null,
    };
    tracks.map.set(t.id, t);
    // Did the same puck just leave the table? Then this isn't a new puck but
    // the same one that briefly dropped out: it picks its mode back up and
    // doesn't choose again. Same kind AND roughly the same location, because
    // the kind alone could give one puck's mode to another.
    const mi = tracks.memory.findIndex(
        (m) =>
            m.tplId === d.tpl.id &&
            now - m.t < CFG.puckMemoryMS &&
            Math.hypot(m.x - d.x, m.y - d.y) < puckSepPX() * 1.6,
    );
    if (mi >= 0) {
        const mem = tracks.memory.splice(mi, 1)[0];
        t.menu = mem.menu;
        t.mode = mem.mode;
        t.topicIdx = mem.topicIdx;
        t.pinId = mem.pinId;
        t.armed = mem.armed;
        t.landing = false;
        t.angleOrigin = mem.angleOrigin;
        t.angle = mem.angleOrigin;
        t.zoomAnchor = mem.zoomAnchor;
        t.ring = mem.ring;
        t.panOX = mem.panOX;
        t.panOY = mem.panOY;
        t.zoomRot = mem.angleOrigin;
    }
    t.dwellIdx = ringIndexOf(t.angle, ringItems(t).length);
    return t;
}
