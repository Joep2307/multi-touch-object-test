import { STAMP_FILES } from "../config";
import { tr } from "../i18n";
import { stampDate } from "./stampDate";

/* ---- Build stamp ---------------------------------------------------------
   Small line under each puck bar: when this page's files were last
   modified, and what time this page was loaded. This shows whether a
   refresh actually picked up the new version. The modification time comes
   from the files' Last-Modified header; if the server doesn't provide one,
   it falls back to document.lastModified. */
export async function showBuildStamp(): Promise<void> {
    // One stamp per puck bar (the table has two), plus a possible standalone
    // #buildStamp element. Hence a selector instead of a single id.
    const nodes = [
        ...document.querySelectorAll<HTMLElement>(".build-stamp, #buildStamp"),
    ];
    if (!nodes.length) return;
    const loaded = new Date();
    let newest: Date | null = new Date(document.lastModified);
    if (isNaN(newest.getTime())) newest = null;
    await Promise.all(
        STAMP_FILES.map(async (u) => {
            try {
                const r = await fetch(u + "?stamp=" + Date.now(), {
                    method: "HEAD",
                    cache: "no-store",
                });
                const h = r.headers.get("last-modified");
                if (!h) return;
                const d = new Date(h);
                if (isNaN(d.getTime())) return;
                if (!newest || d > newest) newest = d;
            } catch (e) {}
        }),
    );
    const geladen = loaded.toLocaleTimeString(tr("locale"), {
        hour: "2-digit",
        minute: "2-digit",
    });
    const txt =
        (newest ? tr("stampUpdated", stampDate(newest)) : tr("stampUnknown")) +
        tr("stampLoaded", geladen);
    for (const node of nodes) node.textContent = txt;
}
