import { ui } from "../state/ui";

/* "This is a table": both touch mode and puck mode. */
export const tableUi = (): boolean => ui.mode !== "laptop";
