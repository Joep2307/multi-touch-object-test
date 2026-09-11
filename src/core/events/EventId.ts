/* Which event this is, out of all of them.
 *
 * Assigned by `EventBus` in publication order, so the ids of a
 * session's events are also their sequence. The log is then orderable
 * without a second field, and a replay that produced them in a
 * different order is visible rather than merely wrong.
 */
export type EventId = string & { readonly __brand: "EventId" };
