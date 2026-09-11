import { CFG } from "../../config";
import { chipHeight } from "../../render";

export const puckMenuOuterPX = (): number =>
    CFG.ringPX + chipHeight() * 1.35 + 10;
