import type { Template } from "../types/Template";

/* The small puck of the duo: it carries tools, not a verdict. */
export const isToolPuck = (t: Template | null | undefined): boolean =>
    t?.role === "tool";
