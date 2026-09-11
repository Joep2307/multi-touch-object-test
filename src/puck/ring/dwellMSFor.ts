import { CFG } from "../../config";
import type { Track } from "../../types";

/* How long holding still at this level counts as a choice. In the topic menu
   you rotate past all the topics to read them; lingering along the way
   shouldn't count as a choice yet, so the time there is set much more
   generously. */
export const dwellMSFor = (t: Track): number =>
    t.menu === "topics" ? CFG.puckTopicDwellMS : CFG.puckDwellMS;
