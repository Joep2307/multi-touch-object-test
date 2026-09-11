import type { PresentationId } from "./PresentationId";
import type { RenderProps } from "./RenderProps";
import type { Renderer } from "./Renderer";

/* One thing to draw, once.
 *
 * `subjectId` is the object or region it belongs to, so a renderer
 * that needs to look something up can, and so a hit test knows what it
 * hit. Null for something that belongs to the table itself — a
 * background, a title.
 */
export type RenderItem = {
    readonly presentationId: PresentationId;
    readonly subjectId: string | null;
    readonly renderer: Renderer;
    readonly layer: number;
    readonly props: RenderProps;
};
