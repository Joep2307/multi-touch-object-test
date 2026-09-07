import { CFG } from "../config/CFG";
import { activeTemplates } from "./activeTemplates";
import { tplLongest } from "./tplLongest";

export const maxTplLongest = (): number =>
    activeTemplates().reduce(
        (m, t) => Math.max(m, tplLongest(t)),
        CFG.longestSideMM,
    );
