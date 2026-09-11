import { CFG } from "../../config";
import type { Template } from "../../types";

/* The ring radius belongs to the puck, not to the table. A printed puck is
   more accurate than cut tape, but the table measures it anyway. */
export const tplRing = (t: Template | null | undefined): number =>
    t && Number.isFinite(t.ringMM) && (t.ringMM as number) > 0
        ? (t.ringMM as number)
        : CFG.ringRadiusMM;
