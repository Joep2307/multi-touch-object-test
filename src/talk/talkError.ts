import { openNotes } from "../notes/openNotes";
import { talk } from "../state/talk";
import { setTalkMsg } from "./setTalkMsg";
import { stopTalk } from "./stopTalk";
import { talkView } from "./talkView";

export function talkError(key: string): void {
    const v = talkView() || openNotes()[0];
    // Wegvallende uitschrijfdienst: melden, maar door blijven opnemen.
    if (key === "backend") {
        setTalkMsg(v, "talkBackendGone", { warn: true });
        return;
    }
    if (talk.session) stopTalk(true);
    setTalkMsg(
        v,
        key === "denied"
            ? "talkDenied"
            : key === "insecure"
              ? "talkInsecure"
              : key === "browser"
                ? "talkBrowserGone"
                : "talkNoMic",
        { warn: true },
    );
}
