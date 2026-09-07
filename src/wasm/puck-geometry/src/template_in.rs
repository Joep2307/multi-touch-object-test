//! A template to match against.

/// A template to match against. `tracked` means: a puck of this kind is
/// already on the table, and it gets a bit more leeway.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct TemplateIn {
    pub r0: f64,
    pub r1: f64,
    pub longest_px: f64,
    pub tracked: bool,
}
