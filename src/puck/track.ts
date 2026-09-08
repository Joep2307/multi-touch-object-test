import { CFG } from "../config/CFG";
import { tracks } from "../state/tracks";
import type { Detection } from "../types/Detection";
import type { Track } from "../types/Track";
import type { TrackAssignment } from "../types/TrackAssignment";
import type { TrackResult } from "../types/TrackResult";
import { wrapAngle } from "./geometry/wrapAngle";
import { puckSepPX } from "./puckSepPX";
import { applyPuckControls } from "./applyPuckControls";
import { startTrack } from "./startTrack";

/* Which detection belongs to which puck that was already there? Not by
   template -- two pucks can have the same kind -- but by location: the
   closest pair first, and never farther than `puckSepPX()`. That measure
   sits comfortably below the distance between two discs, so two identical
   pucks don't secretly swap identity (and with it, topic and marker). */
export function track(dets: Detection[], now: number): TrackResult {
    const forDet = new Map<Detection, Track>(),
        taken = new Set<Track>();
    const koppel = (reach: number) => {
        const pairs: { d: Detection; t: Track; gap: number }[] = [];
        for (const d of dets) {
            if (forDet.has(d)) continue;
            for (const t of tracks.map.values()) {
                if (taken.has(t) || t.tpl.id !== d.tpl.id) continue;
                const gap = Math.hypot(t.x - d.x, t.y - d.y);
                if (gap <= reach) pairs.push({ d, t, gap });
            }
        }
        pairs.sort((a, b) => a.gap - b.gap);
        for (const p of pairs) {
            if (forDet.has(p.d) || taken.has(p.t)) continue;
            forDet.set(p.d, p.t);
            taken.add(p.t);
        }
    };
    koppel(puckSepPX());
    /* Second round, wider. Someone who swipes a puck across the table covers
     more distance in one frame than the first round allows; it would then
     come in as a new puck and lose its marker and topic. The tight round has
     already assigned the obvious pairs by this point, so two pucks of the
     same kind can no longer swap identity here. */
    koppel(puckSepPX() * 2.5);
    const seen = new Set<Track>();
    const assignments: TrackAssignment[] = [];
    for (const d of dets) {
        const t = forDet.get(d) || startTrack(d, now);
        seen.add(t);
        t.frames++;
        t.lastSeen = now;
        t.conf = t.conf * 0.7 + d.conf * 0.3;
        t.buf.push({ x: d.x, y: d.y });
        if (t.buf.length > CFG.smoothing) t.buf.shift();
        t.x = t.buf.reduce((s, p) => s + p.x, 0) / t.buf.length;
        t.y = t.buf.reduce((s, p) => s + p.y, 0) / t.buf.length;
        const rawStep = wrapAngle(d.angle - t.lastRawAngle);
        t.lastRawAngle = d.angle;
        t.measuredAngle += rawStep;
        t.filteredAngle += (t.measuredAngle - t.filteredAngle) * 0.55;
        // One degree at the puck counts as two degrees on the choice ring:
        // rotating 5 degrees is 10 degrees on screen. That makes roughly 45
        // degrees of rotation enough to move to the next of four options.
        // Three was too sharp — you'd overshoot your option; less than two
        // requires half a turn per choice. The filtering above damps small
        // contact-point jitter, and more gain than this makes the ring
        // nervous: then the jitter of the contact points alone already taps
        // against a segment boundary.
        t.angle = t.angleOrigin + (t.filteredAngle - t.rawOrigin);
        t.state = t.frames >= CFG.stableFrames ? "recognised" : "candidate";
        assignments.push({
            detection: d,
            trackId: t.id,
            visible: t.state !== "candidate",
        });
        const moved = Math.hypot(t.x - t.anchorX, t.y - t.anchorY);
        if (moved > CFG.jitterPX) {
            t.anchorX = t.x;
            t.anchorY = t.y;
        }
        // A puck that is clearly moved becomes a new contribution: rotate to a
        // topic again and confirm again. The previous marker stays in place.
        if (moved > CFG.rearmPX && !t.armed) {
            t.armed = true;
            t.pinId = null;
        }
        // Anyone who picks the puck up and puts it down elsewhere points at a
        // new location: the zoom anchor point goes along with it.
        if (moved > CFG.rearmPX) t.zoomAnchor = null;
        // Turning zooms and sliding travels; menu options are tapped.
        applyPuckControls(t, now);
    }
    for (const [id, t] of [...tracks.map]) {
        if (seen.has(t)) continue;
        if (now - (t.lastSeen ?? 0) > CFG.dropoutMS) {
            // A puck that drops out is almost never being removed: one bad
            // contact, a bump, or a sleeve sliding over the glass. Its mode
            // goes on hold briefly. Otherwise it would come back fresh,
            // choose whichever mode its nose points at, and lose its marker.
            while (
                tracks.memory.length &&
                now - tracks.memory[0].t >= CFG.puckMemoryMS
            )
                tracks.memory.shift();
            tracks.memory.push({
                tplId: t.tpl.id,
                x: t.x,
                y: t.y,
                t: now,
                menu: t.menu,
                mode: t.mode,
                topicIdx: t.topicIdx,
                pinId: t.pinId,
                armed: t.armed,
                angleOrigin: t.angle,
                zoomAnchor: t.zoomAnchor,
                ring: t.ring,
                panOX: t.panOX,
                panOY: t.panOY,
            });
            tracks.map.delete(id);
        } else if (t.state === "recognised") t.state = "incomplete";
        else tracks.map.delete(id);
    }
    return {
        pucks: [...tracks.map.values()].filter((t) => t.state !== "candidate"),
        assignments,
    };
}
