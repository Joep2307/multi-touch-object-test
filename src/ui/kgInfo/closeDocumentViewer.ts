import { el } from "../../dom";

export function closeDocumentViewer(): void {
    el("documentViewer").classList.remove("open");
    el<HTMLIFrameElement>("documentViewerFrame").src = "about:blank";
}
