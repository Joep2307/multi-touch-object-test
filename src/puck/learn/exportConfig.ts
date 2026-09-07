import { CFG } from "../../config/CFG";
import { download } from "../../dom/download";
import { ui } from "../../state/ui";
import { activeTemplates } from "../activeTemplates";

export function exportConfig(): void {
    download(
        "puck-config.json",
        JSON.stringify(
            {
                longestSideMM: CFG.longestSideMM,
                tolerance: ui.tolerance,
                templates: activeTemplates(),
            },
            null,
            2,
        ),
        "application/json",
    );
}
