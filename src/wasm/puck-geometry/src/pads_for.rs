//! The reverse: from a template's ratios, the three pad positions.

use crate::pt::Pt;

/// The three pads of a template with ratios `r0`/`r1` and longest side
/// `longest`, around the centroid. The longest side lies along the x-axis;
/// the third point follows from the law of cosines.
pub fn pads_for(r0: f64, r1: f64, longest: f64) -> [Pt; 3] {
    let (a, b, c) = (r0 * longest, r1 * longest, longest);
    let rx = (c * c + b * b - a * a) / (2.0 * c);
    let ry = (b * b - rx * rx).max(0.0).sqrt();
    let pts = [Pt::new(0.0, 0.0), Pt::new(c, 0.0), Pt::new(rx, ry)];
    let cx = (pts[0].x + pts[1].x + pts[2].x) / 3.0;
    let cy = (pts[0].y + pts[1].y + pts[2].y) / 3.0;
    [
        Pt::new(pts[0].x - cx, pts[0].y - cy),
        Pt::new(pts[1].x - cx, pts[1].y - cy),
        Pt::new(pts[2].x - cx, pts[2].y - cy),
    ]
}
