import { scoreFootprint } from "../base/position/scoreFootprint";
import { solverForFamily } from "./solverForFamily";
import type { PhysicalKindDefinition } from "./PhysicalKindDefinition";
import type { PhysicalSignature } from "./PhysicalSignature";
import type { PositionPolicy } from "../base/position/PositionPolicy";
import type { SensedContact } from "../contact/SensedContact";

export type SignatureMatch = {
    readonly signature: PhysicalSignature;
    readonly confidence: number;
    /* How far ahead of the runner-up, as a fraction of the winner's
       own confidence. Zero means two of a kind's signatures explain
       these feet equally well, and picking either is a coin flip. */
    readonly margin: number;
};

/* Which of a kind's signatures is being looked at?
 *
 * Only ever *within* one kind. Deciding which **kind** a footprint is
 * belongs to the recogniser that already does it, and this plan
 * promised not to build a second one — a second opinion about that
 * question is how a table ends up with two answers and no way to tell
 * which it acted on.
 *
 * Inside a kind the question is different and much smaller: the same
 * manufactured object may be readable as three feet or as five on a
 * ring, and something has to say which reading this frame supports.
 * Scored with `scoreFootprint`, the same function `Position` uses, so
 * a signature chosen here cannot be one the trait then reads badly.
 *
 * Returns `null` when nothing scores above the floor. `margin` is
 * reported rather than judged here, because how sure is sure enough is
 * a question for whoever asked — a recogniser choosing between two
 * readings can afford less certainty than one deciding whether an
 * object is there at all.
 */
export function matchSignature(
    kind: PhysicalKindDefinition,
    points: readonly SensedContact[],
    pxPerMM: number,
    policy: PositionPolicy,
): SignatureMatch | null {
    /* Not enough feet for anything, so no signature can help. Asked
       once rather than inside the loop: it is a fact about the frame,
       not about the signature being tried. */
    if (points.length < policy.minFeet) return null;
    const scored: { signature: PhysicalSignature; confidence: number }[] = [];
    for (const signature of kind.signatures) {
        if (signature.family === "coded") continue;
        const fit = solverForFamily(signature.family).solve(points);
        if (fit === null) continue;
        const { confidence } = scoreFootprint(
            fit,
            points.length,
            signature.geometry,
            pxPerMM,
            policy,
        );
        scored.push({ signature, confidence });
    }
    scored.sort((a, b) => b.confidence - a.confidence);
    const best = scored[0];
    if (best === undefined || best.confidence <= 0) return null;
    const runnerUp = scored[1]?.confidence ?? 0;
    return {
        signature: best.signature,
        confidence: best.confidence,
        margin: (best.confidence - runnerUp) / best.confidence,
    };
}
