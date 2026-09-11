import type { UiMode } from "../types/UiMode";

/* Table-first. The layout is written to the size of the table: someone
   standing, at about 80 cm, at an angle. The laptop is the exceptional case
   and therefore starts scaled down — it used to be the other way around and
   the table had to be scaled up by hand. */
export const defaultUiScale = (mode: UiMode): number =>
    mode === "laptop" ? 0.8 : 1;
