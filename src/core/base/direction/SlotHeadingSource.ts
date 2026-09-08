import { HeadingSource } from "./HeadingSource";
import { FULL_TURN_DEG } from "./constants";
import type { ContactPoint } from "../../contact/ContactPoint";
import type { DirectionPolicy } from "./DirectionPolicy";
import type { Vec2 } from "../Vec2";

/* The nose of a grid-coded puck: the compartment its code starts in.
 *
 * A slot puck does not have one distinguished foot the way a triad or
 * a gapped ring does. Its identity *is* the pattern of filled
 * compartments, and bit 0 is the compartment the arrow points into —
 * so the orientation falls out of asking "at what rotation does the
 * measured pattern line up with the code we know this puck has".
 *
 * That question has a small, exact set of candidate answers rather
 * than needing a search: the correct rotation must place *some*
 * measured foot at the start of *some* occupied compartment. So each
 * (foot, occupied slot) pair proposes one rotation, the proposals are
 * scored by how far every foot then sits from its nearest occupied
 * compartment, and the best wins. At most feet × filled-slots
 * candidates — a couple of dozen — evaluated in fixed time per frame.
 *
 * The winner must also beat the runner-up. A code that is rotationally
 * symmetric (0b101010 in twelve slots, say) genuinely has more than
 * one valid orientation, and there is no honest answer for it: better
 * to return null than to pick one and have the puck appear to jump
 * between them.
 */
export class SlotHeadingSource extends HeadingSource {
    override readonly id = "heading.slot";
    readonly #occupied: readonly number[];
    readonly #slotWidthDeg: number;

    constructor(
        private readonly policy: DirectionPolicy,
        slots: number,
        code: number,
    ) {
        super();
        this.#slotWidthDeg = FULL_TURN_DEG / slots;
        const occupied: number[] = [];
        for (let i = 0; i < slots; i += 1) {
            if ((code & (1 << i)) !== 0) occupied.push(i);
        }
        this.#occupied = occupied;
    }

    override heading(
        points: readonly ContactPoint[],
        centre: Vec2,
    ): { headingDeg: number; reference: Vec2 } | null {
        if (this.#occupied.length === 0 || points.length === 0) return null;

        const angles: number[] = [];
        let radius = 0;
        for (const p of points) {
            const dx = p.x - centre.x;
            const dy = p.y - centre.y;
            if (dx === 0 && dy === 0) return null;
            angles.push(norm(radToDeg(Math.atan2(dy, dx))));
            radius += Math.hypot(dx, dy);
        }
        radius /= points.length;

        /* Deduplicate first. A correct rotation is proposed once by
           every foot that lands in a filled compartment — four feet,
           four proposals, all identical — and scoring it four times
           would make the winner its own runner-up, so the ambiguity
           check below would reject every clean reading. */
        const candidates = new Set<number>();
        for (const angle of angles) {
            for (const slot of this.#occupied) {
                const phase = norm(angle - slot * this.#slotWidthDeg);
                candidates.add(Math.round(phase * 1000) / 1000);
            }
        }

        const scored: { phase: number; cost: number }[] = [];
        for (const phase of candidates) {
            scored.push({ phase, cost: this.#cost(angles, phase) });
        }
        let best = Number.POSITIVE_INFINITY;
        let bestPhase = 0;
        for (const entry of scored) {
            if (entry.cost < best) {
                best = entry.cost;
                bestPhase = entry.phase;
            }
        }

        /* The runner-up has to be a genuinely *different* orientation.
           Every foot proposes a rotation, so with jitter the winner is
           surrounded by near-copies of itself a few degrees away;
           counting those as rivals would reject every real reading the
           moment a foot trembled. A rival must sit at least half a
           compartment away — closer than that and it is the same
           answer measured slightly differently. */
        const rivalGapDeg = this.#slotWidthDeg / 2;
        let runnerUp = Number.POSITIVE_INFINITY;
        for (const entry of scored) {
            const apart = Math.abs(shortest(bestPhase, entry.phase));
            if (apart <= rivalGapDeg) continue;
            if (entry.cost < runnerUp) runnerUp = entry.cost;
        }

        /* Every foot must sit close enough to a compartment it should
           be in; otherwise these points are not this puck. */
        const perFoot = best / angles.length;
        if (perFoot > this.policy.slotSnapDeg) return null;

        /* A symmetric code fits equally well at more than one rotation.
           Saying nothing beats picking one and flickering. */
        if (
            Number.isFinite(runnerUp) &&
            runnerUp - best < this.policy.slotSnapDeg
        ) {
            return null;
        }

        const rad = degToRad(bestPhase);
        return {
            headingDeg: bestPhase,
            reference: {
                x: centre.x + radius * Math.cos(rad),
                y: centre.y + radius * Math.sin(rad),
            },
        };
    }

    /* Total angular distance from every foot to the nearest
       compartment the code says should be filled, at this rotation. */
    #cost(angles: readonly number[], phaseDeg: number): number {
        let total = 0;
        for (const angle of angles) {
            let nearest = Number.POSITIVE_INFINITY;
            for (const slot of this.#occupied) {
                const want = norm(phaseDeg + slot * this.#slotWidthDeg);
                const off = Math.abs(shortest(want, angle));
                if (off < nearest) nearest = off;
            }
            total += nearest;
        }
        return total;
    }
}

const radToDeg = (rad: number): number =>
    (rad * FULL_TURN_DEG) / (2 * Math.PI);

const degToRad = (deg: number): number => (deg * 2 * Math.PI) / FULL_TURN_DEG;

const norm = (deg: number): number =>
    ((deg % FULL_TURN_DEG) + FULL_TURN_DEG) % FULL_TURN_DEG;

const shortest = (from: number, to: number): number => {
    const wrapped = norm(to - from);
    return wrapped > FULL_TURN_DEG / 2 ? wrapped - FULL_TURN_DEG : wrapped;
};
