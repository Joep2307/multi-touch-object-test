import type { ExtensionProperties } from "../programme/ExtensionProperties";
import type { RoleId } from "../session/RoleId";
import type { StateId } from "../behaviour/StateId";

/* A change to what an object *is* rather than to where it is.
 *
 * Its role, its state and its programme properties are the three
 * things about a physical that the table decides rather than measures,
 * and this is the only shape that can change them. One type for all
 * three because they change together: entering a mode assigns a role
 * and an initial state in the same breath.
 *
 * Omitting a field leaves it alone; passing `null` clears it. The
 * difference matters — "do not touch the role" and "this object now
 * has no role" are different instructions, and a single optional field
 * without `null` could only express one of them.
 *
 * `properties` replaces rather than merges. A merge cannot delete a
 * key, so a programme that set one by mistake would carry it for the
 * rest of the session with no way to say so.
 */
export type PhysicalAssignment = {
    readonly roleId?: RoleId | null;
    readonly currentStateId?: StateId | null;
    readonly properties?: ExtensionProperties;
};
