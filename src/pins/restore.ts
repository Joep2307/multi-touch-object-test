import { DEFAULT_SESSION } from "../config/DEFAULT_SESSION";
import { DEMO_PINS } from "../config/DEMO_PINS";
import { el } from "../dom/el";
import { topics } from "../i18n/topics";
import { pins } from "../state/pins";
import { ui } from "../state/ui";
import { cleanPin } from "./cleanPin";
import { validPin } from "./validPin";

/* Fetch the markers of the selected session from storage. */
export function restore(): void {
    pins.list.length = 0;
    try {
        const session = el<HTMLInputElement>("sess").value;
        const sessionKey = "pucktable-" + session;
        const demoKey = "pucktable-demo-pins-v1";
        /* The default session was called "sessie-01" until English became the
       source language. A table that was already in use keeps its marks: if
       nothing is stored under the new name, the old key is read once and
       written back under the new one. */
        let raw = localStorage.getItem(sessionKey);
        if (raw === null && session === DEFAULT_SESSION) {
            const legacy = localStorage.getItem("pucktable-sessie-01");
            if (legacy !== null) {
                localStorage.setItem(sessionKey, legacy);
                raw = legacy;
            }
        }
        const stored: unknown = raw === null ? [] : JSON.parse(raw);
        /* Restoring whatever is in storage unseen is more dangerous here than
       it looks: a single marker with an unknown verdict makes `vColor()`
       throw halfway through the draw loop, and then everything after that
       line — the pucks, the ring menu — never gets drawn again. Every frame,
       again, until someone clears storage. Templates and own pucks were
       already validated; markers were not. */
        if (Array.isArray(stored)) {
            stored
                .filter((p) => validPin(p))
                .forEach((p) => pins.list.push(cleanPin(p, topics()[0])));
            // We also write back what didn't pass: otherwise it would still be
            // there next time, and the next change in the session would be
            // the only thing that ever cleans it up.
            if (stored.length !== pins.list.length)
                localStorage.setItem(sessionKey, JSON.stringify(pins.list));
        }

        /* Even a default session that already existed before the demo gets the
       examples added once. Existing contributions are left in place. The
       separate key prevents 'Clear all' from bringing them back on a reload.
       The examples are seeded in the language the table is set to; switching
       language afterwards leaves them as they were written, exactly like a
       contribution someone typed in themselves. */
        if (
            session === DEFAULT_SESSION &&
            localStorage.getItem(demoKey) !== "1"
        ) {
            const ids = new Set(pins.list.map((p) => p.id));
            DEMO_PINS[ui.lang]
                .filter((p) => !ids.has(p.id))
                .forEach((p) => pins.list.push({ ...p }));
            localStorage.setItem(sessionKey, JSON.stringify(pins.list));
            localStorage.setItem(demoKey, "1");
        }
    } catch (e) {}
}
