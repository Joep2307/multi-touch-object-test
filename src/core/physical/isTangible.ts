import { TangibleObject } from "./TangibleObject";
import type { Physical } from "./Physical";

/* Does this physical actually have a `Base` measuring it?
 *
 * A real type guard rather than a cast off `hasPose`. The two would
 * agree today, but `hasPose` is a boolean the compiler cannot reason
 * about, so a cast based on it silently becomes a lie the first time
 * something declares a pose without a base. This narrows properly, so
 * that mistake is a compile error instead of an undefined at the
 * table.
 */
export function isTangible(physical: Physical): physical is TangibleObject {
    return physical instanceof TangibleObject;
}
