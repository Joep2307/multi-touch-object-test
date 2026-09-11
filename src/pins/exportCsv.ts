import { download, el } from "../dom";
import { pins } from "../state";

export function exportCsv(): void {
    download(
        el<HTMLInputElement>("sess").value + ".csv",
        "lat,lng,verdict,topic,title,description,transcript," +
            "contact_name,contact_email,contact_phone," +
            "contact_consent_at,time\n" +
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
                        '"' +
                            (p.contact?.name || "").replace(/"/g, '""') +
                            '"',
                        '"' +
                            (p.contact?.email || "").replace(/"/g, '""') +
                            '"',
                        '"' +
                            (p.contact?.phone || "").replace(/"/g, '""') +
                            '"',
                        p.contact?.consentAt || "",
                        p.t,
                    ].join(","),
                )
                .join("\n"),
        "text/csv",
    );
}
