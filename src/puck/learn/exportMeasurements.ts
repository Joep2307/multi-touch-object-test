import { CFG } from "../../config";
import { download } from "../../dom";
import { ui, view } from "../../state";
import { activeTemplates } from "../activeTemplates";
import { tplLongest } from "../tplLongest";

export function exportMeasurements(): void {
    download(
        "puck-measurements.json",
        JSON.stringify(
            {
                screenDiagIn: CFG.screenDiagIn,
                pxPerMM: +view.pxPerMM.toFixed(3),
                tolerance: ui.tolerance,
                templates: activeTemplates().map((t) => ({
                    id: t.id,
                    verdict: t.verdict,
                    ratios: t.ratios,
                    longestMM: +tplLongest(t).toFixed(1),
                    learnedAt: t.learnedAt || null,
                })),
            },
            null,
            2,
        ),
        "application/json",
    );
}
