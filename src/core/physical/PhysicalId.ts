/* The identity of one object, stable for as long as the table
   remembers it.
 *
 * A branded string rather than a bare one, so a kind id, a role id and
 * a physical id cannot be passed to each other's functions by
 * accident. They are all strings at runtime and all interchangeable to
 * the compiler otherwise, and the mistake is silent — the object simply
 * never matches anything.
 *
 * Survives being lifted: the same puck put back within the memory
 * window keeps its id, its authored records and its mode. That is the
 * whole reason identity is a separate concept from recognition.
 */
export type PhysicalId = string & { readonly __brand: "PhysicalId" };
