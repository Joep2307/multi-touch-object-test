import type { Template } from "./Template";

/* One recognised puck in one frame: which kind, where, how rotated.
   `held` marks a puck that was kept alive on four feet instead of five. */
export interface Detection {
    tpl: Template;
    conf: number;
    x: number;
    y: number;
    angle: number;
    held?: boolean;
}
