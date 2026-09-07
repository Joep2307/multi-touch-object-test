/* The ring starts at the top. The first segment is centered on twelve
   o'clock, and the rest follow clockwise. Without this rotation, segment 0
   would start at the top-left, and then "the first option" wouldn't point
   at anything meaningful — at a table, up is the only orientation everyone
   reads the same way. The offset depends on the number of options (half a
   segment width minus a quarter turn), so it also holds for the topic list,
   which has more than four. */
export const ringOffset = (n: number): number => Math.PI / 2 - Math.PI / n;
