import type { RingShape } from "./RingShape";
import type { Shape } from "./Shape";

/* Either shape a puck can present to the table. */
export type PuckShape = Shape | RingShape;
