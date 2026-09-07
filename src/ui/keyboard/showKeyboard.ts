import { tr } from "../../i18n/tr";
import { keyboards } from "../../state/keyboards";
import type { TextField } from "../../types/TextField";
import { tableUi } from "../tableUi";
import { hideKeyboard } from "./hideKeyboard";
import { kbOnSide } from "./kbOnSide";
import { kbPart } from "./kbPart";
import { keyboardSideFor } from "./keyboardSideFor";
import { liftEditorAboveKeyboard } from "./liftEditorAboveKeyboard";
import { renderKeyboard } from "./renderKeyboard";

export function showKeyboard(target: TextField): void {
    // Don't test on `ui.mode==="touch"`: `refreshKeyboardFields` turns off the
    // system keyboard for every table mode, so this keyboard must appear in
    // those same modes. Otherwise you can't type anything in puck mode.
    if (!tableUi() || !target.classList.contains("touch-type")) return;
    // The keyboard is on the side where typing happens; see keyboardSideFor.
    const kb = kbOnSide(keyboardSideFor(target));
    // The same field can't be attached to two keyboards at once.
    for (const other of keyboards.list)
        if (other !== kb && other.target === target) hideKeyboard(other);
    kb.target = target;
    kbPart(kb, "keyboardField").textContent =
        target.labels?.[0]?.textContent ||
        target.placeholder ||
        tr("typeHere");
    renderKeyboard(kb);
    kb.el.classList.add("visible");
    document.body.classList.add("keyboard-open");
    requestAnimationFrame(() => liftEditorAboveKeyboard(kb));
    setTimeout(() => liftEditorAboveKeyboard(kb), 360);
}
