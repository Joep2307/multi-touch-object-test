import { codeSlots } from "./codeSlots";

/* The code as you read it off the drawing: which slots carry a foot. */
export const codeText = (code: number, slots: number): string =>
    codeSlots(code, slots).join("·");
