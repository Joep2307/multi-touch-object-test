import { el } from "../../dom/el";
import { tr } from "../../i18n/tr";
import { menu } from "../../state/menu";
import type { MenuView } from "../../types/MenuView";
import type { Side } from "../../types/Side";
import { resetPanelOffset } from "../panels/resetPanelOffset";
import { MENU_BTNS } from "./MENU_BTNS";
import { MENU_TITLES } from "./MENU_TITLES";
import { markLayerMenu } from "./markLayerMenu";
import { menuFlipped } from "./menuFlipped";

/* ── Menu ──────────────────────────────────────────────────────────────
   At a table with people standing around it, any panel that stays put is
   in the way: it sits on top of the map, it's upside down for half the
   group, and it demands attention that belongs to the map. What you don't
   need at every moment — the counter, the latest markers, the map style,
   and the settings — therefore sits behind a single button.

   Those buttons appear twice, diagonally opposite each other, so both long
   sides have them within reach. There are two per corner: the map and the
   settings are reached for different reasons and so shouldn't sit behind
   the same tap and the same scroll.

   There remains one menu. It moves to whichever button was pressed, shows
   the content that belongs to that button, and rotates — just like the
   note window — to face the reading direction of that side. */
export function openMenu(side: Side, view?: MenuView): void {
    menu.side = side;
    menu.view = view || menu.view;
    const m = el("menu");
    resetPanelOffset(m);
    m.classList.toggle("at-a", side === "a");
    m.classList.toggle("at-b", side === "b");
    m.classList.toggle("flipped", menuFlipped());
    m.classList.toggle("view-map", menu.view === "map");
    m.classList.toggle("view-settings", menu.view === "settings");
    m.classList.add("open");
    el("menuTitle").textContent = tr(MENU_TITLES[menu.view]);
    MENU_BTNS.forEach(([id, s, v]) => {
        const mine = s === side && v === menu.view;
        el(id).classList.toggle("on", mine);
        el(id).setAttribute("aria-expanded", String(mine));
    });
    markLayerMenu();
    m.scrollTop = 0;
}
