import { ui } from "../state";
import { tableUi } from "./tableUi";

/* The "two sides" setting stays saved, but only counts at a table: on a
   laptop there's one person behind the screen and only one viewing
   direction. Puck mode is also a table, even though the bar is gone there. */
export const sidesActive = (): boolean => ui.twoSided && tableUi();
