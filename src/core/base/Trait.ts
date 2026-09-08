import type { BaseSample } from "./BaseSample";

/* One measurable property of an object on the glass.
 *
 * A trait is fed one sample per frame and answers questions about it.
 * It holds no opinion about what the object *means*: `Rotate` knows
 * degrees, not that turning zooms the map.
 *
 * Why traits at all, instead of fields on one object: today `Track` is
 * one interface with 37 fields mixing sensing, UI, map control and
 * knowledge-graph caching, because every feature that touched a puck
 * grew a field on it. A trait has its own state, its own policy and
 * its own tests, it can be left off a kind that does not need it, and
 * nothing outside it can write to it.
 *
 * `S` is the snapshot type: the immutable answer this trait hands out.
 * Handing out `this` would let a renderer keep a reference and read
 * half-updated values a frame later.
 */
export abstract class Trait<S> {
    abstract readonly id: string;

    /* Advance by one frame. Called in a fixed order by `Base`; a trait
       may read another trait's snapshot but never its internals. */
    abstract update(sample: BaseSample): void;

    /* Forget everything measured so far. Used when an object leaves
       the table for good, and between tests. */
    abstract reset(): void;

    abstract snapshot(): S;
}
