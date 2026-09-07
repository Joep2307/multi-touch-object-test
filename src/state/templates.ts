import { TPL_FACTORY } from "../config/TPL_FACTORY";
import type { Template } from "../types/Template";

/* The pucks the table knows about.

   `list` is the four from the blueprint; learning a new one overwrites one
   of them. `own` is the list from the puck stand: there's no fixed set
   there. What the table recognizes is exactly what has been learned and
   nothing else — no factory triangle as a fallback either, since then a
   table with nothing of yours placed on it yet would still point at
   something. That list is kept separate from `list`, in its own key, so the
   four from the blueprint are never overwritten by it. Two pucks may share
   the same type — two people each with a Problem puck is a normal table,
   not an error. */
export const templates = {
    list: TPL_FACTORY.map((t): Template => ({
        ...t,
        ...(t.ratios ? { ratios: [t.ratios[0], t.ratios[1]] } : {}),
        ...(t.angles ? { angles: [...t.angles] } : {}),
    })),
    own: [] as Template[],
    ownSeq: 0,
};
