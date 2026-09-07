//! What the tests have in common: placing a puck, and the four templates.

use puck_geometry::{pads_for, PointIn, TemplateIn};

pub const EPS: f64 = 1e-9;

pub fn close(a: f64, b: f64) -> bool {
    (a - b).abs() < 1e-6
}

/// The pads of a template, moved and rotated — exactly what `simPads()`
/// does in the app.
pub fn place(r0: f64, r1: f64, longest: f64, x: f64, y: f64, rot: f64, uid: Option<i64>) -> Vec<PointIn> {
    let (c, s) = (rot.cos(), rot.sin());
    pads_for(r0, r1, longest)
        .iter()
        .map(|p| PointIn { x: x + p.x * c - p.y * s, y: y + p.x * s + p.y * c, uid })
        .collect()
}

/// The four from the build drawing, longest side 60 mm at 4 px/mm.
pub const RATIOS: [(f64, f64); 4] = [(0.62, 0.81), (0.48, 0.76), (0.70, 0.93), (0.85, 0.90)];

pub fn templates() -> Vec<TemplateIn> {
    RATIOS
        .iter()
        .map(|&(r0, r1)| TemplateIn { r0, r1, longest_px: 240.0, tracked: false })
        .collect()
}
