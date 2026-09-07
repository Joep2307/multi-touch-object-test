import { tableUi } from "../tableUi";
import { keyboardFields } from "./keyboardFields";

/* On a table the system keyboard is turned off; the custom keyboard takes
   its place. */
export function refreshKeyboardFields(): void {
    keyboardFields().forEach((field) => {
        field.classList.add("touch-type");
        if (tableUi()) field.setAttribute("inputmode", "none");
        else field.removeAttribute("inputmode");
    });
}
