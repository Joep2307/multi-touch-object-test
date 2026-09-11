import { PADS_PER_SIM_PUCK } from "./constants";

/* A stable contact id for one pad of one drag copy.
 *
 * Negative on purpose. Pointer ids come from the browser and are never
 * negative, so a simulated foot and a real finger can never be handed the
 * same number — which matters because the whole point of these ids is
 * that the same id means the same foot. */
export const simContactId = (uid: number, index: number): number =>
    -1 - (uid * PADS_PER_SIM_PUCK + index);
