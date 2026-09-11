/* How far a contact has to move before it is worth saying so.
 *
 * A touch driver reports a new position every frame whether or not
 * anything moved, so without a floor `contact.moved` would be the
 * loudest event on the table by two orders of magnitude and would
 * carry no information at all. Four pixels is about the noise a
 * resting finger makes.
 *
 * In pixels, unlike the figure below, and deliberately: a contact's
 * jitter is the digitiser's, reported in whatever units the driver
 * works in. It is not a physical distance anybody moved something. */
export const CONTACT_MOVE_MIN_PX = 4;

/* How far an *object* has to move before it is worth saying so.
 *
 * In millimetres, because this one is a physical act. A rule that
 * reacts to a puck being moved should mean the same thing on a
 * different screen, and the model refuses to assume a scale.
 *
 * **Measured**, on the seven recordings made at the table on
 * 9 September 2026. A still puck's three-foot centroid moves at most
 * 2.1 px between frames and 1.7 px at the ninety-ninth percentile,
 * which at the table's measured 2.02 px/mm is about one millimetre. A
 * puck being slid across the table steps a median of 5 px, or
 * 2.5 mm. Three millimetres therefore sits clear of the noise ceiling
 * and below a real movement step — and because the object's pose is
 * the *smoothed* centre, a resting puck cannot random-walk across it.
 *
 * One event per frame at sixty hertz was the alternative, and it is
 * the wrong granularity for a rule: it invites conditions that are
 * really about a frame rather than about a movement. */
export const PHYSICAL_MOVE_MIN_MM = 3;
