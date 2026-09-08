import { Puck } from "./Puck";
import { Apertured } from "./affordance/Apertured";
import { affordanceOf } from "./affordanceOf";
import type { Vec2 } from "../base/Vec2";

/* A puck with a viewing hole: the map stays visible through it, and
   the hole can be tapped into.
 *
 * `holeContains` is the behaviour that makes this its own class. A tap
 * in the hole and a tap on the rim are different acts on this table —
 * one opens the ring menu, the other does not — and the difference is
 * geometric, so it belongs here rather than in whatever happens to be
 * handling the tap.
 *
 * The hole size comes from the `Apertured` affordance on the kind, so
 * a puck with a bigger window needs no code change. A kind without
 * that affordance has no hole and every point misses.
 */
export class OpenPuck extends Puck {
    /* Is this point inside the viewing hole? */
    holeContains(point: Vec2): boolean {
        const aperture = affordanceOf(this.kind, Apertured);
        if (aperture === null) return false;
        const centre = this.base.position.snapshot().centre;
        if (centre === null) return false;
        const holeR = (this.outerDiameterPX() * aperture.holeFraction) / 2;
        return Math.hypot(point.x - centre.x, point.y - centre.y) <= holeR;
    }

    /* On the puck but not in the hole: the rim you turn. */
    rimContains(point: Vec2): boolean {
        const centre = this.base.position.snapshot().centre;
        if (centre === null) return false;
        const d = Math.hypot(point.x - centre.x, point.y - centre.y);
        return d <= this.outerDiameterPX() / 2 && !this.holeContains(point);
    }
}
