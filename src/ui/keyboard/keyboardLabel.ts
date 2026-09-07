import { tr } from "../../i18n/tr";

export const keyboardLabel = (key: string): string =>
    (
        ({
            shift: "⇧",
            backspace: "⌫",
            space: tr("keySpace"),
            enter: tr("keyEnter"),
            close: tr("keyClose"),
        }) as Record<string, string>
    )[key] || key;
