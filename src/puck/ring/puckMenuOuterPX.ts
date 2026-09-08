import { CFG } from "../../config/CFG";
import { chipHeight } from "../../render/chipHeight";

export const puckMenuOuterPX = (): number =>
    CFG.ringPX + chipHeight() * 1.35 + 10;
