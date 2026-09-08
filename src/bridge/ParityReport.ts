/* What the two pipelines disagreed about on one frame.
 *
 * Kept as data rather than logged on the spot so it can be counted,
 * sorted and shown on the glass. A divergence that happens on four
 * frames out of ten thousand is a different problem from one that
 * happens every frame, and a stream of console lines cannot tell you
 * which you have.
 */
export type ParityReport = {
    readonly at: number;
    readonly trackId: string;
    readonly kindId: string;
    /* Absent when only one of the two pipelines saw the puck at all —
       which is itself the most interesting kind of divergence. */
    readonly centreOffPX: number | null;
    readonly angleOffDeg: number | null;
    readonly seenByOld: boolean;
    readonly seenByNew: boolean;
    readonly angleKnownByOld: boolean;
    readonly angleKnownByNew: boolean;
};
