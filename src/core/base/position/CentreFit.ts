import type { Vec2 } from "../Vec2";

/* What a `CentreSolver` measured: where the middle is, how far the
   feet sit from it, and how well they actually agreed.
 *
 * `residualPX` is the part that earns its place. A middle point on its
 * own can always be produced — three arbitrary fingers have a
 * centroid too. The residual is what says whether those points look like the
 * feet of an object or like a hand resting on the glass, and it is
 * what `Position` turns into confidence.
 */
export type CentreFit = {
    readonly centre: Vec2;
    readonly radiusPX: number;
    readonly residualPX: number;
};
