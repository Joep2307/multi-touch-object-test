/* How far the table is allowed to talk itself into a new screen scale.

   A puck of a known size is a ruler lying on the glass: the fit measures
   it in pixels, the build drawing says what it is in millimetres, and the
   two divided are what one pixel is worth. `screenDiagIn` only has to be
   close enough to be corrected from there.

   `maxDrift` is the guard that makes that safe. An estimator with no clamp
   follows a bad reading -- a palm that happened to fit a circle, a puck
   half off the edge -- and once the scale is wrong every ring on the table
   is wrong with it. Twelve per cent is wide enough for a mis-declared
   screen and far too narrow for nonsense; it is the same figure as
   `PxPerMMPolicy.maxDrift` in the core, which does this per object and
   will take the job over.

   `smoothing` is the weight of one reading. Low, because sixty of them
   arrive every second and none of them is urgent. `minConf` keeps fingers
   out of it, and `minMM` keeps a very short known length from amplifying
   its own measurement noise. */
export const SCALE = {
    smoothing: 0.02,
    maxDrift: 0.12,
    minConf: 0.8,
    minMM: 10,
};
