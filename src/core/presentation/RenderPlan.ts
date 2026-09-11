import type { RenderItem } from "./RenderItem";

/* Everything to draw this frame, in the order to draw it.
 *
 * The whole interface between the model and the renderer. What is
 * *not* in it is the point: no instance, no session, no rule, no
 * event. A renderer handed one of these cannot reach back into the
 * model even by accident, which is what makes "the image reads the
 * state, it does not change it" a fact about the code rather than a
 * promise in a comment.
 *
 * Sorted by layer, so a renderer walks the list and paints.
 */
export type RenderPlan = {
    readonly at: number;
    readonly background: string | null;
    readonly items: readonly RenderItem[];
};
