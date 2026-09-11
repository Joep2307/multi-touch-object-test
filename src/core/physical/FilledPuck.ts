import { Puck } from "./Puck";
import type { Vec2 } from "../base";

/* A puck with a solid face.
 *
 * The whole disc is the object, so a touch anywhere within its radius
 * belongs to it. That is the one behaviour that separates it from
 * `OpenPuck`, and it is why the two are classes rather than a flag.
 */
export class FilledPuck extends Puck {
    /* Is this point on the puck's face? */
    contains(point: Vec2): boolean {
        const centre = this.base.position.snapshot().centre;
        if (centre === null) return false;
        const r = this.outerDiameterPX() / 2;
        return Math.hypot(point.x - centre.x, point.y - centre.y) <= r;
    }
}
