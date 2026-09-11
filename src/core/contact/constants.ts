/* One id block per simulated copy, so the synthetic ids of two drag
   copies can never collide with each other or with a real touch id. */
export const SIM_CONTACT_ID_BLOCK = 100000;

/* Roughly a minute at 60 fps. A recording is a debugging aid, not an
   archive; past this it starts costing more memory than it is worth. */
export const RECORDING_MAX_FRAMES = 3600;

/* Bump when the shape of a recording changes, and keep the reader able
   to load the previous version. Fixtures outlive the code that wrote
   them.
 *
 * 2 added `status` to every contact. The recordings made at the table
 * on 9 September 2026 are version 1, and they are the only recordings
 * of real pucks that exist — so the reader keeps loading them. It can
 * afford to: a replay derives the statuses again rather than trusting
 * them, so a version 1 recording plays back as the frames it was
 * captured from. */
export const RECORDING_VERSION = 2;

/* The oldest recording this build still reads. */
export const RECORDING_MIN_VERSION = 1;
