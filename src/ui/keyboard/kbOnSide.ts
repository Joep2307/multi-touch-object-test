import { keyboards } from "../../state/keyboards";
import type { KeyboardView } from "../../types/KeyboardView";
import type { Side } from "../../types/Side";

export const kbOnSide = (side: Side): KeyboardView =>
    keyboards.list.find((k) => k.side === side) || keyboards.list[0];
