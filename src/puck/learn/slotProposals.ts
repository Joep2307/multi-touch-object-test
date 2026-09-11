import { SLOT_CODES } from "../../config";
import { codeText } from "../geometry";
import type { Template, Verdict } from "../../types";

/* The grid pucks the build drawing offers to print. They are not pucks the
   table knows: nothing recognises them until you lay one down and read it
   in with "Recognise puck", which puts the code on one of the four from the
   blueprint. So the number of pucks stays what it is, and you can print a
   sheet before deciding what each one will mean. */
export const slotProposals = (): Template[] =>
    SLOT_CODES.ringsMM.flatMap((mm) =>
        SLOT_CODES.codes.map((code): Template => ({
            id: `grid-${codeText(code, SLOT_CODES.slots)}-${mm}`,
            verdict: "good" as Verdict,
            slots: SLOT_CODES.slots,
            code,
            ringMM: mm,
            nameKey: "sheetProposal",
            color: "#7f8b9b",
        })),
    );
