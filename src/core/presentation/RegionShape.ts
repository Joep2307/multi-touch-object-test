import type { Vec2 } from "../base";

/* The shape of a piece of table.
 *
 * Measurements are in **millimetres from the table's origin**, never
 * in pixels. A voting area is a place on a physical table that people
 * reach across, so a programme file that described it in pixels would
 * describe a different area on a different screen. The conversion
 * happens once, at the edge, through the scale the table calibrated
 * for itself.
 */
export type RegionShape =
    | {
          readonly kind: "circle";
          readonly centreMM: Vec2;
          readonly radiusMM: number;
      }
    | {
          readonly kind: "rect";
          readonly centreMM: Vec2;
          readonly widthMM: number;
          readonly heightMM: number;
      }
    | { readonly kind: "polygon"; readonly pointsMM: readonly Vec2[] };
