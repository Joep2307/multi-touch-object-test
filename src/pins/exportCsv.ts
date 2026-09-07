import { download } from "../dom/download";
import { el } from "../dom/el";
import { pins } from "../state/pins";

export function exportCsv(): void {
    download(
        el<HTMLInputElement>("sess").value + ".csv",
        "lat,lng,verdict,topic,title,description,transcript,time\n" +
            pins.list
                .map((p) =>
                    [
                        p.lat,
                        p.lng,
                        p.verdict,
                        p.topic,
                        '"' + (p.title || "").replace(/"/g, '""') + '"',
                        '"' +
                            (p.description || p.note || "").replace(
                                /"/g,
                                '""',
                            ) +
                            '"',
                        '"' + (p.transcript || "").replace(/"/g, '""') + '"',
                        p.t,
                    ].join(","),
                )
                .join("\n"),
        "text/csv",
    );
}
