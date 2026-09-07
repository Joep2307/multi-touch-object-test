import { el } from "../../dom/el";

/* Four ways to close the overview: the button at the bottom, the cross at the
   top, a tap next to the sheet, and Escape. The bottom button alone wasn't
   enough — with four or more pucks it ends up off-screen. */
export function closeSheet(): void {
    el("sheet").style.display = "none";
}
