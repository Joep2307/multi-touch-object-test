/* The controls can scale with the table: on a 43" screen sitting a metre
   away, 100% is too small; on a laptop, 150% is ridiculous. Fixed steps
   instead of a slider, because this is operated with a finger. `zoom` does
   the work in CSS; only the value lives here. All positioning done in
   JavaScript works in screen pixels and must therefore be divided by this
   factor before it ends up as style.left/top on a panel. */
export const UI_SCALES = [0.7, 0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2];
