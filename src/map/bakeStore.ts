import { bakeIDB } from "./bakeIDB";
import type { BasemapRecord } from "../types";

/* De ene bewaarde kaart: wegschrijven, ophalen, wissen. */
const BAKE_KEY = "current";
export const bakeStore = {
    put: (rec: BasemapRecord) =>
        bakeIDB<IDBValidKey>("readwrite", (st) => st.put(rec, BAKE_KEY)),
    get: () =>
        bakeIDB<BasemapRecord | undefined>("readonly", (st) =>
            st.get(BAKE_KEY),
        ),
    del: () => bakeIDB<undefined>("readwrite", (st) => st.delete(BAKE_KEY)),
};
