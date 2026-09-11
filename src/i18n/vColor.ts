import { VERDICTS } from "../config";
import type { Verdict } from "../types";

/* The colour of a puck type. Throws on an unknown type — which is why
   everything coming out of storage first goes through validPin. */
export const vColor = (k: Verdict): string => {
    const v = VERDICTS.find((x) => x.key === k);
    if (!v) throw new Error("onbekend oordeel: " + k);
    return v.color;
};
