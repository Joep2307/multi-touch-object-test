/* How much further out an object has to go before it has left a
   region than it had to come in to have entered it.
 *
 * Five millimetres, which is about twice the millimetre of jitter the
 * table recordings show on a still puck's centre — enough that
 * something resting on the edge stays where it was put, small enough
 * that nobody notices the difference between the two edges. */
export const REGION_HYSTERESIS_MM = 5;
