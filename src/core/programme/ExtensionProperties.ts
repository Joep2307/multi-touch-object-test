/* Where a programme keeps what only it cares about.
 *
 * The last part of the model is not a class but an agreement: wherever
 * this type appears, a programme may store its own keys — a vote
 * weight, a health point total, a language, a task id — and the core
 * neither reads them nor moves with them. Adding a key here breaks no
 * other programme; adding a field to a core type breaks all of them.
 *
 * Deliberately `unknown` rather than a union of the types seen so far.
 * The moment it is narrowed, the core has an opinion about what a
 * programme is allowed to store, which is the one thing this type
 * exists not to have.
 */
export type ExtensionProperties = Readonly<Record<string, unknown>>;
