import { CHIP } from "../state/chip";
import { ui } from "../state/ui";

/* Read the chip sizes from the CSS tokens, times the UI scale. */
export function readChip(): void {
    const cs = getComputedStyle(document.documentElement);
    const px = (name: string, fallback: number) => {
        const v = parseFloat(cs.getPropertyValue(name));
        return Number.isFinite(v) ? v : fallback;
    };
    CHIP.font = px("--text-2xs", 15) * ui.scale;
    CHIP.padX = px("--chip-pad-x", 18) * ui.scale;
    CHIP.padY = px("--chip-pad-y", 14) * ui.scale;
    CHIP.radius = px("--chip-radius", 16) * ui.scale;
}
