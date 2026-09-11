import {
    codeText,
    gapText,
    isRing,
    isSlotted,
    tplRing,
    tplSlots,
} from "./geometry";
import { tplLongest } from "./tplLongest";
import type { Template } from "../types";

/* One line that says what the table has of this puck. */
export const tplSummary = (t: Template): string =>
    isSlotted(t)
        ? `${codeText(t.code ?? 0, tplSlots(t))} · ` +
          `${tplSlots(t)} slots · radius ${tplRing(t).toFixed(1)} mm`
        : isRing(t)
          ? `${gapText(t.angles ?? [])}° · radius ` +
            `${tplRing(t).toFixed(1)} mm`
          : `${(t.ratios?.[0] ?? 0).toFixed(3)} / ` +
            `${(t.ratios?.[1] ?? 0).toFixed(3)} · ` +
            `${tplLongest(t).toFixed(1)} mm`;
