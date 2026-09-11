/* What one event carries beyond its type and its subject.
 *
 * Deliberately a loose record rather than a type per event. A
 * `ConditionDefinition` reads it by name — subject, operator, value —
 * out of a JSON file that the compiler never sees, so a precise type
 * here would be checked on exactly one side of the boundary and give
 * false confidence on the other. What keeps it honest is
 * `ModelValidator` in phase F, which reads the same programme file.
 *
 * Distinct from `ExtensionProperties` despite the same shape, because
 * they belong to different people: the payload is the core describing
 * what happened, the properties are a programme storing what only it
 * cares about. An event carries both.
 */
export type EventPayload = Readonly<Record<string, unknown>>;
