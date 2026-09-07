//! One triangle: ratios, longest side, nose, and centroid.

use std::cmp::Ordering;

use crate::dist::dist;
use crate::pt::Pt;
use crate::shape::Shape;

/// Describe the triangle `p1 p2 p3`. `None` if it's too small to say
/// anything about (longest side under one pixel).
///
/// The endpoints of the longest side are ordered so that `P` is the one
/// closest to the nose; its cross product gives the chirality. The order of
/// sides with equal length keeps that of the input (stable sort), same as
/// the JavaScript version this was ported from.
pub fn describe(p1: Pt, p2: Pt, p3: Pt) -> Option<Shape> {
    // (length, a, b, opposite vertex)
    let mut e = [
        (dist(p1, p2), p1, p2, p3),
        (dist(p2, p3), p2, p3, p1),
        (dist(p3, p1), p3, p1, p2),
    ];
    e.sort_by(|x, y| x.0.partial_cmp(&y.0).unwrap_or(Ordering::Equal));
    let (long, mut p, mut q, anchor) = e[2];
    if long < 1.0 {
        return None;
    }
    if dist(q, anchor) < dist(p, anchor) {
        std::mem::swap(&mut p, &mut q);
    }
    let cross = (q.x - p.x) * (anchor.y - p.y) - (q.y - p.y) * (anchor.x - p.x);
    Some(Shape {
        ratios: [e[0].0 / long, e[1].0 / long],
        longest: long,
        anchor,
        chir: if cross >= 0.0 { 1.0 } else { -1.0 },
        cx: (p1.x + p2.x + p3.x) / 3.0,
        cy: (p1.y + p2.y + p3.y) / 3.0,
    })
}
