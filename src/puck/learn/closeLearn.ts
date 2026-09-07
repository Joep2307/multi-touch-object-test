import { el } from "../../dom/el";
import { learn } from "../../state/learn";

export function closeLearn(): void {
    learn.open = false;
    el("learn").style.display = "none";
}
