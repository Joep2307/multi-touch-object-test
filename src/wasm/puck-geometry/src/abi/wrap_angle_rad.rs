//! [`crate::wrap_angle`] across the boundary.

use crate::wrap_angle::wrap_angle;

#[no_mangle]
pub extern "C" fn wrap_angle_rad(a: f64) -> f64 {
    wrap_angle(a)
}
