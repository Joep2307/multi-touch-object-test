import type { RingDiag } from "../types/RingDiag";

/* "The pucks are recognised badly" can be many things: the table doesn't
   see the feet, it sees them at the wrong size, or it hesitates between two
   pucks. That difference can't be seen at the table and can't be guessed
   from a distance, so the recognition keeps its own last verdict here and
   `drawPuckDiag` puts it next to the puck. Only while touch debugging is
   on; otherwise nothing is kept. */
export const diag: { ring: RingDiag | null } = { ring: null };
