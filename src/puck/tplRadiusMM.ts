import { CFG } from "../config/CFG";
import type { Template } from "../types/Template";

/* This puck's disc in millimetres. The small puck of the duo is narrower
   than the four from the drawing; drawn at the same size its black band
   would lie over the ring of its own outer puck. */
export const tplRadiusMM = (t: Template | null | undefined): number =>
    t && Number.isFinite(t.radiusMM) && (t.radiusMM as number) > 0
        ? (t.radiusMM as number)
        : CFG.puckRadiusMM;
