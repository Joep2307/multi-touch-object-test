import type { StateId } from "../behaviour";
import type { ExtensionProperties } from "../programme";
import type { RoleId } from "../session";
import type { InstanceMotion } from "./InstanceMotion";
import type { InstancePose } from "./InstancePose";
import type { InstanceStatus } from "./InstanceStatus";
import type { KindId } from "./KindId";
import type { PhysicalId } from "./PhysicalId";
import type { SignatureId } from "./SignatureId";

/* The object on the table, as everything above recognition sees it.
 *
 * This is the model's hinge and the reason the recognition layer can
 * be replaced without touching anything else. Above here nobody sees a
 * `Base`, a trait, a solver or a contact: they see one flat, immutable
 * record per frame. A rule that fires on a tap, a region that notices
 * something enter it and a drawing that follows a pose all read the
 * same object, so they cannot disagree about where it was.
 *
 * Immutable, and rebuilt each frame rather than mutated. A consumer
 * that keeps one is keeping a photograph, which is what makes the
 * event log and a replay possible at all — a mutable instance recorded
 * in a log would quietly become the present.
 *
 * `id` does **not** depend on how many contacts are being seen. That
 * is the sentence the whole model rests on: drop one foot of a block
 * and it is the same block, Missing — not a new object.
 */
export type PhysicalInstance = {
    readonly id: PhysicalId;
    readonly kindId: KindId;
    /* Which of the kind's signatures it is being read by, or null for
       something that is not measured at all — the table itself, the
       reset button. */
    readonly signatureId: SignatureId | null;
    readonly roleId: RoleId | null;
    readonly pose: InstancePose | null;
    readonly motion: InstanceMotion | null;
    readonly currentStateId: StateId | null;
    readonly properties: ExtensionProperties;
    readonly firstSeenAt: number | null;
    readonly lastSeenAt: number | null;
    readonly status: InstanceStatus;
};
