//! A puck that was already there last time.

/// A puck that was already there: kind (index into the template list) and position.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct TrackIn {
    pub tpl: usize,
    pub x: f64,
    pub y: f64,
}
