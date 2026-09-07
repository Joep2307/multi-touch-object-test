//! The buffers themselves, and the addresses at which the browser finds them.

use std::ptr::addr_of_mut;

use crate::abi::layout::{
    MAX_OUT, MAX_POINTS, MAX_TEMPLATES, MAX_TRACKS, OUT_STRIDE, POINT_STRIDE, TEMPLATE_STRIDE, TRACK_STRIDE,
};

static mut POINTS: [f64; MAX_POINTS * POINT_STRIDE] = [0.0; MAX_POINTS * POINT_STRIDE];
static mut TEMPLATES: [f64; MAX_TEMPLATES * TEMPLATE_STRIDE] = [0.0; MAX_TEMPLATES * TEMPLATE_STRIDE];
static mut TRACKS: [f64; MAX_TRACKS * TRACK_STRIDE] = [0.0; MAX_TRACKS * TRACK_STRIDE];
static mut OUT: [f64; MAX_OUT * OUT_STRIDE] = [0.0; MAX_OUT * OUT_STRIDE];
static mut USED: [u8; MAX_POINTS] = [0; MAX_POINTS];

#[no_mangle]
pub extern "C" fn points_ptr() -> *mut f64 {
    unsafe { addr_of_mut!(POINTS) as *mut f64 }
}
#[no_mangle]
pub extern "C" fn templates_ptr() -> *mut f64 {
    unsafe { addr_of_mut!(TEMPLATES) as *mut f64 }
}
#[no_mangle]
pub extern "C" fn tracks_ptr() -> *mut f64 {
    unsafe { addr_of_mut!(TRACKS) as *mut f64 }
}
#[no_mangle]
pub extern "C" fn out_ptr() -> *mut f64 {
    unsafe { addr_of_mut!(OUT) as *mut f64 }
}
#[no_mangle]
pub extern "C" fn used_ptr() -> *mut u8 {
    unsafe { addr_of_mut!(USED) as *mut u8 }
}
#[no_mangle]
pub extern "C" fn max_points() -> u32 {
    MAX_POINTS as u32
}
#[no_mangle]
pub extern "C" fn max_templates() -> u32 {
    MAX_TEMPLATES as u32
}
#[no_mangle]
pub extern "C" fn max_tracks() -> u32 {
    MAX_TRACKS as u32
}
#[no_mangle]
pub extern "C" fn max_out() -> u32 {
    MAX_OUT as u32
}
