import { tr } from "../i18n/tr";
import { vName } from "../i18n/vName";
import type { Template } from "../types/Template";

/* What a puck is called in a list. A tool has no verdict and says its own
   name; the others are named after what they record. */
export const tplName = (t: Template): string =>
    t?.nameKey ? tr(t.nameKey) : vName(t.verdict);
