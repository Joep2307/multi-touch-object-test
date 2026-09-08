import { HardwareControl } from "./HardwareControl";

/* A keyboard attached to the table: the developer's way in.
 *
 * Modelled rather than special-cased so that a shortcut used during a
 * session is recorded like any other act. Debugging a session
 * afterwards is much harder when half of what happened went
 * unrecorded because it came from a key.
 */
export class KeyboardControl extends HardwareControl {}
