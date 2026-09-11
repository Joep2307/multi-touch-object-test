import { CFG } from "../../config";
import { activeTemplates } from "../activeTemplates";
import { tplSpanMM } from "./tplSpanMM";

export const maxTplSpan = (): number =>
    activeTemplates().reduce(
        (m, t) => Math.max(m, tplSpanMM(t)),
        CFG.longestSideMM,
    );
