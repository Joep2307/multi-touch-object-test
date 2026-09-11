import type { ActionDefinition, StateMachineDefinition } from "../behaviour";
import type { EventType } from "../events";
import type { GestureDefinition } from "../gesture";
import type { PhysicalKindDefinition } from "../physical";
import type {
    PresentationDefinition,
    TablePresentation,
} from "../presentation";
import type {
    ModeDefinition,
    ModeId,
    RoleDefinition,
    Settings,
} from "../session";
import type { ExtensionProperties } from "./ExtensionProperties";

/* Everything a session runs, in one object.
 *
 * This is the file that makes "swappable per programme" true. A voting
 * session and a board game are two of these; everything to the right
 * of `InteractionEvent` in the loop comes from here, and everything to
 * the left is table infrastructure built once.
 *
 * Signatures are not a list of their own: they live on the kinds, which
 * is where they belong — a signature is one way of recognising one
 * kind, and a loose list of them would have to be stitched back on to
 * something anyway.
 *
 * `version` is the programme's own, not the model's. Two programmes at
 * different versions can be loaded by the same build, and a programme
 * that has been edited says so.
 */
export type ProgrammeDefinition = {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    readonly initialModeId: ModeId;
    readonly kinds: readonly PhysicalKindDefinition[];
    readonly gestures: readonly GestureDefinition[];
    readonly actions: readonly ActionDefinition[];
    readonly stateMachines: readonly StateMachineDefinition[];
    readonly modes: readonly ModeDefinition[];
    readonly roles: readonly RoleDefinition[];
    readonly settings: readonly Settings[];
    /* Custom events this programme expects from outside the model: a
       menu item chosen, a service answering, a key pressed.
     *
     * Declared rather than assumed, and that distinction is what
     * `validateProgramme` rests on. A trigger on a custom event has to
     * be either one some effect in this programme emits or one named
     * here, so a misspelt `custom.vote.cats` is caught while a
     * legitimate `custom.menu.capture` is not. Writing the first real
     * programme is what found this: a rule may perfectly well react to
     * something the host did, and without the field every such rule
     * looked like a typo. */
    readonly externalEvents?: readonly EventType[];
    readonly presentations: readonly PresentationDefinition[];
    readonly tablePresentations: readonly TablePresentation[];
    readonly properties?: ExtensionProperties;
};
