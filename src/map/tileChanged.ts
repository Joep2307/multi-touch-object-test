import { tiles } from "../state/tiles";

/* A tile arrived (or failed): trigger a redraw of the map layer,
   but no more than a few times per second. */
export function tileChanged(): void {
    if (tiles.refreshTimer) return;
    tiles.refreshTimer = setTimeout(() => {
        tiles.revision++;
        tiles.refreshTimer = null;
    }, 120);
}
