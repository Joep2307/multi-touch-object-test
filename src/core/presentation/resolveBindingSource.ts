import type { PhysicalInstance } from "../physical/PhysicalInstance";
import type { PresentationView } from "./PresentationView";

const VARIABLES = "variables.";
const PROPERTIES = "properties.";

/* Read one value out of what the table knows.
 *
 * A short closed vocabulary of paths rather than a general expression
 * language, for the same reason conditions have no `and`: a data file
 * nobody can debug is worse than one that cannot say everything. The
 * two prefixes are the only open part, and both of them lead into
 * places a programme already owns.
 *
 * Returns `undefined` for anything it does not recognise, so a
 * misspelt path falls back to the binding's fallback rather than
 * throwing. A typo in a drawing should make something look wrong, not
 * take the table down in front of people.
 */
export function resolveBindingSource(
    source: string,
    instance: PhysicalInstance | null,
    view: PresentationView,
): unknown {
    if (source.startsWith(VARIABLES)) {
        return view.variable(source.slice(VARIABLES.length));
    }
    if (source.startsWith(PROPERTIES)) {
        return instance?.properties[source.slice(PROPERTIES.length)];
    }
    switch (source) {
        case "activeMode":
            return view.activeModeId ?? undefined;
        case "pose.position":
            return instance?.pose?.position ?? undefined;
        case "pose.direction":
            return instance?.pose?.directionDeg ?? undefined;
        case "pose.size":
            return instance?.pose?.sizePX ?? undefined;
        case "currentState":
            return instance?.currentStateId ?? undefined;
        case "role":
            return instance?.roleId ?? undefined;
        case "kind":
            return instance?.kindId ?? undefined;
        case "status":
            return instance?.status ?? undefined;
        default:
            return undefined;
    }
}
