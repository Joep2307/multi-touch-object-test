import { noteViewOf } from "../../notes/noteViewOf";
import type { Side } from "../../types/Side";
import { menuFlipped } from "../menu/menuFlipped";
import { sidesActive } from "../sidesActive";

/* Which side does this field belong to? A field in a window belongs to the
   side of that window, a field in the menu to the side the menu is open on. */
export function keyboardSideFor(target: HTMLElement): Side {
    if (!sidesActive()) return "a";
    const v = noteViewOf(target);
    if (v) return v.side;
    if (target.closest("#menu")) return menuFlipped() ? "b" : "a";
    return "a";
}
