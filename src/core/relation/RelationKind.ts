/* How two objects on the glass stand to each other.
 *
 * The model's seven names. Five of them form a ladder, from closest to
 * furthest, and `SpatialIndex` assigns exactly one of those:
 *
 *   inside       the target sits wholly within the source
 *   overlapping  their circles cross
 *   touching     their rims meet, within a tolerance
 *   near         within reach of each other
 *   far          not
 *
 * The other two are in the vocabulary because the model names them,
 * and nothing assigns them. `outside` is the complement of `inside`,
 * so any pair that would earn it is already described more precisely
 * by one of the five. `nearest` is not a fact about a pair at all — it
 * is a fact about a set, and asking "are these two nearest" without
 * saying nearest out of what has no answer. It is a field on
 * `SpatialRelation` instead.
 */
export type RelationKind =
    | "nearest"
    | "near"
    | "far"
    | "touching"
    | "overlapping"
    | "inside"
    | "outside";
