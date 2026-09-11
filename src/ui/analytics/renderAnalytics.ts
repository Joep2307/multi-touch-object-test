import { VERDICTS } from "../../config";
import { el } from "../../dom";
import { topicLabel, tr, vName } from "../../i18n";
import { MV } from "../../map";
import { pins } from "../../state";
import { analyticsBar } from "./analyticsBar";
import { analyticsClusters } from "./analyticsClusters";
import { closeAnalytics } from "./closeAnalytics";
import { renderRecent } from "./renderRecent";

/* ── Session analysis ─────────────────────────────────────────────────
   The map is the place to make contributions; this window is the place to
   read them together. Groups are computed locally from the stored points,
   so even an offline session gets a usable overview. */
export function renderAnalytics(): void {
    const list = pins.list,
        total = list.length;
    renderRecent();
    el("analyticsIntro").textContent = total
        ? tr("analyticsIntro", total)
        : tr("analyticsNoData");
    const kpis = el("analyticsKpis");
    kpis.textContent = "";
    const notes = list.filter((p) =>
        (p.title || p.description || p.note || "").trim(),
    ).length;
    const clusters = analyticsClusters(),
        multi = clusters.filter((g) => g.items.length > 1).length;
    const largest = clusters[0]?.items.length || 0;
    [
        [String(total), tr("saidWhat")],
        [
            largest > 1 ? largest + "×" : "—",
            largest > 1 ? tr("analyticsHotspot") : tr("analyticsNoHotspot"),
        ],
        [
            total ? Math.round((notes / total) * 100) + "%" : "—",
            tr("analyticsNotes", notes, total),
        ],
    ].forEach(([value, label]) => {
        const d = document.createElement("div");
        d.className = "analytics-kpi";
        d.innerHTML = `<b>${value}</b><span>${label}</span>`;
        kpis.appendChild(d);
    });

    const types = el("analyticsTypes"),
        topicsBox = el("analyticsTopics"),
        places = el("analyticsPlaces"),
        relations = el("analyticsRelations"),
        quality = el("analyticsQuality");
    [types, topicsBox, places, relations, quality].forEach(
        (n) => (n.textContent = ""),
    );
    if (!total) {
        [types, topicsBox, places, relations, quality].forEach((n) => {
            const p = document.createElement("p");
            p.className = "empty";
            p.textContent = tr("analyticsNoData");
            n.appendChild(p);
        });
        return;
    }
    VERDICTS.forEach((v) =>
        types.appendChild(
            analyticsBar(
                vName(v.key),
                list.filter((p) => p.verdict === v.key).length,
                total,
                v.color,
            ),
        ),
    );
    const topicCounts = new Map<string, number>();
    list.forEach((p) =>
        topicCounts.set(
            topicLabel(p.topic),
            (topicCounts.get(topicLabel(p.topic)) || 0) + 1,
        ),
    );
    [...topicCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .forEach(([topic, n]) =>
            topicsBox.appendChild(analyticsBar(topic, n, total, "#7aa2f7")),
        );
    const hotspot = clusters.find((g) => g.items.length > 1);
    if (hotspot) {
        const callout = document.createElement("div");
        callout.className = "analytics-hotspot";
        callout.innerHTML =
            `<span>${tr("analyticsHotspot")}</span>` +
            `<b>${tr(
                "analyticsHotspotShare",
                hotspot.items.length,
                Math.round((hotspot.items.length / total) * 100),
            )}</b>`;
        places.appendChild(callout);
    }
    clusters
        .filter((g) => g.items.length > 1)
        .concat(clusters.filter((g) => g.items.length === 1))
        .slice(0, 6)
        .forEach((group) => {
            const item = document.createElement("button");
            item.className = "analytics-place";
            const themes = [
                ...new Set(group.items.map((p) => topicLabel(p.topic))),
            ].join(" · ");
            item.innerHTML =
                `<b>${group.items.length} ` +
                `${tr("puckCount", group.items.length)}</b>` +
                `<span>${tr("analyticsAt")} ` +
                `${group.center.lat.toFixed(4)}, ` +
                `${group.center.lng.toFixed(4)} · ${themes}</span>`;
            item.onclick = () => {
                MV.lat = group.center.lat;
                MV.lng = group.center.lng;
                MV.zoom = Math.max(MV.zoom, 16);
                closeAnalytics();
            };
            places.appendChild(item);
        });
    const pairs = new Map<string, number>();
    for (const group of clusters)
        for (let i = 0; i < group.items.length; i++)
            for (let j = i + 1; j < group.items.length; j++) {
                const left = group.items[i];
                const right = group.items[j];
                if (!left || !right) continue;
                const a = topicLabel(left.topic),
                    b = topicLabel(right.topic);
                if (a === b) continue;
                const key = [a, b].sort().join("| ");
                pairs.set(key, (pairs.get(key) || 0) + 1);
            }
    if (!pairs.size) {
        const p = document.createElement("p");
        p.className = "empty";
        p.textContent = tr("analyticsRelationNone");
        relations.appendChild(p);
    } else
        [...pairs.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .forEach(([pair, n]) =>
                relations.appendChild(
                    analyticsBar(
                        pair.replace("| ", " ↔ "),
                        n,
                        Math.max(...pairs.values()),
                        "#c48cff",
                    ),
                ),
            );
    quality.appendChild(
        analyticsBar(
            tr("analyticsNotes", notes, total),
            notes,
            total,
            "#39d8a4",
        ),
    );
    quality.appendChild(
        analyticsBar(
            tr("analyticsLocations", multi),
            multi,
            Math.max(1, clusters.length),
            "#ffd166",
        ),
    );
}
