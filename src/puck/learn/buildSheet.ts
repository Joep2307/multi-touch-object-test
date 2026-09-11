import { el } from "../../dom";
import { activeTemplates } from "../activeTemplates";
import { sheetCard } from "./sheetCard";
import { slotProposals } from "./slotProposals";

/* The blueprint: for each puck the pad positions in millimetres from the
   centre, and after them the grid pucks you could print but that the table
   doesn't know yet. */
export function buildSheet(): void {
    el("sheetGrid").innerHTML = [...activeTemplates(), ...slotProposals()]
        .map(sheetCard)
        .join("");
}
