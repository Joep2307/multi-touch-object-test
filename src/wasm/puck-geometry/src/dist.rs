//! Distance between two points.

use crate::pt::Pt;

/// Distance between two points.
pub fn dist(a: Pt, b: Pt) -> f64 {
    (a.x - b.x).hypot(a.y - b.y)
}
