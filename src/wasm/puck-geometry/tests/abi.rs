//! The bridge to the browser: numbers in, numbers out.
//!
//! This test writes into the fixed buffers, so it lives alone in this
//! file — each test file is its own process, and within one process two
//! such tests would overwrite each other's numbers.

mod common;
use common::{close, place, templates};

use puck_geometry::{
    describe_triangle, out_ptr, points_ptr, recognise_pucks, templates_ptr, used_ptr, DESCRIBE_LEN, OUT_STRIDE,
    TEMPLATE_STRIDE,
};

#[test]
fn the_c_abi_round_trips() {
    let pts = place(0.70, 0.93, 240.0, 250.0, 250.0, 0.4, None);
    let raw = unsafe { std::slice::from_raw_parts_mut(points_ptr(), 9) };
    for (i, p) in pts.iter().enumerate() {
        raw[i * 3] = p.x;
        raw[i * 3 + 1] = p.y;
        raw[i * 3 + 2] = -1.0;
    }
    let tr = unsafe { std::slice::from_raw_parts_mut(templates_ptr(), 4 * TEMPLATE_STRIDE) };
    for (i, t) in templates().iter().enumerate() {
        tr[i * 4] = t.r0;
        tr[i * 4 + 1] = t.r1;
        tr[i * 4 + 2] = t.longest_px;
        tr[i * 4 + 3] = 0.0;
    }
    let n = recognise_pucks(3, 4, 0, 0.10, 162.0, 240.0 * 1.45);
    assert_eq!(n, 1);
    let out = unsafe { std::slice::from_raw_parts(out_ptr(), OUT_STRIDE) };
    assert_eq!(out[0] as usize, 2);
    assert!(close(out[1], 250.0) && close(out[2], 250.0));
    let used = unsafe { std::slice::from_raw_parts(used_ptr(), 3) };
    assert_eq!(used, &[1, 1, 1]);

    assert_eq!(describe_triangle(0.0, 0.0, 0.5, 0.0, 0.0, 0.5), 0);
    assert_eq!(describe_triangle(0.0, 0.0, 100.0, 0.0, 30.0, 40.0), 1);
    let d = unsafe { std::slice::from_raw_parts(out_ptr(), DESCRIBE_LEN) };
    assert!(close(d[2], 100.0));
}
