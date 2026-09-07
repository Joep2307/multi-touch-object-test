import { LEARN } from "../../config/LEARN";
import { el } from "../../dom/el";
import { tr } from "../../i18n/tr";
import { learn } from "../../state/learn";
import { describe } from "../geometry/describe";
import { describeRing } from "../geometry/describeRing";
import { norm360 } from "../geometry/norm360";
import { splitDuo } from "../geometry/splitDuo";
import { drawLearnPoints } from "./drawLearnPoints";
import { learnKnownNote } from "./learnKnownNote";
import { learnMedian } from "./learnMedian";
import { learnPoints } from "./learnPoints";
import { renderLearn } from "./renderLearn";
import { setLearnBar } from "./setLearnBar";

/* Every frame: redraw the points, and keep tracking the sample series for
   as long as nothing has been measured yet. */
export function updateLearn(now: number): void {
    const pts = learnPoints();
    drawLearnPoints(pts);
    const st = el("learnStatus");
    if (learn.phase === "done" || learn.phase === "saved") return;
    if (learn.phase === "clear") {
        // Wait until the glass is empty; only what comes after that counts.
        st.innerHTML = tr("recogLift", pts.length);
        learn.samples = [];
        setLearnBar(0);
        if (!pts.length) {
            learn.phase = "wait";
            renderLearn();
        }
        return;
    }
    /* Six points can be the duo: two triangles around the same centre. If
     they don't fall apart that way, it is simply too much on the glass. */
    const duo = splitDuo(pts);
    if (pts.length !== 3 && pts.length !== 5 && !duo) {
        if (learn.phase !== "wait") {
            learn.phase = "wait";
            renderLearn();
        }
        learn.samples = [];
        learn.moved = false;
        setLearnBar(0);
        st.innerHTML = tr("recogWait", pts.length) + learnKnownNote();
        return;
    }
    if (duo) {
        const size = duo.big.longest;
        const last = learn.samples[learn.samples.length - 1];
        if (
            last &&
            (!last.duo ||
                Math.hypot(duo.big.cx - last.cx, duo.big.cy - last.cy) >
                    LEARN.STILL_PX ||
                Math.abs(size - last.size) > LEARN.STILL_PX)
        ) {
            learn.samples = [];
            learn.moved = true;
        }
        if (!learn.samples.length) learn.t0 = now;
        learn.samples.push({
            duo: true,
            size,
            cx: duo.big.cx,
            cy: duo.big.cy,
            o0: duo.big.ratios[0],
            o1: duo.big.ratios[1],
            osize: duo.big.longest,
            i0: duo.small.ratios[0],
            i1: duo.small.ratios[1],
            isize: duo.small.longest,
        });
        if (learn.phase !== "hold") {
            learn.phase = "hold";
            learn.note = "";
            renderLearn();
        }
        const busy = now - learn.t0;
        setLearnBar(busy / LEARN.HOLD_MS);
        st.innerHTML =
            learn.moved && busy < 250 ? tr("recogMoved") : tr("recogHoldDuo");
        if (
            busy >= LEARN.HOLD_MS &&
            learn.samples.length >= LEARN.MIN_SAMPLES
        ) {
            learn.m = learnMedian();
            learn.phase = "done";
            learn.moved = false;
            setLearnBar(1);
            renderLearn();
        }
        return;
    }
    /* Five points is a printed puck, three a triangle of tape. What lies
     there decides which shape gets stored. */
    const ring = pts.length === 5;
    /* Two measurements with different fields. They stand here deliberately
     as two separate names and not as one `d` with a flag: that way nobody
     -- TypeScript nor the reader -- has to work out which half is meant. */
    const metRing = ring ? describeRing(pts) : null;
    const metTri = ring ? null : describe(pts[0], pts[1], pts[2]);
    const d = metRing || metTri; // only for what they share: cx and cy
    if (!d) return;
    // Five points that don't lie on one circle are fingers, not a puck.
    if (metRing && metRing.spread > 0.2) {
        learn.samples = [];
        setLearnBar(0);
        st.innerHTML = tr("recogWait", pts.length) + learnKnownNote();
        return;
    }
    const size = metRing
        ? metRing.radius
        : (metTri as { longest: number }).longest;
    const last = learn.samples[learn.samples.length - 1];
    if (
        last &&
        (!!last.ring !== ring ||
            Math.hypot(d.cx - last.cx, d.cy - last.cy) > LEARN.STILL_PX ||
            Math.abs(size - last.size) > LEARN.STILL_PX)
    ) {
        learn.samples = [];
        learn.moved = true;
    }
    if (!learn.samples.length) learn.t0 = now;
    /* The angles are turned into angles from the arrow straight away. On
     screen the arrow points up, and that is -90 degrees, so 90 is added. */
    learn.samples.push(
        metRing
            ? {
                  ring: true,
                  angles: metRing.angles.map((a) => norm360(a + 90)),
                  size,
                  cx: d.cx,
                  cy: d.cy,
              }
            : {
                  ring: false,
                  r0: (metTri as { ratios: [number, number] }).ratios[0],
                  r1: (metTri as { ratios: [number, number] }).ratios[1],
                  size,
                  cx: d.cx,
                  cy: d.cy,
              },
    );
    if (learn.phase !== "hold") {
        learn.phase = "hold";
        learn.note = "";
        renderLearn();
    }
    const held = now - learn.t0;
    setLearnBar(held / LEARN.HOLD_MS);
    st.innerHTML =
        learn.moved && held < 250
            ? tr("recogMoved")
            : tr("recogHold", pts.length);
    if (held >= LEARN.HOLD_MS && learn.samples.length >= LEARN.MIN_SAMPLES) {
        learn.m = learnMedian();
        learn.phase = "done";
        learn.moved = false;
        setLearnBar(1);
        renderLearn();
    }
}
