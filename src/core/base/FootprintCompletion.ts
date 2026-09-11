import { applyRigidMotion } from "./applyRigidMotion";
import { rigidMotionBetween } from "./rigidMotionBetween";
import type { ContactSet } from "../contact/ContactSet";
import type { FootprintCompletionPolicy } from "./FootprintCompletionPolicy";
import type { FootprintSpec } from "./FootprintSpec";
import type { PositionSnapshot } from "./position/PositionSnapshot";
import type { SensedContact } from "../contact/SensedContact";
import type { Vec2 } from "./Vec2";

/* Whatever started with three feet stays that puck while two of those
   feet are still recognisably there.
 *
 * Three feet are present on only 57 to 64 per cent of frames in every
 * one of the seven recordings made at the table on 9 September 2026. A
 * dropout is not an edge case; it is a third of every session. Without
 * this class a two-foot frame is not sensed at all: `Move` resets and
 * loses the swipe, `Tap` loses its start centre, `MotionHistory` and
 * `Acceleration` reset behind them, and a drag through one dropout
 * frame reports that the puck never went anywhere.
 *
 * The rule is not "two feet are a puck". It is: two feet **whose
 * contact ids the table has been watching since the last complete
 * frame**, still the same distance apart. Then those two say exactly
 * how the puck moved and turned, and where the third foot must be. Two
 * real feet and one reconstructed one are a whole footprint, and
 * everything that reads a footprint — centre, heading, displacement —
 * reads it as usual and never learns that holding exists.
 *
 * Three things it deliberately does not do:
 *
 *   - It never **establishes** a puck on two feet. There has to have
 *     been a complete, sensed frame first. Two fingers are never a
 *     puck.
 *   - It never guesses across a gap. Fewer than `minMatchedFeet` of the
 *     watched ids and the frame is a pause, as before, and `Presence`
 *     keeps the identity. A foot that comes back has a new id and is
 *     not matched to whichever old foot is nearest.
 *   - The reconstruction is always **reference → now**, never frame →
 *     frame. The held frames do not become references, so a puck held
 *     for five seconds does not drift by five seconds of accumulated
 *     error.
 *
 * It sits before the traits rather than inside `Position` because the
 * heading source reads the raw frame too, and it would otherwise need
 * the same code.
 */
export class FootprintCompletion {
    /* The last frame that was complete and sensed on real feet. */
    #reference: readonly SensedContact[] | null = null;
    #referenceAt: number | null = null;

    constructor(private readonly policy: FootprintCompletionPolicy) {}

    /* The same set, the set plus reconstructed feet, or the set
       untouched when it cannot help. */
    complete(contacts: ContactSet, spec: FootprintSpec): ContactSet {
        const reference = this.#reference;
        const referenceAt = this.#referenceAt;
        if (reference === null || referenceAt === null) return contacts;
        if (contacts.points.length >= spec.expectedCount) return contacts;
        if (contacts.at - referenceAt > this.policy.maxGapMS) return contacts;

        const here = new Map<number, SensedContact>();
        for (const point of contacts.points) here.set(point.id, point);
        const matched: SensedContact[] = [];
        const missing: SensedContact[] = [];
        for (const foot of reference) {
            if (here.has(foot.id)) matched.push(foot);
            else missing.push(foot);
        }
        if (matched.length < this.policy.minMatchedFeet) return contacts;
        if (missing.length === 0) return contacts;
        if (!this.#rigid(matched, here)) return contacts;

        const motion = rigidMotionBetween(
            positionsOf(matched),
            positionsOf(matched.map((foot) => at(here, foot.id))),
        );
        if (motion === null) return contacts;

        /* In the reference's own order, so the completed set looks the
           same frame after frame however the driver reorders its
           touches. */
        const points: SensedContact[] = reference.map((foot) => {
            const real = here.get(foot.id);
            if (real !== undefined) return real;
            const where = applyRigidMotion(foot, motion);
            return {
                ...foot,
                x: where.x,
                y: where.y,
                /* The frame's own moment. The foot was not reported,
                   but the object it belongs to was measured now, and a
                   stale stamp inside this frame's set would be a second
                   opinion about when the frame is. `reconstructed` is
                   the one field that says this foot was not seen. */
                lastSeen: contacts.at,
                reconstructed: true,
            };
        });
        /* Anything the reference does not name is still on the glass
           and still belongs to this object as far as the caller is
           concerned; dropping it here would be this class deciding
           what a footprint is. */
        for (const point of contacts.points) {
            if (!reference.some((foot) => foot.id === point.id)) {
                points.push(point);
            }
        }
        return { at: contacts.at, points };
    }

    /* Take this frame as the new reference, if it earned it.
     *
     * Two conditions doing two different jobs. `complete && sensed` is
     * what makes a frame worth matching against at all — every expected
     * foot, believed. The `reconstructed` check is the one that keeps
     * the whole design honest: a reference built from a reconstruction
     * would make the next reconstruction a guess about a guess, and
     * five seconds of that is drift with nothing anchoring it.
     * `Position` already reports a held frame as not complete, and this
     * does not depend on it continuing to. */
    remember(contacts: ContactSet, position: PositionSnapshot): void {
        if (!position.sensed || !position.complete) return;
        if (contacts.points.some((point) => point.reconstructed === true)) {
            return;
        }
        this.#reference = contacts.points;
        this.#referenceAt = contacts.at;
    }

    reset(): void {
        this.#reference = null;
        this.#referenceAt = null;
    }

    /* Are the matched feet still the same distances apart?
     *
     * This is what refuses a finger that lands where a foot was. Every
     * pair among the matched feet is checked, not just the first: with
     * exactly two that is one comparison, and with more it is what
     * stops one badly placed foot hiding behind two good ones. */
    #rigid(
        matched: readonly SensedContact[],
        here: ReadonlyMap<number, SensedContact>,
    ): boolean {
        for (let i = 0; i < matched.length; i += 1) {
            for (let j = i + 1; j < matched.length; j += 1) {
                const a = matched[i];
                const b = matched[j];
                if (a === undefined || b === undefined) return false;
                const was = Math.hypot(a.x - b.x, a.y - b.y);
                if (was <= 0) return false;
                const nowA = at(here, a.id);
                const nowB = at(here, b.id);
                const now = Math.hypot(nowA.x - nowB.x, nowA.y - nowB.y);
                if (Math.abs(now - was) / was > this.policy.rigidTolerance) {
                    return false;
                }
            }
        }
        return true;
    }
}

function positionsOf(points: readonly SensedContact[]): Map<number, Vec2> {
    const map = new Map<number, Vec2>();
    for (const point of points) map.set(point.id, { x: point.x, y: point.y });
    return map;
}

/* Every id handed here came from `here.has()` a few lines earlier, so
   it is there. Written out rather than asserted past the compiler: a
   missing one would be a bug in the matching above, and it should say
   so here instead of producing a footprint built on NaN. */
function at(
    here: ReadonlyMap<number, SensedContact>,
    id: number,
): SensedContact {
    const point = here.get(id);
    if (point === undefined) {
        throw new Error(`Matched contact ${String(id)} is not in this frame.`);
    }
    return point;
}
