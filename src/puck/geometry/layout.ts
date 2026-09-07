/* The layout of the buffers through which TypeScript and the Rust crate
   exchange numbers. The same numbers live in
   src/wasm/puck-geometry/src/abi/layout.rs; change something here, change it there too. */
export const LAYOUT = {
    MAX_POINTS: 128,
    POINT_STRIDE: 3, // x, y, uid (−1 = real touch)
    MAX_TEMPLATES: 64,
    TEMPLATE_STRIDE: 4, // r0, r1, longest side in px, tracked (0/1)
    MAX_TRACKS: 64,
    TRACK_STRIDE: 3, // template index, x, y
    MAX_OUT: 64,
    OUT_STRIDE: 8, // template index, x, y, angle, confidence, i, j, k
    DESCRIBE_LEN: 8, // r0, r1, longest, anchor-x, anchor-y, chirality, cx, cy
    PADS_LEN: 6, // x0, y0, x1, y1, x2, y2
};
