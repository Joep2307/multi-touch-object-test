import { topics } from "../../i18n/topics";
import type { Track } from "../../types/Track";

export const puckTopic = (t: Track): string => {
    const list = topics();
    return list[(t.topicIdx || 0) % list.length] || list[0];
};
