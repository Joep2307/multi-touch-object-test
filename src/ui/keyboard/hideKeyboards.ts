import { keyboards } from "../../state";
import { hideKeyboard } from "./hideKeyboard";

export function hideKeyboards(blur = false): void {
    for (const kb of keyboards.list) hideKeyboard(kb, blur);
}
