/* What the table shows: the table presentation, its regions, and the
   bindings that tie a drawing to what it reads.
 *
 * Image without behaviour. A presentation knows which renderer it uses
 * and what it binds to — position follows an object's pose, colour
 * follows its state — and it does not know why the state changed.
 *
 * **No arrow runs from here back into behaviour.** Nothing in this
 * folder may import from `behaviour/` or `session/` except types, and
 * eslint.config.js enforces it. `PresentationView` is why it does not
 * need to.
 */
export { RegionPolicy } from "./RegionPolicy";
export { RegionTracker } from "./RegionTracker";
export { buildRenderPlan } from "./buildRenderPlan";
export { regionContains } from "./regionContains";
export { resolveBindingSource } from "./resolveBindingSource";
export { resolveBindings } from "./resolveBindings";
export { REGION_HYSTERESIS_MM } from "./constants";
export type { Binding } from "./Binding";
export type { BindingTarget } from "./BindingTarget";
export type { PresentationDefinition } from "./PresentationDefinition";
export type { PresentationId } from "./PresentationId";
export type { PresentationView } from "./PresentationView";
export type { RegionCrossing } from "./RegionCrossing";
export type { RegionDefinition } from "./RegionDefinition";
export type { RegionId } from "./RegionId";
export type { RegionShape } from "./RegionShape";
export type { RegionUpdate } from "./RegionUpdate";
export type { RenderItem } from "./RenderItem";
export type { RenderPlan } from "./RenderPlan";
export type { RenderProps } from "./RenderProps";
export type { Renderer } from "./Renderer";
export type { TablePresentation } from "./TablePresentation";
