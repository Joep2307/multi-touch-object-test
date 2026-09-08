/* One physical touch on the glass, as the touch driver reports it.
 *
 * Immutable on purpose. A frame handed to the model must not change
 * under it while it is being read, and the recorder has to be able to
 * hold on to a frame without copying it first. A finger that moves
 * produces a new `ContactPoint` with the same `id`, never a mutated
 * one.
 *
 * `radiusPX` is the size the driver reports for the contact. The feet
 * of a puck are small and even; a resting palm is large and uneven.
 * Nothing at this level judges that — it is carried along so the
 * matcher above can, and so a recording keeps enough to tell a foot
 * from a hand when it is replayed a month later.
 *
 * `firstSeen` is what makes `Tap` possible without any trait having to
 * keep its own history: how long something has been down is
 * `lastSeen - firstSeen`, and it survives a dropped frame.
 */
export type ContactPoint = {
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly radiusPX: number;
    readonly firstSeen: number;
    readonly lastSeen: number;
};
