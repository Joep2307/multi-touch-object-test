//! What one triangle says about itself.

mod common;
use common::{close, EPS, RATIOS};

use puck_geometry::{describe, pads_for, wrap_angle, Pt};

#[test]
fn describe_reads_ratios_back_from_pads() {
    for (r0, r1) in RATIOS {
        let p = pads_for(r0, r1, 240.0);
        let s = describe(p[0], p[1], p[2]).expect("geen gedegenereerde driehoek");
        assert!(close(s.ratios[0], r0), "{r0} vs {}", s.ratios[0]);
        assert!(close(s.ratios[1], r1), "{r1} vs {}", s.ratios[1]);
        assert!(close(s.longest, 240.0));
        // Placed around the centroid, so that lies at zero.
        assert!(s.cx.abs() < EPS && s.cy.abs() < EPS);
        // The nose is the point opposite the longest side: the third pad.
        assert_eq!(s.anchor, p[2]);
    }
}

#[test]
fn describe_rejects_a_dot() {
    assert_eq!(describe(Pt::new(1.0, 1.0), Pt::new(1.2, 1.0), Pt::new(1.0, 1.3)), None);
}

#[test]
fn describe_is_independent_of_point_order() {
    let p = pads_for(0.62, 0.81, 240.0);
    let a = describe(p[0], p[1], p[2]).unwrap();
    let b = describe(p[2], p[0], p[1]).unwrap();
    let c = describe(p[1], p[2], p[0]).unwrap();
    for s in [b, c] {
        assert!(close(a.ratios[0], s.ratios[0]) && close(a.ratios[1], s.ratios[1]));
        assert_eq!(a.anchor, s.anchor);
    }
}

#[test]
fn wrap_angle_takes_the_short_way() {
    use std::f64::consts::PI;
    assert!(close(wrap_angle(PI * 1.5), -PI * 0.5));
    assert!(close(wrap_angle(-PI * 1.5), PI * 0.5));
    assert!(close(wrap_angle(0.3), 0.3));
}
