import type { Side } from "./Side";
import type { TextField } from "./TextField";

/* One on-screen keyboard — there are two, one per table side, each with its
   own field and its own shift. */
export interface KeyboardView {
    side: Side;
    suffix: string;
    el: HTMLElement;
    target: TextField | null;
    shift: boolean;
}
