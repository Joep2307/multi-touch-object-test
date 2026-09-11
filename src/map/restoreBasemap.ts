import { bakeStore } from "./bakeStore";
import { showBasemap } from "./showBasemap";
import type { BasemapRecord } from "../types";

export function restoreBasemap(): void {
    // A map saved before the move to IndexedDB gets migrated over and then
    // removed from localStorage: there it was occupying the space that the
    // contributions need.
    let old: string | null = null;
    try {
        old = localStorage.getItem("pucktable-basemap");
    } catch (e) {}
    if (old) {
        try {
            const rec = JSON.parse(old) as BasemapRecord;
            showBasemap(rec);
            bakeStore
                .put(rec)
                .then(() => {
                    try {
                        localStorage.removeItem("pucktable-basemap");
                    } catch (e) {}
                })
                .catch(() => {});
            return;
        } catch (e) {}
    }
    bakeStore
        .get()
        .then(showBasemap)
        .catch(() => {});
}
