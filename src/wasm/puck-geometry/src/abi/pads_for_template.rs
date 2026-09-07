//! [`crate::pads_for`] across the boundary.

use crate::abi::buffers::out_ptr;
use crate::abi::layout::PADS_LEN;
use crate::pads_for::pads_for;

/// The three pads of a template; the result is written into `out` (see `PADS_LEN`).
#[no_mangle]
pub extern "C" fn pads_for_template(r0: f64, r1: f64, longest: f64) {
    let p = pads_for(r0, r1, longest);
    let out = unsafe { std::slice::from_raw_parts_mut(out_ptr(), PADS_LEN) };
    out.copy_from_slice(&[p[0].x, p[0].y, p[1].x, p[1].y, p[2].x, p[2].y]);
}
