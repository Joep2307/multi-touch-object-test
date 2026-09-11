import type { BindingTarget } from "./BindingTarget";

/* What one thing looks like this frame, resolved.
 *
 * The output of every binding on one presentation, and the only shape
 * the renderer ever sees. It is a plain record rather than a typed
 * object per renderer because the renderer is chosen by the
 * presentation, not by the core: a `customComponent` a programme
 * supplied has properties the core has never heard of, and inventing a
 * type for it would be inventing a limit.
 */
export type RenderProps = Partial<Record<BindingTarget, unknown>>;
