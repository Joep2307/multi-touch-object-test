import { CHIP } from "../state/chip";

export const chipHeight = (): number =>
    Math.round(CHIP.font * 1.2 + CHIP.padY);
