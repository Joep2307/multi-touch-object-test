/* Radius of the viewing hole at the heart of the puck, as a fraction of the
   puck radius -- which is the same fraction as the hole's diameter over the
   puck's. The printed puck is 80 mm across with a 56 mm window, so the
   fraction is 56 / 80, and what it leaves is a rim 12 mm wide whose middle
   sits at 34 mm: `ringRadiusMM`, the circle the feet stand on. Those three
   numbers are one measurement, not three settings.

   At 0.58 the drawn hole was 46,4 mm and the black band lay 4,8 mm over the
   real window all the way round, which is what made the map jump when a
   puck was put down.

   The sight scales together with the hole; the labels sit in the black band
   outside it. */
export const PUCK_HOLE = 0.7;
