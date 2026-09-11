import { topics } from "../../i18n";
import type { Track } from "../../types";

export const puckTopic = (t: Track): string => {
    const list = topics();
    /* De taaltabel levert altijd onderwerpen; een lege lijst zou
       betekenen dat de vertalingen niet geladen zijn, en dan is een
       lege ring eerlijker dan een willekeurig onderwerp. */
    return list[(t.topicIdx || 0) % list.length] ?? list[0] ?? "";
};
