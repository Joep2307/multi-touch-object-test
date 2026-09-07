//! Wrap an angle back into (−π, π].

/// Wrap an angle back into (−π, π]: the shortest path between two measurements.
pub fn wrap_angle(mut a: f64) -> f64 {
    let tau = std::f64::consts::PI * 2.0;
    while a > std::f64::consts::PI {
        a -= tau;
    }
    while a < -std::f64::consts::PI {
        a += tau;
    }
    a
}
