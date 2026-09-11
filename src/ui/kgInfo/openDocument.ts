import { el } from "../../dom";
import { tr } from "../../i18n";
import { fileUrl } from "../../kg";

/* Keep document navigation within a closable layer. The iframe is deliberately
   cleared on close so an error page cannot linger in the next document. */
export function openDocument(id: string, title: string): void {
    const url = fileUrl(id);
    if (!url) return;
    el("documentViewerTitle").textContent = title || tr("document");
    el<HTMLIFrameElement>("documentViewerFrame").src = url;
    el("documentViewer").classList.add("open");
    el("closeDocumentViewer").focus();
}
