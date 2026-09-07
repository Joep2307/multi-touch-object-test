/* What the Rust crate exports; see src/wasm/puck-geometry/src/abi/. */
export interface PuckGeometryExports {
    memory: WebAssembly.Memory;
    points_ptr(): number;
    templates_ptr(): number;
    tracks_ptr(): number;
    out_ptr(): number;
    used_ptr(): number;
    max_points(): number;
    max_templates(): number;
    max_tracks(): number;
    max_out(): number;
    describe_triangle(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        x3: number,
        y3: number,
    ): number;
    pads_for_template(r0: number, r1: number, longest: number): void;
    wrap_angle_rad(a: number): number;
    recognise_pucks(
        nPoints: number,
        nTemplates: number,
        nTracks: number,
        tolerance: number,
        sep: number,
        maxSpan: number,
    ): number;
}
