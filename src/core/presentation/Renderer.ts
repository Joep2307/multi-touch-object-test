/* How a presentation is drawn.
 *
 * A closed list, because each name is a renderer somebody has to
 * write. `customComponent` is the escape hatch and the honest
 * admission that this list will never be complete: a programme naming
 * one supplies it, and the core neither knows nor cares what it does.
 */
export type Renderer =
    "shape" | "image" | "text" | "animation" | "video" | "customComponent";
