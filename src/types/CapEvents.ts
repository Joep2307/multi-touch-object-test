import type { CapKind } from "./CapKind";
import type { CapReason } from "./CapReason";

/* What the capture module tells whoever wired it. */
export type CapEvents = {
    /* The state changed: button text, counter or "busy". */
    change?: () => void;
    /* A file is ready — or it failed, and then `blob` is null. */
    done?: (kind: CapKind, blob: Blob | null, reason: CapReason) => void;
};
