import type { PhysicalSignature } from "./PhysicalSignature";

/* The signature of a kind that fits these feet best, and how sure that
   is; what `matchSignature` answers. */
export type SignatureMatch = {
    readonly signature: PhysicalSignature;
    readonly confidence: number;
    /* How far ahead of the runner-up, as a fraction of the winner's
       own confidence. Zero means two of a kind's signatures explain
       these feet equally well, and picking either is a coin flip. */
    readonly margin: number;
};
