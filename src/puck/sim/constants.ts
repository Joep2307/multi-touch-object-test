/* The stride between one drag copy's contact ids and the next's.
 *
 * Only has to be at least as large as the most feet any template has,
 * which is nine for the widest grid code. Sixteen leaves room and keeps
 * the arithmetic readable in a log. */
export const PADS_PER_SIM_PUCK = 16;
