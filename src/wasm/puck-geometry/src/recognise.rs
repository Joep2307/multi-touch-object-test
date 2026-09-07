//! All contact points at once: which triangles are pucks.

use std::cmp::Ordering;

use crate::cand::Cand;
use crate::describe::describe;
use crate::dist::dist;
use crate::point_in::PointIn;
use crate::pt::Pt;
use crate::puck::Puck;
use crate::template_in::TemplateIn;
use crate::track_in::TrackIn;

/// Recognise pucks in a cloud of contact points.
///
/// * `tolerance` — how much the side ratios may deviate (CFG.tolerance).
/// * `sep` — how close two pucks may lie to each other (`puckSepPX`).
/// * `max_span` — further apart than this is never one puck.
///
/// `used[i]` becomes `true` for every point that ends up in a chosen puck.
/// The result is written to `out`, in order of confidence.
///
/// The triple loop doesn't iterate over *all* combinations: for each point,
/// its neighbours within `max_span` are collected first, and only those feed
/// the triangles. That gives the same outcome as a grid of cells sized to
/// the longest puck side, in the same order — and that order matters,
/// because on equal scores whoever came first wins.
pub fn recognise(
    points: &[PointIn],
    templates: &[TemplateIn],
    tracks: &[TrackIn],
    tolerance: f64,
    sep: f64,
    max_span: f64,
    out: &mut Vec<Puck>,
    used: &mut [bool],
) {
    out.clear();
    for u in used.iter_mut() {
        *u = false;
    }
    let n = points.len();
    let pt = |i: usize| Pt::new(points[i].x, points[i].y);

    let mut cands: Vec<Cand> = Vec::new();
    let mut near: Vec<usize> = Vec::new();
    for i in 0..n {
        near.clear();
        for j in (i + 1)..n {
            if dist(pt(i), pt(j)) <= max_span {
                near.push(j);
            }
        }
        for a in 0..near.len() {
            let j = near[a];
            for b in (a + 1)..near.len() {
                let k = near[b];
                if dist(pt(i), pt(k)) > max_span || dist(pt(j), pt(k)) > max_span {
                    continue;
                }
                // A drag copy carries its own number. Points from two
                // different pucks never form a puck together, so we skip
                // that triangle -- otherwise such a ghost triangle would
                // steal a contact point from a real puck.
                let uid = points[i].uid.or(points[j].uid).or(points[k].uid);
                if let Some(u) = uid {
                    if points[i].uid != Some(u) || points[j].uid != Some(u) || points[k].uid != Some(u) {
                        continue;
                    }
                }
                let Some(d) = describe(pt(i), pt(j), pt(k)) else { continue };
                for (t, tpl) in templates.iter().enumerate() {
                    let err = (d.ratios[0] - tpl.r0).hypot(d.ratios[1] - tpl.r1);
                    // While rotating, the measured contact points shift by a
                    // few pixels. A puck that's already being tracked
                    // therefore gets a bit of extra leeway; the initial
                    // recognition stays at the configured, strict tolerance.
                    let err_limit = if tpl.tracked { (tolerance * 1.4).min(0.14) } else { tolerance };
                    if err > err_limit {
                        continue;
                    }
                    let want = tpl.longest_px;
                    let size_err = (d.longest - want).abs() / want;
                    if size_err > (if tpl.tracked { 0.50 } else { 0.42 }) {
                        continue;
                    }
                    cands.push(Cand {
                        tpl: t,
                        err,
                        idx: [i, j, k],
                        cx: d.cx,
                        cy: d.cy,
                        anchor: d.anchor,
                        conf: (1.0 - err / err_limit * 0.7 - size_err * 0.6).max(0.0),
                        score: 0.0,
                    });
                }
            }
        }
    }

    // The same template may be chosen multiple times: two people each with
    // a Problem puck is an ordinary table. What still rules out a candidate:
    // contact points that already belong to another puck, and a centroid
    // within `sep` of an already-chosen puck — two discs can't lie on top of
    // each other, so such a triangle is a ghost.
    //
    // The ordering also weighs in who was already there: a candidate that
    // continues a puck wins over a ghost triangle with a just slightly
    // smaller error.
    for c in cands.iter_mut() {
        let continues = tracks
            .iter()
            .any(|t| t.tpl == c.tpl && (t.x - c.cx).hypot(t.y - c.cy) < sep);
        c.score = c.err - if continues { 0.05 } else { 0.0 };
    }
    cands.sort_by(|a, b| a.score.partial_cmp(&b.score).unwrap_or(Ordering::Equal));

    for c in &cands {
        if c.idx.iter().any(|&i| used[i]) {
            continue;
        }
        if out.iter().any(|o| (o.x - c.cx).hypot(o.y - c.cy) < sep) {
            continue;
        }
        for &i in &c.idx {
            used[i] = true;
        }
        out.push(Puck {
            tpl: c.tpl,
            x: c.cx,
            y: c.cy,
            angle: (c.anchor.y - c.cy).atan2(c.anchor.x - c.cx),
            conf: c.conf,
            idx: c.idx,
        });
    }
}
