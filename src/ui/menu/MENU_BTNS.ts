import type { MenuView, Side } from "../../types";

/* The four corner buttons: a map button and a settings button per side. */
export const MENU_BTNS: [string, Side, MenuView][] = [
    ["btnMapA", "a", "map"],
    ["btnSetA", "a", "settings"],
    ["btnMapB", "b", "map"],
    ["btnSetB", "b", "settings"],
];
