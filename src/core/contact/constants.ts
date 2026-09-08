/* One id block per simulated copy, so the synthetic ids of two drag
   copies can never collide with each other or with a real touch id. */
export const SIM_CONTACT_ID_BLOCK = 100000;

/* Roughly a minute at 60 fps. A recording is a debugging aid, not an
   archive; past this it starts costing more memory than it is worth. */
export const RECORDING_MAX_FRAMES = 3600;

/* Bump when the shape of a recording changes, and keep the reader able
   to load the previous version. Fixtures outlive the code that wrote
   them. */
export const RECORDING_VERSION = 1;
