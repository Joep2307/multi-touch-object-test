/* The numbers the standard gesture definitions are made of.
 *
 * They are here rather than inside `defaultGestureDefinitions()`
 * because a function body is no place for a threshold: a programme
 * that wants a slower tap writes its own definitions, and being able
 * to read what the standard ones are made of is how anyone decides
 * whether they need to.
 *
 * The first four are today's table, moved out of the `TapPolicy` that
 * used to own them. They are unchanged in value, which is what makes
 * the move a rename rather than a retuning.
 */
export const TAP_MAX_MS = 300;
export const DOUBLE_TAP_GAP_MS = 400;
export const HOLD_MIN_MS = 700;
export const PRESS_MAX_MOVE_PX = 18;

/* A swipe has to cover ground and has to be quick about it. Below
   this it is a nudge; above the duration it is a drag, and a drag on
   this table is how the map is panned. */
export const SWIPE_MIN_PX = 90;
export const SWIPE_MAX_MS = 600;

/* Fires once per twelfth of a turn, which is the compartment width of
   a slot-coded puck — small enough for a dial to feel continuous,
   large enough that sensor noise cannot trigger it. */
export const ROTATE_STEP_DEG = 30;

/* Four direction changes inside a second, covering real distance and
   arriving nowhere. The net bound is what keeps a shake from also
   reading as a swipe. */
export const SHAKE_REVERSALS = 4;
export const SHAKE_WINDOW_MS = 1000;
export const SHAKE_MAX_NET_PX = 40;
export const SHAKE_MIN_TRAVEL_PX = 160;
export const SHAKE_MIN_STEP_PX = 8;
