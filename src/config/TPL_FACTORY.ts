import type { Template } from "../types";

/* The factory default: the four pucks from the build drawing, plus the duo.

   The angles are chosen so that no puck resembles itself when you turn it
   one foot further (otherwise the front swaps every frame and the ring menu
   stalls) and so that the four differ by at least 14 degrees per gap --
   well above the noise of a 2 mm foot. The arrow points into the middle of
   the largest gap, so no foot stands in front of it; angle 0 is that arrow.

   ── The duo ──────────────────────────────────────────────────────
   Two pucks that fit into each other: a small disc in the hole of an
   ordinary puck, each with three contact points, sharing one centre. They
   are one object with two knobs -- the outer one turns up the themes, the
   inner one the tools -- and you can pull them apart to measure the
   distance between two places.

   They stand here as the fifth and sixth puck and displace no one. The two
   triangles differ mainly in size: the inner one is about half as big. That
   difference is no borderline case for the recognition, and it is exactly
   what gives the table permission to let them lie on top of each other --
   see `mayOverlap`. The sizes below are the build drawing; "Learn puck"
   measures the real ones.

   A puck you learn at the table overwrites the shape of one of these -- so
   the number of pucks never changes through measuring. This original stays
   in place, so that "Clear measurements" has something to revert to. */
export const TPL_FACTORY: readonly Template[] = [
    {
        id: "puck-01",
        angles: [54, 124, 206, 250, 306],
        ringMM: 34,
        verdict: "good",
    },
    {
        id: "puck-02",
        angles: [56, 100, 168, 218, 304],
        ringMM: 34,
        verdict: "bad",
    },
    {
        id: "puck-03",
        angles: [52, 120, 166, 210, 308],
        ringMM: 34,
        verdict: "talk",
    },
    {
        id: "puck-04",
        angles: [53, 99, 195, 263, 307],
        ringMM: 34,
        verdict: "idea",
    },
    {
        id: "puck-05",
        ratios: [0.68, 0.91],
        longestMM: 62,
        verdict: "good",
        nest: true,
        nameKey: "duoTheme",
    },
    {
        id: "puck-06",
        ratios: [0.6, 0.82],
        longestMM: 30,
        verdict: "good",
        nest: true,
        role: "tool",
        nameKey: "duoTool",
        color: "#7fb2ff",
        radiusMM: 26,
    },
];
