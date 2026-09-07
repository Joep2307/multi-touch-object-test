import { talk } from "../state/talk";
import type { Pin } from "../types/Pin";

export const talkRunning = (pin: Pin | null | undefined): boolean =>
    !!talk.session && talk.pin === pin;
