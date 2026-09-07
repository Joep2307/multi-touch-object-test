//! [`crate::describe`] across the boundary.

use crate::abi::buffers::out_ptr;
use crate::abi::layout::DESCRIBE_LEN;
use crate::describe::describe;
use crate::pt::Pt;

/// Describe one triangle; the result is written into `out` (see `DESCRIBE_LEN`).
/// Returns 0 if the triangle is too small, otherwise 1.
#[no_mangle]
pub extern "C" fn describe_triangle(x1: f64, y1: f64, x2: f64, y2: f64, x3: f64, y3: f64) -> u32 {
    match describe(Pt::new(x1, y1), Pt::new(x2, y2), Pt::new(x3, y3)) {
        None => 0,
        Some(s) => {
            let out = unsafe { std::slice::from_raw_parts_mut(out_ptr(), DESCRIBE_LEN) };
            out.copy_from_slice(&[s.ratios[0], s.ratios[1], s.longest, s.anchor.x, s.anchor.y, s.chir, s.cx, s.cy]);
            1
        }
    }
}
