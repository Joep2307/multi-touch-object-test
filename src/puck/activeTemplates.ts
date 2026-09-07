import { templates } from "../state/templates";
import type { Template } from "../types/Template";
import { puckMode } from "../ui/puckMode";

/* Which list counts depends on the mode: in puck mode only your own pucks,
   otherwise the four from the blueprint. */
export const activeTemplates = (): Template[] =>
    puckMode() ? templates.own : templates.list;
