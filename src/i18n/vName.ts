import { ui } from "../state";
import { L } from "./L";
import type { Verdict } from "../types";

/* The name of a puck type in the current language. */
export const vName = (k: Verdict): string => L[ui.lang][k] as string;
