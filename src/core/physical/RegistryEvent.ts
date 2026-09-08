import type { Physical } from "./Physical";

/* What the live set of physicals announces.
 *
 * `left` fires when an object is forgotten for good, not when it is
 * lifted — a lifted object is still itself and may come back. That
 * distinction is the whole reason `Presence` has four states rather
 * than a boolean.
 */
export type RegistryEvent =
    | { readonly type: "joined"; readonly physical: Physical }
    | { readonly type: "left"; readonly physical: Physical }
    | { readonly type: "lifted"; readonly physical: Physical }
    | { readonly type: "returned"; readonly physical: Physical };
