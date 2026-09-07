//! The bridge to the browser.
//!
//! Fixed buffers in linear memory. No allocator across the boundary, no
//! strings, no wasm-bindgen: the TypeScript side creates Float64Array views
//! at these addresses, writes into `points`/`templates`/`tracks`, calls
//! [`recognise_pucks`] and reads `out` and `used` back.

mod buffers;
mod describe_triangle;
mod layout;
mod pads_for_template;
mod recognise_pucks;
mod wrap_angle_rad;

pub use buffers::{max_out, max_points, max_templates, max_tracks, out_ptr, points_ptr, templates_ptr, tracks_ptr, used_ptr};
pub use describe_triangle::describe_triangle;
pub use layout::{
    DESCRIBE_LEN, MAX_OUT, MAX_POINTS, MAX_TEMPLATES, MAX_TRACKS, OUT_STRIDE, PADS_LEN, POINT_STRIDE, TEMPLATE_STRIDE,
    TRACK_STRIDE,
};
pub use pads_for_template::pads_for_template;
pub use recognise_pucks::recognise_pucks;
pub use wrap_angle_rad::wrap_angle_rad;
