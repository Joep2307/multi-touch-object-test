import { tr } from "../i18n/tr";

export function stampDate(d: Date): string {
    return d.toLocaleString(tr("locale"), {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
