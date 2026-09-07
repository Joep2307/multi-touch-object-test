//! [`crate::recognise`] across the boundary.

use crate::abi::buffers::{out_ptr, points_ptr, templates_ptr, tracks_ptr, used_ptr};
use crate::abi::layout::{
    MAX_OUT, MAX_POINTS, MAX_TEMPLATES, MAX_TRACKS, OUT_STRIDE, POINT_STRIDE, TEMPLATE_STRIDE, TRACK_STRIDE,
};
use crate::point_in::PointIn;
use crate::recognise::recognise;
use crate::template_in::TemplateIn;
use crate::track_in::TrackIn;

/// Recognise pucks from the buffers. Returns the number of pucks in `out`.
#[no_mangle]
pub extern "C" fn recognise_pucks(
    n_points: u32,
    n_templates: u32,
    n_tracks: u32,
    tolerance: f64,
    sep: f64,
    max_span: f64,
) -> u32 {
    let n_points = (n_points as usize).min(MAX_POINTS);
    let n_templates = (n_templates as usize).min(MAX_TEMPLATES);
    let n_tracks = (n_tracks as usize).min(MAX_TRACKS);
    let (points_raw, templates_raw, tracks_raw, out_raw, used_raw) = unsafe {
        (
            std::slice::from_raw_parts(points_ptr(), n_points * POINT_STRIDE),
            std::slice::from_raw_parts(templates_ptr(), n_templates * TEMPLATE_STRIDE),
            std::slice::from_raw_parts(tracks_ptr(), n_tracks * TRACK_STRIDE),
            std::slice::from_raw_parts_mut(out_ptr(), MAX_OUT * OUT_STRIDE),
            std::slice::from_raw_parts_mut(used_ptr(), MAX_POINTS),
        )
    };
    let points: Vec<PointIn> = points_raw
        .chunks_exact(POINT_STRIDE)
        .map(|c| PointIn { x: c[0], y: c[1], uid: if c[2] < 0.0 { None } else { Some(c[2] as i64) } })
        .collect();
    let templates: Vec<TemplateIn> = templates_raw
        .chunks_exact(TEMPLATE_STRIDE)
        .map(|c| TemplateIn { r0: c[0], r1: c[1], longest_px: c[2], tracked: c[3] != 0.0 })
        .collect();
    let tracks: Vec<TrackIn> = tracks_raw
        .chunks_exact(TRACK_STRIDE)
        .filter(|c| c[0] >= 0.0)
        .map(|c| TrackIn { tpl: c[0] as usize, x: c[1], y: c[2] })
        .collect();

    let mut pucks = Vec::new();
    let mut used = vec![false; n_points];
    recognise(&points, &templates, &tracks, tolerance, sep, max_span, &mut pucks, &mut used);

    for (i, u) in used_raw.iter_mut().enumerate() {
        *u = if i < n_points && used[i] { 1 } else { 0 };
    }
    let n = pucks.len().min(MAX_OUT);
    for (i, p) in pucks.iter().take(n).enumerate() {
        let o = &mut out_raw[i * OUT_STRIDE..(i + 1) * OUT_STRIDE];
        o.copy_from_slice(&[p.tpl as f64, p.x, p.y, p.angle, p.conf, p.idx[0] as f64, p.idx[1] as f64, p.idx[2] as f64]);
    }
    n as u32
}
