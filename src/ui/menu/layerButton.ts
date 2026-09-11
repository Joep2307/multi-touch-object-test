import { el } from "../../dom";
import { tr } from "../../i18n";
import { closeMenu } from "./closeMenu";

/* Choosing a map style closes the whole menu: the choice has been made and
   the table should be empty again. Clicking sets the select and fires its
   change event, so both always agree. */
export function layerButton(option: HTMLOptionElement): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "layer";
    b.dataset.set = option.value;
    b.textContent = option.dataset.i18n
        ? tr(option.dataset.i18n)
        : option.textContent;
    b.onclick = () => {
        el<HTMLSelectElement>("tiles").value = option.value;
        el("tiles").dispatchEvent(new Event("change"));
        closeMenu();
    };
    return b;
}
