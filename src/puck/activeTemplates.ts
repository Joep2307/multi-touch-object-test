import { templates } from "../state/templates";
import type { Template } from "../types/Template";
import { puckMode } from "../ui/puckMode";

/* Which list counts depends on the mode: in puck mode only your own pucks
   -- plus the duo, which is always allowed to join, because it identifies
   itself by the shape of the pair and not by a learned template. */
export const activeTemplates = (): Template[] =>
    puckMode()
        ? [...templates.own, ...templates.list.filter((t) => t.nest)]
        : templates.list;
