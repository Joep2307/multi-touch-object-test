import { CFG } from "../../config";
import { download } from "../../dom";
import { ui } from "../../state";
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
