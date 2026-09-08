import { CFG } from "../../config/CFG";
import { diag } from "../../state/diag";
import { tracks } from "../../state/tracks";
import { ui } from "../../state/ui";
import { view } from "../../state/view";
import type { Detection } from "../../types/Detection";
import type { PuckCandidate } from "../../types/PuckCandidate";
import type { RingShape } from "../../types/RingShape";
import type { Template } from "../../types/Template";
import type { TouchPoint } from "../../types/TouchPoint";
import { activeTemplates } from "../activeTemplates";
import { puckSepPX } from "../puckSepPX";
import { tplLongest } from "../tplLongest";
import { describe } from "./describe";
import { describeRing } from "./describeRing";
import { describeSlots } from "./describeSlots";
import { dist } from "./dist";
import { duoBootstrap } from "./duoBootstrap";
import { fitCircle } from "./fitCircle";
import { isRing } from "./isRing";
import { isSlotted } from "./isSlotted";
import { matchRing } from "./matchRing";
import { matchSlots } from "./matchSlots";
import { maxTplSpan } from "./maxTplSpan";
import { mayOverlap } from "./mayOverlap";
import { noteRingDiag } from "./noteRingDiag";
import { pick4 } from "./pick4";
import { pick5 } from "./pick5";
import { sizeErr } from "./sizeErr";
import { tplRing } from "./tplRing";
import { tplSlots } from "./tplSlots";

/* Which pucks lie in this cloud of contact points? Two kinds of puck, two
   searches over the same points: triangles out of triples, rings out of
   fives on one circle. They end up in the same bag of candidates and
   compete for the same contact points. */
export function recognise(
    points: TouchPoint[],
    tpls?: Template[],
): { pucks: Detection[]; usedIdx: Set<number> } {
    if (ui.debugMode) diag.ring = null;
    const list = tpls || activeTemplates();
    /* The duo's measurements are a guess from the factory, and a guess of
     62 mm with a generous tolerance fits all sorts of things -- among them
     three feet of a ring puck whose fourth briefly dropped out, and then
     that puck loses its identity. The duo therefore only joins this loop
     once its shape comes from somewhere: learned with "Learn puck"
     (`learnedAt`), or measured by `duoBootstrap` while the pair lay nested
     on the table (`duoSeen`). Until then the back door is the only thing
     that points the duo out, and that one looks at the shape of the pair
     and so cannot be mistaken. */
    const tris = list.filter(
        (t) => !isRing(t) && !(t.nest && !t.learnedAt && !t.duoSeen),
    );
    const rings = list.filter(isRing);
    const slotted = list.filter(isSlotted);
    /* All the grids that occur; usually just the one from CFG. */
    const slotCounts = [...new Set(slotted.map(tplSlots))];
    const cands: PuckCandidate[] = [];
    const pxPerMM = view.pxPerMM;
    const maxSpan = maxTplSpan() * pxPerMM * 1.45;
    // Which kinds are already down: those get a little more room (below).
    const onTable = new Set([...tracks.map.values()].map((t) => t.tpl.id));
    const cell = Math.max(24, maxSpan),
        grid = new Map<string, number[]>();
    for (let i = 0; i < points.length; i++) {
        const key =
            Math.floor(points[i].x / cell) +
            ":" +
            Math.floor(points[i].y / cell);
        let bucket = grid.get(key);
        if (!bucket) grid.set(key, (bucket = []));
        bucket.push(i);
    }
    for (let i = 0; i < points.length; i++) {
        const cx = Math.floor(points[i].x / cell),
            cy = Math.floor(points[i].y / cell);
        const near: number[] = [];
        for (let dx = -1; dx <= 1; dx++)
            for (let dy = -1; dy <= 1; dy++) {
                const bucket = grid.get(cx + dx + ":" + (cy + dy));
                if (!bucket) continue;
                for (const j of bucket) if (j > i) near.push(j);
            }
        near.sort((a, b) => a - b);
        for (let a = 0; a < near.length; a++) {
            const j = near[a];
            if (dist(points[i], points[j]) > maxSpan) continue;
            for (let b = a + 1; b < near.length; b++) {
                const k = near[b];
                if (
                    dist(points[i], points[k]) > maxSpan ||
                    dist(points[j], points[k]) > maxSpan
                )
                    continue;
                /* A drag copy carries its own number. Points of two
                 different pucks never form one puck, so we skip that
                 triangle -- otherwise such a ghost steals a contact point
                 from a real puck. */
                const uid = points[i].uid ?? points[j].uid ?? points[k].uid;
                if (
                    uid !== undefined &&
                    (points[i].uid !== uid ||
                        points[j].uid !== uid ||
                        points[k].uid !== uid)
                )
                    continue;
                const d = describe(points[i], points[j], points[k]);
                if (!d) continue;
                for (const tpl of tris) {
                    const r = tpl.ratios;
                    if (!r) continue;
                    const err = Math.hypot(
                        d.ratios[0] - r[0],
                        d.ratios[1] - r[1],
                    );
                    /* While turning, the measured contact points deform by
                     a few pixels. A puck that is already tracked gets a
                     little extra room; first recognition stays on the
                     strict tolerance. */
                    const tracked = onTable.has(tpl.id);
                    const errLimit = tracked
                        ? Math.min(0.14, ui.tolerance * 1.4)
                        : ui.tolerance;
                    if (err > errLimit) continue;
                    const want = tplLongest(tpl) * pxPerMM;
                    const sizeErr = Math.abs(d.longest - want) / want;
                    if (sizeErr > (tracked ? 0.5 : 0.42)) continue;
                    cands.push({
                        tpl,
                        errN: err / errLimit,
                        idx: [i, j, k],
                        d,
                        conf: Math.max(
                            0,
                            1 - (err / errLimit) * 0.7 - sizeErr * 0.6,
                        ),
                    });
                }
            }
        }
    }
    /* The rings. Three points fix exactly one circle, so for every triple
     around a point that circle is fitted; if its radius is in range of the
     templates, the points that also lie on that circle are collected. Five
     of them make a candidate.

     Walking all fives would be hopeless at a table with twenty fingers (at
     24 points over 40,000 per frame); via the circle it stays a handful per
     point. The search point itself is always in the triple: every ring
     contains its own lowest point, and the other four lie within one
     diameter of it, so nothing is lost. */
    if (rings.length || slotted.length) {
        const radii = [...rings, ...slotted].map(tplRing);
        const rMin = Math.min(...radii) * pxPerMM * 0.72;
        const rMax = Math.max(...radii) * pxPerMM * 1.3;
        const seen = new Set<string>(),
            reach = 2 * rMax * 1.12;
        for (let i = 0; i < points.length; i++) {
            const cx = Math.floor(points[i].x / cell),
                cy = Math.floor(points[i].y / cell);
            const nb: number[] = [];
            for (let dx = -1; dx <= 1; dx++)
                for (let dy = -1; dy <= 1; dy++) {
                    const bucket = grid.get(cx + dx + ":" + (cy + dy));
                    if (!bucket) continue;
                    for (const j of bucket)
                        if (j !== i && dist(points[i], points[j]) <= reach)
                            nb.push(j);
                }
            if (nb.length < Math.min(4, CFG.slotMinFeet - 1)) continue;
            /* With many fingers on the glass we only look at the eleven
             nearest points: the feet of the same puck always lie closer
             than the rest of the table. */
            nb.sort(
                (a, b) =>
                    dist(points[i], points[a]) - dist(points[i], points[b]),
            );
            const near = nb.slice(0, 11);
            for (let a = 0; a < near.length; a++)
                for (let b = a + 1; b < near.length; b++) {
                    const fit = fitCircle([
                        points[i],
                        points[near[a]],
                        points[near[b]],
                    ]);
                    if (!fit || fit.r < rMin || fit.r > rMax) continue;
                    let on = [i, ...near].filter(
                        (k) =>
                            Math.abs(
                                Math.hypot(
                                    points[k].x - fit.cx,
                                    points[k].y - fit.cy,
                                ) - fit.r,
                            ) <
                            fit.r * 0.16,
                    );
                    if (on.length < Math.min(5, CFG.slotMinFeet)) continue;
                    /* Cleanest first: whoever lies closest to the fitted
                     circle is most likely a foot. Both searches below take
                     their points from the front of this list. */
                    const offCircle = (k: number): number =>
                        Math.abs(
                            Math.hypot(
                                points[k].x - fit.cx,
                                points[k].y - fit.cy,
                            ) - fit.r,
                        );
                    on.sort((a2, b2) => offCircle(a2) - offCircle(b2));
                    /* ── The grid code ─────────────────────────────
                     A grid puck is not a five out of the points on this
                     circle but all of them at once: which slots are
                     occupied is the puck. So no combinations here -- one
                     circle is one candidate, and a stray finger becomes an
                     `extra` that `matchSlots` is allowed to forgive. */
                    if (slotted.length && on.length >= CFG.slotMinFeet) {
                        const group = on.slice(0, 9);
                        const key =
                            "s" + [...group].sort((x, y) => x - y).join(",");
                        const uid = group
                            .map((k) => points[k].uid)
                            .find((u) => u !== undefined);
                        if (
                            !seen.has(key) &&
                            !(
                                uid !== undefined &&
                                group.some((k) => points[k].uid !== uid)
                            )
                        ) {
                            seen.add(key);
                            for (const n of slotCounts) {
                                const d = describeSlots(
                                    group.map((k) => points[k]),
                                    n,
                                );
                                if (
                                    !d ||
                                    d.spread > 0.16 ||
                                    d.snap > CFG.slotSnapDeg ||
                                    d.dup
                                )
                                    continue;
                                /* Size first, then the code: the ring is a
                                 feature of its own here. Only what fits
                                 the measured circle competes, and among
                                 those the best code has to beat the
                                 runner-up by `slotMarginBits`. */
                                const fits = slotted
                                    .filter((tpl) => tplSlots(tpl) === n)
                                    .map((tpl) => ({
                                        tpl,
                                        m: matchSlots(d, tpl),
                                        se: sizeErr(
                                            d.radius,
                                            tplRing(tpl),
                                            pxPerMM,
                                        ),
                                        tracked: onTable.has(tpl.id),
                                    }))
                                    .filter(
                                        (g) =>
                                            g.se <=
                                                (g.tracked
                                                    ? CFG.slotSizeTolTracked
                                                    : CFG.slotSizeTol) &&
                                            g.m.err <=
                                                CFG.slotErrMax +
                                                    (g.tracked ? 1 : 0) &&
                                            g.m.miss <=
                                                CFG.slotMissMax +
                                                    (g.tracked ? 1 : 0) &&
                                            g.m.extra <= CFG.slotExtraMax,
                                    )
                                    .sort(
                                        (a2, b2) =>
                                            a2.m.err - b2.m.err ||
                                            a2.se - b2.se,
                                    );
                                const win = fits[0],
                                    second = fits[1];
                                if (!win) continue;
                                if (
                                    second &&
                                    second.m.err - win.m.err <
                                        CFG.slotMarginBits
                                )
                                    continue;
                                const limit = CFG.slotErrMax + 1;
                                cands.push({
                                    tpl: win.tpl,
                                    errN: win.m.err / limit,
                                    idx: group.slice(),
                                    d: { ...d, angle: win.m.angle },
                                    conf: Math.max(
                                        0,
                                        1 -
                                            (win.m.err / limit) * 0.7 -
                                            win.se * 0.6,
                                    ),
                                });
                                break;
                            }
                        }
                    }
                    /* A loose finger can lie on the same circle -- a hand
                     resting next to the puck does exactly that. Then there
                     are six or seven, and every five out of them is tried;
                     the puck isn't lost because someone leans on the glass.
                     More than seven points on one circle is no longer a
                     puck, and the seven cleanest remain. */
                    if (on.length > 7) on = on.slice(0, 7);
                    for (const group of rings.length ? pick5(on) : []) {
                        /* Same rule as for the triangles: points of two
                         drag copies never form one puck. */
                        const uid = group
                            .map((k) => points[k].uid)
                            .find((u) => u !== undefined);
                        if (
                            uid !== undefined &&
                            group.some((k) => points[k].uid !== uid)
                        )
                            continue;
                        /* The same five is found from each of its points;
                         the key must not depend on the order. */
                        const key = group.join(",");
                        if (seen.has(key)) continue;
                        seen.add(key);
                        const d = describeRing(group.map((k) => points[k]));
                        if (!d || d.spread > 0.16) continue;
                        /* One five is one puck, not four candidates.
                         Earlier every template within the limit could join,
                         and with noise on the feet the wrong one sometimes
                         came out first. That is not just a wrong label: a
                         detection with another template never belongs to
                         the existing track (see `track`), so the puck
                         blinked away and came back as a different puck. Now
                         only the best fit is put forward, and only if it
                         fits `ringMarginDeg` better than the runner-up. Any
                         closer than that and the measurement is ambiguous,
                         and the table would rather say nothing. */
                        const all = rings
                            .map((tpl) => ({ tpl, m: matchRing(d, tpl) }))
                            .sort((a2, b2) => a2.m.err - b2.m.err);
                        noteRingDiag(d, all);
                        /* The diameter counts before the choice, not after
                         it. A ring that is clearly too small or too large
                         is a different puck, so it must not first win the
                         angle comparison and then be rejected on size --
                         that used to make the runner-up disappear along
                         with it and the puck fall silent. */
                        const measured = all.filter(
                            (g) =>
                                sizeErr(d.radius, tplRing(g.tpl), pxPerMM) <=
                                (onTable.has(g.tpl.id)
                                    ? CFG.ringSizeTolTracked
                                    : CFG.ringSizeTol),
                        );
                        const win = measured[0],
                            second = measured[1];
                        if (!win) continue;
                        if (
                            second &&
                            second.m.err - win.m.err < CFG.ringMarginDeg
                        )
                            continue;
                        const tpl = win.tpl,
                            m = win.m,
                            tracked = onTable.has(tpl.id);
                        const limit =
                            CFG.ringToleranceDeg * (tracked ? 1.25 : 1);
                        if (m.err > limit) continue;
                        const se = sizeErr(d.radius, tplRing(tpl), pxPerMM);
                        const shape: RingShape = { ...d, angle: m.angle };
                        cands.push({
                            tpl,
                            errN: m.err / limit,
                            idx: group.slice(),
                            d: shape,
                            conf: Math.max(
                                0,
                                1 - (m.err / limit) * 0.7 - se * 0.6,
                            ),
                        });
                    }
                }
        }
    }
    /* The same template may be chosen more than once: two people each with
     a Problem puck is an ordinary table. What still rules a candidate out:

       - contact points that already belong to another puck;
       - a centroid within `puckSepPX()` of an already chosen puck. Two
         discs cannot lie on top of each other, so such a triangle runs
         straight across two pucks and is a ghost.

     The order also weighs who was already there: a candidate that continues
     a puck beats a ghost triangle with a slightly smaller error. Without
     that, two pucks next to each other took turns being "the best" and
     blinked away frame by frame. */
    cands.push(...duoBootstrap(points, list));
    const sep = puckSepPX();
    const continues = (c: PuckCandidate): boolean =>
        [...tracks.map.values()].some(
            (t) =>
                t.tpl.id === c.tpl.id &&
                Math.hypot(t.x - c.d.cx, t.y - c.d.cy) < sep,
        );
    /* A triangle's error is a ratio and a ring's is in degrees. Both are
     divided by their own tolerance (`errN`: 0 is exact, 1 is just inside),
     so they compete fairly for the same points. Half a tolerance of a head
     start for whoever continues a puck. */
    for (const c of cands) c.score = c.errN - (continues(c) ? 0.5 : 0);
    cands.sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
    const used = new Set<number>(),
        out: Detection[] = [];
    for (const c of cands) {
        if (c.idx.some((i) => used.has(i))) continue;
        // Except for the duo: those two belong on top of each other.
        if (
            out.some(
                (o) =>
                    Math.hypot(o.x - c.d.cx, o.y - c.d.cy) < sep &&
                    !mayOverlap(o.tpl, c.tpl),
            )
        )
            continue;
        c.idx.forEach((i) => used.add(i));
        out.push({
            tpl: c.tpl,
            conf: c.conf,
            x: c.d.cx,
            y: c.d.cy,
            angle: c.d.ring
                ? (c.d.angle ?? 0)
                : Math.atan2(c.d.anchor.y - c.d.cy, c.d.anchor.x - c.d.cx),
        });
    }
    /* ── Holding on with four feet ────────────────────────────────
     A puck already on the table doesn't have to be proven again every
     frame. If one foot briefly loses contact, the other four still lie
     neatly on its circle; those are laid against its own template, at its
     own spot. That keeps the puck in place instead of blinking, and because
     only one template joins in it cannot change identity while doing so.
     For a puck that wasn't there yet this doesn't happen: four points say
     too little to open a new puck with.

     Not while learning: that window passes its own, shorter list of
     templates and only wants to subtract learned pucks from the glass. */
    for (const t of tpls ? [] : tracks.map.values()) {
        if (!isRing(t.tpl)) continue;
        if (
            out.some(
                (o) =>
                    Math.hypot(o.x - t.x, o.y - t.y) < sep &&
                    !mayOverlap(o.tpl, t.tpl),
            )
        )
            continue;
        const want = tplRing(t.tpl) * pxPerMM,
            close: number[] = [];
        for (let i = 0; i < points.length; i++) {
            if (used.has(i)) continue;
            const r = Math.hypot(points[i].x - t.x, points[i].y - t.y);
            if (r >= want * 0.55 && r <= want * 1.45) close.push(i);
        }
        if (close.length < 4) continue;
        // The points nearest to its circle go first.
        const off = (i: number): number =>
            Math.abs(Math.hypot(points[i].x - t.x, points[i].y - t.y) - want);
        close.sort((a, b) => off(a) - off(b));
        const group = close.slice(0, 5);
        const tryThese =
            group.length === 5 ? [group, ...pick4(group)] : [group];
        for (const g of tryThese) {
            const d = describeRing(g.map((k) => points[k]));
            if (!d || d.spread > 0.2) continue;
            if (Math.abs(d.radius - want) / want > 0.3) continue;
            if (Math.hypot(d.cx - t.x, d.cy - t.y) > sep) continue;
            const m = matchRing(d, t.tpl);
            if (m.err > CFG.ringHoldDeg) continue;
            g.forEach((i) => used.add(i));
            out.push({
                tpl: t.tpl,
                conf: 0.4,
                x: d.cx,
                y: d.cy,
                angle: m.angle,
                held: true,
            });
            break;
        }
    }
    /* The same for a grid puck: only its own code joins in, so it cannot
     change identity while holding on, and one slot may go missing
     (`slotHoldBits`). What it may not do is drift: the circle has to sit
     where the puck was. */
    for (const t of tpls ? [] : tracks.map.values()) {
        if (!isSlotted(t.tpl)) continue;
        if (
            out.some(
                (o) =>
                    Math.hypot(o.x - t.x, o.y - t.y) < sep &&
                    !mayOverlap(o.tpl, t.tpl),
            )
        )
            continue;
        const want = tplRing(t.tpl) * pxPerMM,
            close: number[] = [];
        for (let i = 0; i < points.length; i++) {
            if (used.has(i)) continue;
            const r = Math.hypot(points[i].x - t.x, points[i].y - t.y);
            if (r >= want * 0.6 && r <= want * 1.4) close.push(i);
        }
        if (close.length < CFG.slotMinFeet) continue;
        const off = (i: number): number =>
            Math.abs(Math.hypot(points[i].x - t.x, points[i].y - t.y) - want);
        close.sort((a, b) => off(a) - off(b));
        const group = close.slice(0, 9);
        const d = describeSlots(
            group.map((k) => points[k]),
            tplSlots(t.tpl),
        );
        if (!d || d.spread > 0.2 || d.snap > CFG.slotSnapDeg * 1.3 || d.dup)
            continue;
        if (
            sizeErr(d.radius, tplRing(t.tpl), pxPerMM) > CFG.slotSizeTolTracked
        )
            continue;
        if (Math.hypot(d.cx - t.x, d.cy - t.y) > sep) continue;
        const m = matchSlots(d, t.tpl);
        if (m.err > CFG.slotHoldBits) continue;
        group.forEach((i) => used.add(i));
        out.push({
            tpl: t.tpl,
            conf: 0.4,
            x: d.cx,
            y: d.cy,
            angle: m.angle,
            held: true,
        });
    }
    return { pucks: out, usedIdx: used };
}
