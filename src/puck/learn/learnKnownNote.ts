import { tr } from "../../i18n";
import { learn } from "../../state";
import { learnedTemplates } from "./learnedTemplates";

/* If a learned puck is lying there but isn't recognised, its points simply
   count along and you sit staring at "six contact points" without knowing
   why. Then the window says so itself. */
export function learnKnownNote(): string {
    if (learn.known) return tr("recogKnownOnTable", learn.known);
    const n = learnedTemplates().length;
    return n ? tr("recogNoneKnownSeen", n) : "";
}
