import { kg } from "./kg";
import { loadKG } from "./loadKG";

/* Ensures the graph is loaded without necessarily drawing it — the note
   window needs the data too, even when the layer is off. */
let pending: Promise<void> | null = null;
export function ensureKG(baseUrl = ""): Promise<void> {
    if (kg.loaded) return Promise.resolve();
    if (!pending)
        pending = loadKG(baseUrl).finally(() => {
            pending = null;
        });
    return pending;
}
