/* How long the object has been on the glass, and how far it moved
   while it was.
 *
 * `dwellMS` is the live interval, available every frame while the
 * object is down and not only at the end. That is what lets a ring
 * menu fill up as you hold, instead of only reacting once you let go.
 *
 * On the frame the object leaves the glass, `down` is false and the
 * two numbers describe the episode that just finished. They stay that
 * way until the next one begins, so a reader that only looks at the
 * down-to-up edge has everything it needs.
 *
 * What that episode *was* — a tap, a double, a hold — is deliberately
 * not here. `GestureRecogniser` answers it from definitions a
 * programme can change, and having the answer in two places is how
 * "three hundred milliseconds" ends up meaning two different things.
 */
export type TapSnapshot = {
    readonly down: boolean;
    readonly dwellMS: number;
    readonly movedPX: number;
};
