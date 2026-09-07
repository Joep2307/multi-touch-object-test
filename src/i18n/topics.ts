import { L } from "./L";
import { kg } from "../kg/kg";
import { ui } from "../state/ui";

/* The topics on the pucks: from the graph if that toggle is on and the
   graph has them, otherwise the fixed list in the current language. */
export const topics = (): string[] =>
    kg.useThemes && kg.themes.length ? kg.themes : L[ui.lang].topics;
