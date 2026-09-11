/* What the touch driver reported, before the frame decided anything
   about it.
 *
 * A source knows where a touch is and when it first arrived. It does
 * **not** know whether that touch is new, because "new" is a statement
 * about the previous frame and a source polls one frame at a time.
 * Splitting the type is what stops each source having its own opinion
 * about that: `ContactStatusTracker` is the only thing that decides,
 * and a source that tried to would not compile.
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
export type SensedContact = {
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly radiusPX: number;
    readonly firstSeen: number;
    readonly lastSeen: number;
};
