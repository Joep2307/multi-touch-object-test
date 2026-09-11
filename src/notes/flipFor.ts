import { sidesActive } from "../ui";
import { flippedFor } from "./flippedFor";
import type { Pin } from "../types";

/* By default the window opens toward the side the tap came from, but
   whoever is standing on the far side can take it over: the ⇅ button in the
   window, or a double tap on the marker. That choice sticks with the puck
   (`pin.flip`) until someone flips it back; with no choice made, the
   automatic rule applies again. */
export const flipFor = (pin: Pin | null | undefined, y: number): boolean =>
    sidesActive() && typeof pin?.flip === "boolean" ? pin.flip : flippedFor(y);
