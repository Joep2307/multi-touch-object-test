//! A triangle that matches a template, while the final choice hasn't been made yet.

use crate::pt::Pt;

#[derive(Clone, Copy)]
pub struct Cand {
    pub tpl: usize,
    pub err: f64,
    pub idx: [usize; 3],
    pub cx: f64,
    pub cy: f64,
    pub anchor: Pt,
    pub conf: f64,
    pub score: f64,
}
