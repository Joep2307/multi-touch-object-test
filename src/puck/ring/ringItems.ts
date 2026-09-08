import { topics } from "../../i18n/topics";
import { tr } from "../../i18n/tr";
import type { RingItem } from "../../types/RingItem";
import type { Track } from "../../types/Track";

/* The only puck menu is the topic list. It appears after a center tap and
   choices are made by tapping their visible segments. */
export function ringItems(t: Track): RingItem[] {
    void t;
    return topics()
        .map((name): RingItem => ({ key: "topic", label: name }))
        .concat([{ key: "back", label: tr("puckBack") }]);
}
