/* Everything that can happen, in one closed vocabulary.
 *
 * The model draws fourteen. Two more are here, and both are the same
 * omission: the gesture list has a swipe and a shake in it, and a
 * gesture that cannot become an event cannot be reacted to. Rather
 * than smuggle them through `custom.*` — which is a programme's space,
 * not the core's — they are named.
 *
 * `custom.${string}` is what an `emitEvent` effect produces:
 * `custom.vote.cast` and its like. The compiler cannot check the tail,
 * which is the point — a programme invents them. What it *can* check
 * is that a misspelt core type is not silently accepted as a custom
 * one, because `physical.taped` matches neither arm.
 */
export type EventType =
    | "contact.started"
    | "contact.moved"
    | "contact.ended"
    | "physical.detected"
    | "physical.moved"
    | "physical.rotated"
    | "physical.tapped"
    | "physical.swiped"
    | "physical.shaken"
    | "physical.removed"
    | "physical.enteredRegion"
    | "physical.exitedRegion"
    | "physical.nearPhysical"
    | "state.entered"
    | "state.exited"
    | "mode.changed"
    | `custom.${string}`;
