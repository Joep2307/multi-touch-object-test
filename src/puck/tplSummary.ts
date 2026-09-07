import type { Template } from "../types/Template";
import { gapText } from "./geometry/gapText";
import { isRing } from "./geometry/isRing";
import { tplRing } from "./geometry/tplRing";
import { tplLongest } from "./tplLongest";

/* One line that says what the table has of this puck. */
export const tplSummary = (t: Template): string =>
    isRing(t)
        ? `${gapText(t.angles ?? [])}° · radius ` +
          `${tplRing(t).toFixed(1)} mm`
        : `${(t.ratios?.[0] ?? 0).toFixed(3)} / ` +
          `${(t.ratios?.[1] ?? 0).toFixed(3)} · ` +
          `${tplLongest(t).toFixed(1)} mm`;
