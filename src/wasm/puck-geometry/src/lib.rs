//! Where a puck is, and how it's rotated.
//!
//! Three bits of copper foil in a triangle make a puck; the touchscreen only
//! sees loose contact points. This crate does the work that turns those
//! points back into pucks:
//!
//! * [`describe`] — one triangle: side ratios, longest side, which vertex is
//!   the "nose", and the centroid.
//! * [`pads_for`] — the reverse: from a template's ratios, the three pad
//!   positions around the center (for drag copies and the build drawing).
//! * [`recognise`] — all contact points at once: which triangles match which
//!   template, which of those are real and which are ghosts straddling two
//!   pucks, and the position and angle per puck.
//!
//! The functions are pure. The only state is the fixed buffers in [`abi`],
//! through which the browser shuffles numbers back and forth without
//! wasm-bindgen. The layout of those buffers also lives in
//! `src/puck/geometry/LAYOUT.ts`; change `abi/layout.rs`, change that too.
//!
//! Everything computes in screen pixels; millimeters are the caller's concern.
//!
//! One thing per file: this file only brings them together.

// `addr_of_mut!` on a `static mut` no longer needs `unsafe` since Rust 1.82;
// on an older compiler it does. The block stays, the warning doesn't.
#![allow(unused_unsafe)]

mod abi;
mod cand;
mod describe;
mod dist;
mod pads_for;
mod point_in;
mod pt;
mod puck;
mod recognise;
mod shape;
mod template_in;
mod track_in;
mod wrap_angle;

pub use abi::*;
pub use describe::describe;
pub use dist::dist;
pub use pads_for::pads_for;
pub use point_in::PointIn;
pub use pt::Pt;
pub use puck::Puck;
pub use recognise::recognise;
pub use shape::Shape;
pub use template_in::TemplateIn;
pub use track_in::TrackIn;
pub use wrap_angle::wrap_angle;
