/* One thing wrong with a programme, said precisely enough to fix.
 *
 * `where` is the definition's own id and `field` the field on it, so
 * an error reads as an address rather than as a description. "Mode
 * `Voting` enables action `cast_vot`, which is not defined" is a fix;
 * "invalid programme" is a morning.
 *
 * A list rather than an exception, because a programme with six
 * dangling ids should report six. Failing on the first would mean six
 * runs to find them, and whoever is editing the file is usually the
 * person least able to guess what the seventh will be.
 */
export type ValidationError = {
    readonly where: string;
    readonly field: string;
    readonly message: string;
};
