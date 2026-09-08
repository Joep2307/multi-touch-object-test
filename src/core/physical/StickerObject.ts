import { TangibleObject } from "./TangibleObject";

/* A printed thing on the glass, identified by its pattern rather than
   by feet.
 *
 * Nothing recognises one yet — `coded` has no matcher and no heading
 * source. It exists as a class because it is the cheap answer to a
 * problem already on the table: if every voter must be an identified
 * physical, twenty voters means twenty objects, and a printed card is
 * a great deal cheaper than twenty pucks.
 *
 * Usually `Passive`: a target to be acted on rather than something
 * that opens a menu.
 */
export class StickerObject extends TangibleObject {}
