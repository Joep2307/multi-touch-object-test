import { ui } from "../state";
import { L } from "./L";
import type { Lang } from "../types";

/* A mark stores its topic as the label that was on the puck at the time, not
   as a key: the ring can just as easily be filled from the knowledge graph,
   and those themes are free text. Switching language would therefore leave
   every mark made before the switch reading "Veiligheid" on an English table.

   So we look the stored label up in the built-in list of every language. Found
   it, then the same position in the current language is what belongs on
   screen;
   not found, then it came from the graph or from an older list and the stored
   text is the best there is. Nothing is rewritten in storage — the label a
   mark was made with stays what is saved and exported. */
export function topicLabel(topic: string): string {
    for (const lang of Object.keys(L) as Lang[]) {
        const i = L[lang].topics.indexOf(topic);
        if (i >= 0) return L[ui.lang].topics[i] ?? topic;
    }
    return topic;
}
