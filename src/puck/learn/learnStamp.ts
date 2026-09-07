import { L } from "../../i18n/L";
import { tr } from "../../i18n/tr";
import { ui } from "../../state/ui";
import type { Template } from "../../types/Template";

/* "learned 3 Sep" or "not learned yet". */
export function learnStamp(t: Template): string {
    if (!t.learnedAt) return tr("recogFactory");
    const d = new Date(t.learnedAt);
    return tr(
        "recogLearned",
        isNaN(d.getTime())
            ? ""
            : d.toLocaleDateString(L[ui.lang].locale as string, {
                  day: "numeric",
                  month: "short",
              }),
    );
}
