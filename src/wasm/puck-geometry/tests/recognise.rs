//! From a cloud of contact points to pucks.

mod common;
use common::{close, place, templates};

use puck_geometry::{pads_for, recognise, wrap_angle};

#[test]
fn one_puck_gets_its_position_and_heading() {
    let rot = 0.7;
    let pts = place(0.48, 0.76, 240.0, 500.0, 300.0, rot, None);
    let mut out = Vec::new();
    let mut used = vec![false; 3];
    recognise(&pts, &templates(), &[], 0.10, 162.0, 240.0 * 1.45, &mut out, &mut used);
    assert_eq!(out.len(), 1);
    let p = out[0];
    assert_eq!(p.tpl, 1);
    assert!(close(p.x, 500.0) && close(p.y, 300.0));
    assert!(used.iter().all(|&u| u));
    // The angle from centroid to nose rotates along with the puck.
    let base = pads_for(0.48, 0.76, 240.0)[2];
    let want = wrap_angle(base.y.atan2(base.x) + rot);
    assert!(close(wrap_angle(p.angle - want), 0.0), "{} vs {}", p.angle, want);
    assert!(p.conf > 0.9);
}

#[test]
fn two_pucks_of_the_same_kind_are_both_found() {
    let mut pts = place(0.62, 0.81, 240.0, 300.0, 300.0, 0.2, Some(1));
    pts.extend(place(0.62, 0.81, 240.0, 900.0, 320.0, 2.1, Some(2)));
    let mut out = Vec::new();
    let mut used = vec![false; pts.len()];
    recognise(&pts, &templates(), &[], 0.10, 162.0, 240.0 * 1.45, &mut out, &mut used);
    assert_eq!(out.len(), 2);
    assert!(out.iter().all(|p| p.tpl == 0));
    let mut xs: Vec<f64> = out.iter().map(|p| p.x).collect();
    xs.sort_by(|a, b| a.partial_cmp(b).unwrap());
    assert!(close(xs[0], 300.0) && close(xs[1], 900.0));
}

#[test]
fn a_ghost_across_two_pucks_never_steals_a_point() {
    // Two real pucks (without uid) close together: the triangles that
    // straddle both lie within `sep` of a chosen puck and are rejected,
    // and no single contact point is used twice.
    let mut pts = place(0.48, 0.76, 240.0, 400.0, 400.0, 0.0, None);
    pts.extend(place(0.85, 0.90, 240.0, 640.0, 420.0, 1.0, None));
    let mut out = Vec::new();
    let mut used = vec![false; pts.len()];
    recognise(&pts, &templates(), &[], 0.10, 162.0, 240.0 * 1.45, &mut out, &mut used);
    assert_eq!(out.len(), 2);
    let mut seen = std::collections::HashSet::new();
    for p in &out {
        for i in p.idx {
            assert!(seen.insert(i), "punt {i} twee keer gebruikt");
        }
    }
    assert_eq!(seen.len(), 6);
}

#[test]
fn a_tracked_puck_is_allowed_more_slack() {
    // Ratios that sit 0.12 off the template: too far for a new puck at
    // tolerance 0.10, but within 0.14 for a puck that was already there.
    // Shifted downward, away from the other three templates — shifting
    // upward would put puck-01 (0.62/0.81) in the way.
    let pts = place(0.48 - 0.085, 0.76 - 0.085, 240.0, 500.0, 300.0, 0.0, None);
    let mut tpls = templates();
    let mut out = Vec::new();
    let mut used = vec![false; 3];
    recognise(&pts, &tpls, &[], 0.10, 162.0, 240.0 * 1.45, &mut out, &mut used);
    assert!(out.is_empty());
    tpls[1].tracked = true;
    recognise(&pts, &tpls, &[], 0.10, 162.0, 240.0 * 1.45, &mut out, &mut used);
    assert_eq!(out.len(), 1);
    assert_eq!(out[0].tpl, 1);
}

#[test]
fn mixed_uids_do_not_form_a_puck() {
    let mut pts = place(0.62, 0.81, 240.0, 300.0, 300.0, 0.0, Some(1));
    pts[2].uid = Some(2);
    let mut out = Vec::new();
    let mut used = vec![false; 3];
    recognise(&pts, &templates(), &[], 0.10, 162.0, 240.0 * 1.45, &mut out, &mut used);
    assert!(out.is_empty());
}
