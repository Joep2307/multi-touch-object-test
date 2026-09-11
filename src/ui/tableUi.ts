import { ui } from "../state";

/* "This is a table": both touch mode and puck mode. */
export const tableUi = (): boolean => ui.mode !== "laptop";
