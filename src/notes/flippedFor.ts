import { sidesActive } from "../ui";

/* If the touch is in the top half, the person is standing on that side
   and the window must be rotated 180°. */
export const flippedFor = (y: number): boolean =>
    sidesActive() && y < innerHeight / 2;
