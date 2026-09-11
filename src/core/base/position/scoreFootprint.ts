import { CONFIDENCE_MIN } from "./constants";
import type { CentreFit } from "./CentreFit";
import type { FootprintSpec } from "../FootprintSpec";
import type { PositionPolicy } from "./PositionPolicy";

/* How well does this reading fit this footprint?
 *
 * Three independent judgements rather than one threshold, because the
 * three failures are different and a single number cannot tell them
 * apart: too few feet, feet at the wrong distance for this kind, and
 * feet that do not agree with each other. Multiplying means any one of
 * them being bad is enough to distrust the reading — which is what is
 * wanted, since a hand with three fingers at roughly the right spread
 * should not become a puck because two of the three checks passed.
 *
 * `shapeConfidence` is the part that does **not** depend on the screen
 * scale. `PxPerMMEstimator` is gated on it, and it has to be, because
 * gating the estimator on the full confidence deadlocks: a seed a few
 * per cent off makes every reading score low, which makes the
 * estimator ignore every reading, which leaves the seed wrong forever.
 *
 * One function rather than a method on `Position`, because two things
 * ask this question. `Position` asks it of the footprint it is already
 * measuring; `matchSignature` asks it of each of a kind's signatures
 * to find out which one is being looked at. Two copies would drift,
 * and a matcher scoring differently from the trait it feeds would pick
 * a signature the trait then reads badly.
 */
export type FootprintScore = {
    readonly confidence: number;
    readonly shapeConfidence: number;
};

export function scoreFootprint(
    fit: CentreFit,
    contactCount: number,
    spec: FootprintSpec,
    pxPerMM: number,
    policy: PositionPolicy,
): FootprintScore {
    const countScore = clamp01(contactCount / Math.max(1, spec.expectedCount));
    const shapeConfidence = countScore * shapeScore(fit, spec, policy);
    return {
        shapeConfidence,
        confidence: shapeConfidence * sizeScore(fit, spec, pxPerMM, policy),
    };
}

/* Are the feet arranged like this kind? Compared as a **ratio** —
   spread over radius — so the answer holds whatever the screen scale
   turns out to be.

   The spread is scored against the kind's *inherent* spread rather
   than against zero. Zero is right for a ring and for an equilateral
   triad, but an equilateral triad has no distinguishable nose, so the
   standard three-point footprint is deliberately asymmetric and its
   feet genuinely do sit at different distances from the centroid.
   Scoring that against zero punished exactly the asymmetry the heading
   needs. */
function shapeScore(
    fit: CentreFit,
    spec: FootprintSpec,
    policy: PositionPolicy,
): number {
    if (fit.radiusPX <= 0) return CONFIDENCE_MIN;
    const measured = fit.residualPX / fit.radiusPX;
    const radiusMM = spec.footRadiusMM;
    const expected =
        radiusMM > 0 ? (spec.footRadiusSpreadMM ?? 0) / radiusMM : 0;
    return clamp01(1 - Math.abs(measured - expected) / policy.shapeTolerance);
}

/* Is what we measured the right size for this kind? Size is a
   recognition feature in its own right: two pucks with the same
   pattern but a different ring are two different pucks, and checking
   size before the best fit wins is what stops a look-alike silencing
   the real one. */
function sizeScore(
    fit: CentreFit,
    spec: FootprintSpec,
    pxPerMM: number,
    policy: PositionPolicy,
): number {
    const expectedPX = spec.footRadiusMM * pxPerMM;
    if (expectedPX <= 0) return CONFIDENCE_MIN;
    const off = Math.abs(fit.radiusPX - expectedPX) / expectedPX;
    return clamp01(1 - off / policy.sizeTolerance);
}

function clamp01(v: number): number {
    if (Number.isNaN(v)) return 0;
    return Math.min(1, Math.max(0, v));
}
