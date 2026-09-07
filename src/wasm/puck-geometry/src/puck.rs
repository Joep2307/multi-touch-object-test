//! A recognised puck.

/// A recognised puck.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Puck {
    pub tpl: usize,
    pub x: f64,
    pub y: f64,
    /// Direction from centroid to nose, in radians.
    pub angle: f64,
    pub conf: f64,
    /// The three contact points (indices into the input).
    pub idx: [usize; 3],
}
