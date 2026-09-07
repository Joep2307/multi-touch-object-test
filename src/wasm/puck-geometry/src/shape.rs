//! What one triangle says about itself.

use crate::pt::Pt;

/// What one triangle says about itself.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Shape {
    /// The two shorter sides divided by the longest, shortest first.
    pub ratios: [f64; 2],
    /// Length of the longest side.
    pub longest: f64,
    /// The vertex opposite the longest side: the nose of the puck.
    pub anchor: Pt,
    /// +1 or −1: which side of the longest side the nose lies on.
    pub chir: f64,
    /// Centroid.
    pub cx: f64,
    pub cy: f64,
}
