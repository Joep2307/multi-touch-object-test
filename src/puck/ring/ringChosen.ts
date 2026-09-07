import type { Track } from "../../types/Track";

/* Which option at this level counts as chosen: in the main menu, the mode
   the puck is in; in the topic menu, the chosen topic. */
export function ringChosen(t: Track): number {
    if (t.menu === "topics") return t.topicIdx;
    return t.mode === "zoom" ? 1 : 0;
}
