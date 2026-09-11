/* How widely a setting applies.
 *
 * Listed from least to most specific, and that order is the whole
 * point: the effective value of a key is whatever the most specific
 * scope that defines it says. A tap interval can then be set once for
 * the table, overridden for the Voting mode, and overridden again for
 * one awkward kind of puck, without any of the three knowing about the
 * others.
 */
export type SettingScope =
    "global" | "session" | "mode" | "role" | "physicalKind";
