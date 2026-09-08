import { HardwareControl } from "./HardwareControl";

/* The USB button beside the table.
 *
 * It reports itself as a keypress, and which key it sends is learned
 * rather than assumed. Held for 700 ms before it counts, so a knock
 * cannot wipe a session.
 */
export class ResetButton extends HardwareControl {}
