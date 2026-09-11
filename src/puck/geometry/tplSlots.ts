import { CFG } from "../../config";
import type { Template } from "../../types";

/* How many slots this puck's grid has. The number belongs to the puck, not
   to the table -- a printed sheet with another grid keeps working. */
export const tplSlots = (t: Template | null | undefined): number =>
    t && Number.isFinite(t.slots) && (t.slots as number) >= 4
        ? (t.slots as number)
        : CFG.slotCount;
