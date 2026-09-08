/* The identity of a grid-coded puck: the ring is divided into `slots`
   compartments and `code` is the bit mask of which of them carry a
   foot.
 *
 * Bit 0 is the compartment the arrow points into, which is what makes
 * the code an orientation as well as a name — and why this belongs on
 * the kind rather than in a policy. It describes what was
 * manufactured.
 *
 * Two pucks with the same code but a different ring are two different
 * pucks, so the ring size stays on the footprint where the size check
 * can see it.
 */
export type SlotCode = {
    readonly slots: number;
    readonly code: number;
};
