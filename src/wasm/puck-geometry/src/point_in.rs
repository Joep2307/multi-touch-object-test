//! A contact point as it enters recognition.

/// A contact point. `uid` is the number of the drag copy this point belongs
/// to, or `None` for a real touch. Points from two different copies never
/// form a puck together.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PointIn {
    pub x: f64,
    pub y: f64,
    pub uid: Option<i64>,
}
