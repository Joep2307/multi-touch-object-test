import { talk } from "../state";
import type { Pin } from "../types";

export const talkRunning = (pin: Pin | null | undefined): boolean =>
    !!talk.session && talk.pin === pin;
