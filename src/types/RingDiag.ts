/* What the recognition made of the best ring it saw this frame; only kept
   while touch debugging is on, for `drawPuckDiag` to put next to the
   puck. */
export interface RingDiag {
    err: number;
    legs: number;
    mm: number;
    spread: number;
    list: { name: string; err: number }[];
}
