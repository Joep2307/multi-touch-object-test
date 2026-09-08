import type { ContactFrame } from "./ContactFrame";

/* Where contact frames come from.
 *
 * A source is *polled* once per animation frame rather than pushing
 * events, and that is the important decision in this file. Pushing
 * would hand the model a puck's feet one at a time; polling hands it
 * the whole glass at one instant, which is the only thing recognition
 * can honestly work from.
 *
 * No subclass touches the DOM. `PointerContactSource` is fed by a thin
 * adapter that lives outside the core and does the `addEventListener`
 * work, so the core stays testable without a browser and portable to
 * Rust later. tsconfig.core.json enforces this by removing the DOM
 * typings altogether.
 */
export abstract class ContactSource {
    /* The contacts as they stand at `now`. Must be cheap: it runs every
       frame. Must not hand back anything the caller can mutate. */
    abstract frame(now: number): ContactFrame;

    /* Forget every live contact. Called when the table resets, and
       between tests, so a stuck finger cannot outlive a session. */
    abstract clear(): void;
}
