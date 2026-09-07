import { kg } from "./kg";

/* ── The document itself ────────────────────────────────────────────────
   The list of titles only becomes useful once you can tap on it. */
export function fileUrl(docId: string): string {
    return kg.client ? kg.client.fileUrl(docId) : "";
}
