//! How much fits in the buffers, and in what order the fields sit.
//!
//! The same numbers live in `src/puck/geometry/LAYOUT.ts`; change something
//! here, change it there too.

pub const MAX_POINTS: usize = 128;
/// x, y, uid (−1 = real touch)
pub const POINT_STRIDE: usize = 3;
pub const MAX_TEMPLATES: usize = 64;
/// r0, r1, longest side in px, tracked (0/1)
pub const TEMPLATE_STRIDE: usize = 4;
pub const MAX_TRACKS: usize = 64;
/// template index, x, y
pub const TRACK_STRIDE: usize = 3;
pub const MAX_OUT: usize = 64;
/// template index, x, y, angle, confidence, i, j, k
pub const OUT_STRIDE: usize = 8;
/// describe: r0, r1, longest, anchor-x, anchor-y, chirality, cx, cy
pub const DESCRIBE_LEN: usize = 8;
/// pads_for: x0, y0, x1, y1, x2, y2
pub const PADS_LEN: usize = 6;
