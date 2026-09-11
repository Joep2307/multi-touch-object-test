import { activeTemplates } from "../activeTemplates";
import type { Template } from "../../types";

/* Only what the table really measured counts as "known". A factory triangle
   that happens to resemble the puck you are putting down must not eat your
   measurement -- that puck has never been learned. */
export const learnedTemplates = (): Template[] =>
    activeTemplates().filter((t) => t.learnedAt);
