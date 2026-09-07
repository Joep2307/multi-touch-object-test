import type { Lang } from "../types/Lang";
import type { TalkSay } from "../types/TalkSay";
import type { TalkSession } from "../types/TalkSession";
import { Recognition } from "./Recognition";

/* The browser listens by itself. Chrome stops recognition on its own as
   soon as it's quiet for a moment — at a participation table that's every
   half minute — so we restart it in `onend`. If that restart fails ten
   times in a row within a fraction of a second, something is structurally
   wrong (a Chromium build without API keys does exactly that) and we give
   up instead of getting stuck in a loop. */
export function browserSession(lang: Lang, say: TalkSay): TalkSession | null {
    const R = Recognition();
    if (!R) {
        say.error("browser");
        return null;
    }
    const rec = new R();
    rec.lang = lang === "en" ? "en-US" : "nl-NL";
    rec.continuous = true;
    rec.interimResults = true;
    let live = true,
        quickRestarts = 0,
        lastStart = 0,
        spoke = false;

    rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) {
                const t = (r[0]?.transcript || "").trim();
                if (t) {
                    spoke = true;
                    say.segment(t);
                }
            } else interim += r[0]?.transcript || "";
        }
        say.partial(interim.trim());
    };
    rec.onerror = (e) => {
        if (e.error === "no-speech" || e.error === "aborted") return;
        live = false;
        say.error(
            e.error === "not-allowed" || e.error === "service-not-allowed"
                ? "denied"
                : "browser",
        );
    };
    rec.onend = () => {
        if (!live) return;
        const now = Date.now();
        if (now - lastStart < 400) {
            /* Immediately silent again: as long as something has already
         been recognized, that's just a pause in the conversation; if
         nothing has come through yet, this browser isn't listening at
         all. */
            if (++quickRestarts > (spoke ? 20 : 4)) {
                live = false;
                say.error("browser");
                return;
            }
        } else quickRestarts = 0;
        lastStart = now;
        try {
            rec.start();
        } catch (e) {
            live = false;
            say.error("browser");
        }
    };

    lastStart = Date.now();
    try {
        rec.start();
    } catch (e) {
        say.error("browser");
        return null;
    }
    return {
        mode: "browser",
        stop() {
            live = false;
            say.partial("");
            try {
                rec.stop();
            } catch (e) {}
        },
    };
}
