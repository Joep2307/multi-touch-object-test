import { download, el } from "../dom";
import { pins } from "../state";

export function exportGeoJson(): void {
    download(
        el<HTMLInputElement>("sess").value + ".geojson",
        JSON.stringify(
            {
                type: "FeatureCollection",
                features: pins.list.map((p) => ({
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [p.lng, p.lat] },
                    properties: {
                        verdict: p.verdict,
                        topic: p.topic,
                        title: p.title || "",
                        description: p.description || p.note || "",
                        transcript: p.transcript || "",
                        contact: p.contact,
                        time: p.t,
                    },
                })),
            },
            null,
            2,
        ),
        "application/geo+json",
    );
}
