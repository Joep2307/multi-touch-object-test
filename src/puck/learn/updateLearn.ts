import { LEARN } from "../../config/LEARN";
import { el } from "../../dom/el";
import { tr } from "../../i18n/tr";
import { learn } from "../../state/learn";
import { describe } from "../geometry/describe";
import { drawLearnPoints } from "./drawLearnPoints";
import { learnPoints } from "./learnPoints";
import { renderLearn } from "./renderLearn";
import { setLearnBar } from "./setLearnBar";

/* Every frame: redraw the points, and keep tracking the sample series for as
   long as nothing has been measured yet. */
export function updateLearn(now: number): void {
    const pts = learnPoints();
    drawLearnPoints(pts);
    const st = el("learnStatus");
    if (learn.phase === "done" || learn.phase === "saved") return;
    if (learn.phase === "clear") {
        // Wait until the glass is empty; only what's placed after that counts.
        st.innerHTML = tr("recogLift", pts.length);
        learn.samples = [];
        setLearnBar(0);
        if (!pts.length) {
            learn.phase = "wait";
            renderLearn();
        }
        return;
    }
    if (pts.length !== 3) {
        if (learn.phase !== "wait") {
            learn.phase = "wait";
            renderLearn();
        }
        learn.samples = [];
        learn.moved = false;
        setLearnBar(0);
        st.innerHTML = tr("recogWait", pts.length);
        return;
    }
    const d = describe(pts[0], pts[1], pts[2]);
    if (!d) return;
    const last = learn.samples[learn.samples.length - 1];
    if (
        last &&
        (Math.hypot(d.cx - last.cx, d.cy - last.cy) > LEARN.STILL_PX ||
            Math.abs(d.longest - last.longest) > LEARN.STILL_PX)
    ) {
        learn.samples = [];
        learn.moved = true;
    }
    if (!learn.samples.length) learn.t0 = now;
    learn.samples.push({
        r0: d.ratios[0],
        r1: d.ratios[1],
        longest: d.longest,
        cx: d.cx,
        cy: d.cy,
    });
    if (learn.phase !== "hold") {
        learn.phase = "hold";
        learn.note = "";
        renderLearn();
    }
    const held = now - learn.t0;
    setLearnBar(held / LEARN.HOLD_MS);
    st.innerHTML =
        learn.moved && held < 250 ? tr("recogMoved") : tr("recogHold");
    if (held >= LEARN.HOLD_MS && learn.samples.length >= LEARN.MIN_SAMPLES) {
        const med = (
            f: (s: { r0: number; r1: number; longest: number }) => number,
        ) => {
            const a = learn.samples.map(f).sort((x, y) => x - y);
            return a[a.length >> 1];
        };
        learn.m = {
            r0: med((s) => s.r0),
            r1: med((s) => s.r1),
            longest: med((s) => s.longest),
        };
        learn.phase = "done";
        learn.moved = false;
        setLearnBar(1);
        renderLearn();
    }
}
