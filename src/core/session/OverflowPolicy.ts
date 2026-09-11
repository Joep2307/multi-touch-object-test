/* What happens when one more object wants a role than the role allows.
 *
 *   reject                 the newcomer gets nothing
 *   queue                  it waits, and takes the next place
 *   replaceOldest          the one who has held it longest gives it up
 *   replaceLowestPriority  the least important holder gives it up
 *   allowTemporarily       everyone holds it, over the cap
 *
 * This exists because the table is physical. Software can refuse to
 * create a ninth voter; a table cannot stop a ninth block being put
 * down. The model's answer is to make the case sayable rather than to
 * design it away, and to make it a property of the role — taking over
 * is right for a single Supervisor and wrong for a queue of Voters.
 */
export type OverflowPolicy =
    | "reject"
    | "queue"
    | "replaceOldest"
    | "replaceLowestPriority"
    | "allowTemporarily";
