import { resolveBindings } from "./resolveBindings";
import type { PhysicalInstance } from "../physical";
import type { PresentationDefinition } from "./PresentationDefinition";
import type { PresentationId } from "./PresentationId";
import type { PresentationView } from "./PresentationView";
import type { RenderItem } from "./RenderItem";
import type { RenderPlan } from "./RenderPlan";
import type { TablePresentation } from "./TablePresentation";

/* Everything to draw this frame, in the order to draw it.
 *
 * The one function the renderer calls, and the whole interface between
 * the model and the drawing. What it hands back holds no instance, no
 * session and no rule, so a renderer cannot reach back into the model
 * even by accident — which is how "the image reads the state, it does
 * not change it" becomes a fact about the code rather than a promise
 * in a comment.
 *
 * An object's state overrides its kind's drawing, and that is the only
 * conditional in the layer. It is a lookup rather than a rule because
 * "in this state, this drawing" has no conditions in it; dressing it
 * up as behaviour would put the image back in the rules.
 */
export function buildRenderPlan(
    table: TablePresentation,
    presentations: readonly PresentationDefinition[],
    instances: readonly PhysicalInstance[],
    view: PresentationView,
): RenderPlan {
    const byId = new Map<PresentationId, PresentationDefinition>();
    for (const presentation of presentations) {
        byId.set(presentation.id, presentation);
    }
    const items: RenderItem[] = [];

    for (const region of table.regions) {
        const presentation = lookup(byId, region.presentationId);
        if (presentation === null) continue;
        items.push(itemFor(presentation, region.id, null, view));
    }

    for (const instance of instances) {
        if (instance.status === "removed") continue;
        const stateId = instance.currentStateId;
        /* Fall back on the *resolved* presentation, not on the id. A
           `statePresentations` entry naming something that is not in
           the list used to make the object disappear the instant it
           entered that state, rather than fall back to its kind's
           drawing — and the validator did not check those ids. */
        const presentation =
            lookup(
                byId,
                stateId === null
                    ? undefined
                    : table.statePresentations?.[stateId],
            ) ?? lookup(byId, table.physicalPresentations[instance.kindId]);
        if (presentation === null) continue;
        items.push(itemFor(presentation, instance.id, instance, view));
    }

    for (const id of table.globalPresentations ?? []) {
        const presentation = lookup(byId, id);
        if (presentation === null) continue;
        items.push(itemFor(presentation, null, null, view));
    }

    /* Stable: two items on the same layer keep the order they were
       built in, so a frame that changed nothing draws identically. */
    items.sort((a, b) => a.layer - b.layer);
    return {
        at: view.at,
        background: table.background ?? null,
        items,
    };
}

function lookup(
    byId: ReadonlyMap<PresentationId, PresentationDefinition>,
    id: PresentationId | undefined,
): PresentationDefinition | null {
    if (id === undefined) return null;
    return byId.get(id) ?? null;
}

function itemFor(
    presentation: PresentationDefinition,
    subjectId: string | null,
    instance: PhysicalInstance | null,
    view: PresentationView,
): RenderItem {
    return {
        presentationId: presentation.id,
        subjectId,
        renderer: presentation.renderer,
        layer: presentation.layer,
        props: resolveBindings(presentation.bindings, instance, view),
    };
}
