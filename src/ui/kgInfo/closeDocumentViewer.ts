import { el } from "../../dom/el";

export function closeDocumentViewer(): void {
    el("documentViewer").classList.remove("open");
    el<HTMLIFrameElement>("documentViewerFrame").src = "about:blank";
}
