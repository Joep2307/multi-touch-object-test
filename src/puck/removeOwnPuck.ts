import { templates, tracks } from "../state";
import { saveOwnPucks } from "./saveOwnPucks";

/* Discarding also removes the puck currently recognised on the table:
   otherwise a marker would be left hanging that belongs to a template that no
   longer exists. */
export function removeOwnPuck(id: string): void {
    const i = templates.own.findIndex((t) => t.id === id);
    if (i < 0) return;
    templates.own.splice(i, 1);
    saveOwnPucks();
    for (const [k, t] of [...tracks.map])
        if (t.tpl && t.tpl.id === id) tracks.map.delete(k);
}
