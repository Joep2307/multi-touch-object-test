import { el } from "../../dom/el";
import { menu } from "../../state/menu";
import { hideKeyboardIn } from "../keyboard/hideKeyboardIn";
import { MENU_BTNS } from "./MENU_BTNS";

export function closeMenu(): void {
    if (!menu.side) return;
    menu.side = null;
    el("menu").classList.remove("open");
    MENU_BTNS.forEach(([id]) => {
        el(id).classList.remove("on");
        el(id).setAttribute("aria-expanded", "false");
    });
    // Typing was happening in a field that's now gone; the keyboard should go too.
    hideKeyboardIn(el("menu"));
}
