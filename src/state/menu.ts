import type { MenuView } from "../types/MenuView";
import type { Side } from "../types/Side";

/* There is one menu. It moves to whichever button was pressed, shows the
   content belonging to that button, and rotates to match the reading
   direction of that side. `side` is null as long as it's closed. */
export const menu = {
    side: null as Side | null,
    view: "settings" as MenuView,
};
