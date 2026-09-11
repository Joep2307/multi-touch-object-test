import { vColor } from "../i18n";
import type { Template } from "../types";

/* A tool puck says its own colour; the four from the drawing take the
   colour of their verdict. */
export const tplColor = (t: Template): string => t?.color || vColor(t.verdict);
