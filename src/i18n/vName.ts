import { L } from "./L";
import { ui } from "../state/ui";
import type { Verdict } from "../types/Verdict";

/* The name of a puck type in the current language. */
export const vName = (k: Verdict): string => L[ui.lang][k] as string;
