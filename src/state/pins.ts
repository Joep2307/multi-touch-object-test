import type { Pin } from "../types";

/* The pins of the current session. `revision` counts every change, so the
   analysis only rebuilds when something actually changed; `storageFull` is
   the flag that stops a full browser storage from passing by silently. */
export const pins = {
    list: [] as Pin[],
    revision: 0,
    storageFull: false,
    saveTimer: null as ReturnType<typeof setTimeout> | null,
};
