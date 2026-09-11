import { keyboards } from "../../state";
import type { KeyboardView, Side } from "../../types";

/* Het toetsenbord van deze kant, of anders dat van de andere. Er is
   er altijd ten minste één -- `keyboards.list` wordt bij het opstarten
   gevuld -- maar dat staat hier zwart op wit in plaats van dat de
   compiler erover heen wordt gepraat. */
export const kbOnSide = (side: Side): KeyboardView => {
    const found = keyboards.list.find((k) => k.side === side);
    const any = keyboards.list[0];
    if (found) return found;
    if (any) return any;
    throw new Error("Er is geen enkel toetsenbord aangemaakt.");
};
