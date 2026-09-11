import { templates } from "../state";
import { puckMode } from "../ui";
import type { Template } from "../types";

/* Which list counts depends on the mode: in puck mode only your own pucks
   -- plus the duo, which is always allowed to join, because it identifies
   itself by the shape of the pair and not by a learned template. */
export const activeTemplates = (): Template[] =>
    puckMode()
        ? [...templates.own, ...templates.list.filter((t) => t.nest)]
        : templates.list;
