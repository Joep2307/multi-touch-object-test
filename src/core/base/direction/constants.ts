/* Angles are degrees, normalised to [0, 360). Zero points along +x
   (to the right) and grows towards +y, which is downwards on a
   screen — so clockwise as a visitor sees it. Stated once here
   because a sign error in an angle convention is invisible until a
   puck turns the wrong way. */
export const FULL_TURN_DEG = 360;

/* Below this the ray is parallel to that edge of the screen and the
   intersection is meaningless rather than merely far away. */
export const RAY_MIN_COMPONENT = 1e-9;
