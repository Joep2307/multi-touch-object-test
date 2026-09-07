import { ui } from "../state/ui";

export const puckMode = (): boolean => ui.mode === "puck";
