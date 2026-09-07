import { menu } from "../../state/menu";
import { sidesActive } from "../sidesActive";
import { openMenu } from "./openMenu";

/* Switches the reading direction while the menu is open — it doesn't close
   but rotates along instead. */
export const reorientMenu = (): void => {
    if (!menu.side) return;
    openMenu(menu.side === "b" && !sidesActive() ? "a" : menu.side, menu.view);
};
