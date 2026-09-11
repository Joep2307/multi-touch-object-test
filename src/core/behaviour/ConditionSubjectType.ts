/* Where a condition looks.
 *
 * A closed union rather than an open string, because every one of them
 * needs code that knows how to resolve it and an unknown type is a
 * programme that will silently never fire. `ModelValidator` in phase F
 * checks a JSON file against exactly this list.
 */
export type ConditionSubjectType =
    | "kind"
    | "role"
    | "state"
    | "mode"
    | "variable"
    | "distance"
    | "relation"
    | "affordance"
    | "region"
    | "property";
