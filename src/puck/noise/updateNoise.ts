import { CFG } from "../../config/CFG";
import { NOISE } from "../../config/NOISE";
import { noise } from "../../state/noise";
import { ui } from "../../state/ui";
import { view } from "../../state/view";
import type { TouchPoint } from "../../types/TouchPoint";
import { codeCanon } from "../geometry/codeCanon";
import { describeSlots } from "../geometry/describeSlots";
import { armNoise } from "./armNoise";
import { matchFeet } from "./matchFeet";
import { noiseReport } from "./noiseReport";
import { seedNoise } from "./seedNoise";

/* One frame of a noise measurement. Runs only while the puck diagnosis is
   on, and only on real touches: a drag copy from the tray has no noise, and
   a measurement of zero would be a lie.

   Everything is measured against the anchors from the moment the series
   started. What is left over is an extra point (a hand on the glass, a foot
   reported twice); an anchor left empty is a foot that lost contact this
   frame -- and at a table with printed feet that is the thing that actually
   goes wrong, so it must be counted rather than reset the series. While
   settling, an unmatched point becomes a foot of its own, so a foot that
   flickers during the first moments still ends up in the list. */
export function updateNoise(points: TouchPoint[], now: number): void {
    if (!ui.debugMode) {
        if (noise.phase !== "wait") noise.phase = "wait";
        return;
    }
    const pts = points.filter((p) => !p.sim);
    if (pts.length < NOISE.MIN_PTS || pts.length > NOISE.MAX_PTS) {
        /* A finished measurement stays up until the next puck lies down;
         you want to read it with your hands free. */
        if (noise.phase !== "done") noise.phase = "wait";
        return;
    }
    if (noise.phase === "wait" || !noise.feet.length) {
        seedNoise(pts, now);
        return;
    }
    const k = view.pxPerMM || 1;
    const { pick, drift, hits } = matchFeet(noise.feet, pts, k);
    /* The puck was moved, or another one was put down: start over -- but
     only once it stays that way. One frame that wanders off is noise, and
     a table noisy enough to do that regularly is exactly the one whose
     measurement must not keep restarting. */
    if (hits < 2 || drift > NOISE.MOVE_MM) {
        if (++noise.slip >= NOISE.SLIP_FRAMES) {
            seedNoise(pts, now);
            return;
        }
        /* Not thrown away, only counted: skipping the frames that wander
         furthest would quietly measure a table calmer than it is. */
    } else noise.slip = 0;
    /* Counted while settling as well, because those frames are what the
     anchors are recentred on. */
    noise.feet.forEach((f, i) => {
        const j = pick[i];
        if (j < 0) {
            f.miss++;
            return;
        }
        const p = pts[j];
        f.n++;
        f.sx += p.x;
        f.sy += p.y;
        f.sxx += p.x * p.x;
        f.syy += p.y * p.y;
    });
    if (noise.phase === "hold") {
        for (let i = 0; i < pts.length; i++)
            if (!pick.includes(i))
                noise.feet.push({
                    ax: pts[i].x,
                    ay: pts[i].y,
                    n: 0,
                    sx: 0,
                    sy: 0,
                    sxx: 0,
                    syy: 0,
                    miss: 0,
                });
        if (now - noise.t0 >= NOISE.HOLD_MS) armNoise(now);
        return;
    }
    if (noise.phase !== "run") return;
    noise.extra += pts.length - pick.filter((j) => j >= 0).length;
    /* The same reading the recognition makes: the fitted circle and which
     slots the feet fall into. Counted by its canonical code, because the
     grid may be read a slot further along without anything being wrong --
     `matchSlots` tries every rotation anyway. */
    const d = describeSlots(pts, CFG.slotCount);
    if (d) {
        noise.radii.push(d.radius / k);
        noise.snapSum += d.snap;
        noise.snapN++;
        const c = codeCanon(d.code, CFG.slotCount);
        noise.codes.set(c, (noise.codes.get(c) ?? 0) + 1);
    }
    noise.frames++;
    if (noise.frames >= NOISE.FRAMES) {
        noise.report = noiseReport(k);
        noise.phase = "done";
    }
}
