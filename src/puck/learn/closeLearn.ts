import { el } from "../../dom";
import { learn } from "../../state";

export function closeLearn(): void {
    learn.open = false;
    el("learn").style.display = "none";
}
