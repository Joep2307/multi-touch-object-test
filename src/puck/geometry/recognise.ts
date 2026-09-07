import { tracks } from "../../state/tracks";
import { ui } from "../../state/ui";
import { view } from "../../state/view";
import type { Detection } from "../../types/Detection";
import type { TouchPoint } from "../../types/TouchPoint";
import { activeTemplates } from "../activeTemplates";
import { maxTplLongest } from "../maxTplLongest";
import { puckSepPX } from "../puckSepPX";
import { tplLongest } from "../tplLongest";
import { LAYOUT } from "./layout";
import { puckGeometry } from "./puckGeometry";

/* Which pucks are present in this cloud of contact points? The actual work
   happens in the Rust crate (see lib.rs, `recognise`); here we only fill the
   buffers and read them back.

   What goes over: the points with their drag-copy number, the templates of the
   current setup (with their longest side in pixels and whether they're
   already on the table — those get a bit more leeway), and the pucks that
   were already there, so a candidate that continues a puck wins over a
   ghost triangle. */
export function recognise(points: TouchPoint[]): {
    pucks: Detection[];
    usedIdx: Set<number>;
} {
    const g = puckGeometry.exports;
    const usedIdx = new Set<number>();
    if (!g) return { pucks: [], usedIdx };
    const tpls = activeTemplates();
    const pxPerMM = view.pxPerMM;
    const maxSpan = maxTplLongest() * pxPerMM * 1.45;
    const onTable = new Set([...tracks.map.values()].map((t) => t.tpl.id));

    const nP = Math.min(points.length, LAYOUT.MAX_POINTS);
    const pBuf = puckGeometry.f64(g.points_ptr(), nP * LAYOUT.POINT_STRIDE);
    for (let i = 0; i < nP; i++) {
        const p = points[i];
        pBuf[i * 3] = p.x;
        pBuf[i * 3 + 1] = p.y;
        pBuf[i * 3 + 2] = p.uid === undefined ? -1 : p.uid;
    }

    const nT = Math.min(tpls.length, LAYOUT.MAX_TEMPLATES);
    const tBuf = puckGeometry.f64(
        g.templates_ptr(),
        nT * LAYOUT.TEMPLATE_STRIDE,
    );
    const indexOf = new Map<string, number>();
    for (let i = 0; i < nT; i++) {
        const t = tpls[i];
        indexOf.set(t.id, i);
        tBuf[i * 4] = t.ratios[0];
        tBuf[i * 4 + 1] = t.ratios[1];
        tBuf[i * 4 + 2] = tplLongest(t) * pxPerMM;
        tBuf[i * 4 + 3] = onTable.has(t.id) ? 1 : 0;
    }

    const live = [...tracks.map.values()].slice(0, LAYOUT.MAX_TRACKS);
    const rBuf = puckGeometry.f64(
        g.tracks_ptr(),
        live.length * LAYOUT.TRACK_STRIDE,
    );
    live.forEach((t, i) => {
        rBuf[i * 3] = indexOf.get(t.tpl.id) ?? -1;
        rBuf[i * 3 + 1] = t.x;
        rBuf[i * 3 + 2] = t.y;
    });

    const n = g.recognise_pucks(
        nP,
        nT,
        live.length,
        ui.tolerance,
        puckSepPX(),
        maxSpan,
    );

    const out = puckGeometry.f64(g.out_ptr(), n * LAYOUT.OUT_STRIDE);
    const pucks: Detection[] = [];
    for (let i = 0; i < n; i++) {
        const o = i * LAYOUT.OUT_STRIDE;
        pucks.push({
            tpl: tpls[out[o]],
            x: out[o + 1],
            y: out[o + 2],
            angle: out[o + 3],
            conf: out[o + 4],
        });
    }
    const used = puckGeometry.u8(g.used_ptr(), nP);
    for (let i = 0; i < nP; i++) if (used[i]) usedIdx.add(i);
    return { pucks, usedIdx };
}
