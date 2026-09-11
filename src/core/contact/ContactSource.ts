import { ContactStatusTracker } from "./ContactStatusTracker";
import type { ContactFrame } from "./ContactFrame";
import type { SensedContact } from "./SensedContact";

/* Where contact frames come from.
 *
 * A source is *polled* once per animation frame rather than pushing
 * events, and that is the important decision in this file. Pushing
 * would hand the model a puck's feet one at a time; polling hands it
 * the whole glass at one instant, which is the only thing recognition
 * can honestly work from.
 *
 * A subclass reports only what is down — `live()` — and never what is
 * new or gone. Those are statements about the previous frame, and this
 * class holds the only copy of it. A source that tried to answer them
 * would not compile, which is a stronger guarantee than a comment
 * asking it not to.
 *
 * No subclass touches the DOM. `PointerContactSource` is fed by a thin
 * adapter that lives outside the core and does the `addEventListener`
 * work, so the core stays testable without a browser and portable to
 * Rust later. tsconfig.core.json enforces this by removing the DOM
 * typings altogether.
 */
export abstract class ContactSource {
    readonly #status = new ContactStatusTracker();

    /* The frame as it stands at `now`, statuses included. Must be
       cheap: it runs every frame. Must not hand back anything the
       caller can mutate. */
    frame(now: number): ContactFrame {
        return this.#status.apply(now, this.live(now));
    }

    /* Forget every live contact. Called when the table resets, and
       between tests, so a stuck finger cannot outlive a session.
       Nothing is announced as ended: a reset is not a lift, and
       pretending otherwise would fire a tap for every finger on the
       glass at the moment the table was cleared. */
    clear(): void {
        this.#status.reset();
        this.clearLive();
    }

    /* What is down at `now`, sorted by id so that two runs over the
       same input produce byte-identical frames. */
    protected abstract live(now: number): readonly SensedContact[];

    protected abstract clearLive(): void;
}
