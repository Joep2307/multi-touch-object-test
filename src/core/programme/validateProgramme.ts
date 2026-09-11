import type { EffectDefinition } from "../behaviour/EffectDefinition";
import type { EventType } from "../events/EventType";
import type { ProgrammeDefinition } from "./ProgrammeDefinition";
import type { ValidationError } from "./ValidationError";

const CONDITION_TYPES = new Set([
    "kind",
    "role",
    "state",
    "mode",
    "variable",
    "distance",
    "relation",
    "affordance",
    "region",
    "property",
]);

const EFFECT_TYPES = new Set<EffectDefinition["type"]>([
    "changeState",
    "changeMode",
    "assignRole",
    "updateVariable",
    "emitEvent",
    "startTimer",
    "changePresentation",
    "playSound",
    "appendToLog",
]);

const CORE_EVENT_TYPES = new Set<EventType>([
    "contact.started",
    "contact.moved",
    "contact.ended",
    "physical.detected",
    "physical.moved",
    "physical.rotated",
    "physical.tapped",
    "physical.swiped",
    "physical.shaken",
    "physical.removed",
    "physical.enteredRegion",
    "physical.exitedRegion",
    "physical.nearPhysical",
    "state.entered",
    "state.exited",
    "mode.changed",
]);

/* Every way a programme can be wrong that the compiler cannot see.
 *
 * A programme is JSON, so the compiler checks exactly one side of the
 * boundary and nothing on the other. This is the other side, and it
 * runs at boot and in a unit test over every programme file in the
 * repo — because a dangling id that only shows up when someone taps a
 * particular puck in a particular mode is a fault that will be found
 * at the table, in front of people, or not at all.
 *
 * Every error is collected rather than thrown, so a programme with six
 * mistakes reports six. Failing on the first means six runs to find
 * them, and whoever is editing the file is usually the person least
 * able to guess what the seventh will be.
 */
export function validateProgramme(
    programme: ProgrammeDefinition,
): readonly ValidationError[] {
    /* Shape first. Everything below reaches into lists and would throw
       on anything that merely parsed as JSON — `{}`, `null`, a
       screenshot someone renamed — and a loader that throws on a bad
       file cannot honestly say it returns a result instead. */
    const shape = checkShape(programme);
    if (shape.length > 0) return shape;

    const errors: ValidationError[] = [];
    const kinds = new Set(programme.kinds.map((k) => k.id));
    const roles = new Set(programme.roles.map((r) => r.id));
    const modes = new Set(programme.modes.map((m) => m.id));
    const actions = new Set<string>(programme.actions.map((a) => a.id));
    const machines = new Set(programme.stateMachines.map((m) => m.id));
    const presentations = new Set(programme.presentations.map((p) => p.id));
    const tables = new Set(programme.tablePresentations.map((t) => t.id));
    const stateIds = everyStateId(programme);
    const known: Known = {
        modes: new Set<string>(modes),
        roles: new Set<string>(roles),
        states: stateIds,
        presentations: new Set<string>(presentations),
        kinds: new Set<string>(kinds),
        regions: new Set<string>(
            programme.tablePresentations.flatMap((table) =>
                table.regions.map((region) => String(region.id)),
            ),
        ),
    };
    const emitted = new Set<string>(programme.externalEvents ?? []);
    for (const effect of everyEffect(programme)) {
        if (effect.type === "emitEvent") emitted.add(effect.eventType);
        if (effect.type === "startTimer") {
            emitted.add(`custom.timer.${effect.name}`);
        }
    }

    const need = (
        ok: boolean,
        where: string,
        field: string,
        message: string,
    ): void => {
        if (!ok) errors.push({ where, field, message });
    };

    errors.push(...checkDuplicates(programme));

    need(
        modes.has(programme.initialModeId),
        programme.id,
        "initialModeId",
        `No mode called "${programme.initialModeId}" is defined.`,
    );

    for (const kind of programme.kinds) {
        need(
            kind.defaultRoleId === undefined || roles.has(kind.defaultRoleId),
            kind.id,
            "defaultRoleId",
            `No role called "${String(kind.defaultRoleId)}" is defined.`,
        );
        need(
            kind.stateMachineId === undefined ||
                machines.has(kind.stateMachineId),
            kind.id,
            "stateMachineId",
            `No state machine called "${String(kind.stateMachineId)}" is ` +
                `defined.`,
        );
        need(
            kind.presentationId === undefined ||
                presentations.has(kind.presentationId),
            kind.id,
            "presentationId",
            `No presentation called "${String(kind.presentationId)}" is ` +
                `defined.`,
        );
        for (const signature of kind.signatures) {
            need(
                signature.contactCount === signature.geometry.expectedCount,
                signature.id,
                "contactCount",
                `Says ${String(signature.contactCount)} feet but its ` +
                    `geometry expects ` +
                    `${String(signature.geometry.expectedCount)}.`,
            );
            need(
                signature.family !== "slot" ||
                    signature.slotCode !== undefined,
                signature.id,
                "slotCode",
                "A slot signature with no code has no orientation.",
            );
        }
    }

    errors.push(...checkSeparable(programme));

    for (const machine of programme.stateMachines) {
        const states = new Set(machine.states.map((s) => s.id));
        need(
            states.has(machine.initialStateId),
            machine.id,
            "initialStateId",
            `"${machine.initialStateId}" is not one of its states.`,
        );
        for (const state of machine.states) {
            errors.push(
                ...checkEffects(
                    state.id,
                    [...state.entryEffects, ...state.exitEffects],
                    known,
                ),
            );
            for (const id of state.enabledActionIds) {
                need(
                    actions.has(id),
                    state.id,
                    "enabledActionIds",
                    `No action called "${id}" is defined.`,
                );
            }
        }
        for (const transition of machine.transitions) {
            need(
                states.has(transition.fromStateId),
                transition.id,
                "fromStateId",
                `"${transition.fromStateId}" is not a state of ` +
                    `"${machine.id}".`,
            );
            need(
                states.has(transition.toStateId),
                transition.id,
                "toStateId",
                `"${transition.toStateId}" is not a state of ` +
                    `"${machine.id}".`,
            );
            errors.push(
                ...checkRule(
                    transition.id,
                    transition.trigger.eventType,
                    transition.conditions,
                    transition.effects,
                    emitted,
                    known,
                    transition.trigger.sourceFilter,
                    transition.trigger.targetFilter,
                ),
            );
        }
    }

    for (const action of programme.actions) {
        errors.push(
            ...checkRule(
                action.id,
                action.trigger.eventType,
                action.conditions,
                action.effects,
                emitted,
                known,
                action.trigger.sourceFilter,
                action.trigger.targetFilter,
            ),
        );
    }

    for (const mode of programme.modes) {
        for (const id of mode.enabledActionIds) {
            need(
                actions.has(id),
                mode.id,
                "enabledActionIds",
                `No action called "${id}" is defined.`,
            );
        }
        for (const id of mode.enabledRoleIds) {
            need(
                roles.has(id),
                mode.id,
                "enabledRoleIds",
                `No role called "${id}" is defined.`,
            );
        }
        errors.push(
            ...checkEffects(
                mode.id,
                [...mode.entryEffects, ...mode.exitEffects],
                known,
            ),
        );
        need(
            mode.tablePresentationId === undefined ||
                tables.has(mode.tablePresentationId),
            mode.id,
            "tablePresentationId",
            `No table presentation called ` +
                `"${String(mode.tablePresentationId)}" is defined.`,
        );
        for (const [kindId, stateId] of Object.entries(
            mode.initialStateAssignments ?? {},
        )) {
            need(
                kinds.has(kindId as never),
                mode.id,
                "initialStateAssignments",
                `No kind called "${kindId}" is defined.`,
            );
            need(
                stateIds.has(stateId),
                mode.id,
                "initialStateAssignments",
                `No state called "${String(stateId)}" is defined.`,
            );
        }
    }

    for (const role of programme.roles) {
        for (const kindId of role.eligiblePhysicalKinds ?? []) {
            need(
                kinds.has(kindId),
                role.id,
                "eligiblePhysicalKinds",
                `No kind called "${kindId}" is defined.`,
            );
        }
        need(
            role.maximumAssignments === undefined ||
                role.minimumAssignments === undefined ||
                role.minimumAssignments <= role.maximumAssignments,
            role.id,
            "minimumAssignments",
            "A role cannot need more holders than it allows.",
        );
    }

    for (const table of programme.tablePresentations) {
        for (const [kindId, id] of Object.entries(
            table.physicalPresentations,
        )) {
            need(
                kinds.has(kindId as never),
                table.id,
                "physicalPresentations",
                `No kind called "${kindId}" is defined.`,
            );
            need(
                presentations.has(id),
                table.id,
                "physicalPresentations",
                `No presentation called "${String(id)}" is defined.`,
            );
        }
        for (const [stateId, id] of Object.entries(
            table.statePresentations ?? {},
        )) {
            need(
                known.states.has(stateId),
                table.id,
                "statePresentations",
                `No state called "${stateId}" is defined.`,
            );
            need(
                presentations.has(id),
                table.id,
                "statePresentations",
                `No presentation called "${String(id)}" is defined.`,
            );
        }
        for (const id of table.globalPresentations ?? []) {
            need(
                presentations.has(id),
                table.id,
                "globalPresentations",
                `No presentation called "${String(id)}" is defined.`,
            );
        }
        for (const region of table.regions) {
            need(
                region.presentationId === undefined ||
                    presentations.has(region.presentationId),
                region.id,
                "presentationId",
                `No presentation called ` +
                    `"${String(region.presentationId)}" is defined.`,
            );
            for (const kindId of region.acceptedPhysicalKinds ?? []) {
                need(
                    kinds.has(kindId),
                    region.id,
                    "acceptedPhysicalKinds",
                    `No kind called "${kindId}" is defined.`,
                );
            }
            for (const roleId of region.acceptedRoles ?? []) {
                need(
                    roles.has(roleId),
                    region.id,
                    "acceptedRoles",
                    `No role called "${roleId}" is defined.`,
                );
            }
        }
    }

    return errors;
}

/* A trigger, its conditions and its effects, checked once — because an
   action and a transition are two applications of one grammar and a
   second copy of these checks would eventually drift from the first. */
function checkRule(
    where: string,
    eventType: EventType,
    conditions: readonly {
        readonly type: string;
        readonly value?: unknown;
    }[],
    effects: readonly EffectDefinition[],
    emitted: ReadonlySet<string>,
    known: Known,
    sourceFilter: string | undefined,
    targetFilter: string | undefined,
): readonly ValidationError[] {
    const errors: ValidationError[] = [];
    if (!CORE_EVENT_TYPES.has(eventType) && !emitted.has(eventType)) {
        errors.push({
            where,
            field: "trigger.eventType",
            message:
                `"${eventType}" is neither a core event, nor one any ` +
                `effect in this programme emits, nor one it declares ` +
                `in externalEvents — so this rule can never fire.`,
        });
    }
    for (const condition of conditions) {
        if (!CONDITION_TYPES.has(condition.type)) {
            errors.push({
                where,
                field: "conditions",
                message: `"${condition.type}" is not a condition type.`,
            });
            continue;
        }
        /* And what it compares *against*. A misspelt role or region in
           a condition validated clean and then simply never matched,
           so the rule silently did nothing — the exact dangling-id
           fault this file exists to catch, one field further in. */
        for (const value of valuesOf(condition)) {
            const missing = unknownId(condition.type, value, known);
            if (missing !== null) {
                errors.push({ where, field: "conditions", message: missing });
            }
        }
    }
    for (const [field, filter] of [
        ["trigger.sourceFilter", sourceFilter],
        ["trigger.targetFilter", targetFilter],
    ] as const) {
        if (filter === undefined) continue;
        if (
            known.kinds.has(filter) ||
            known.roles.has(filter) ||
            known.regions.has(filter)
        ) {
            continue;
        }
        errors.push({
            where,
            field,
            message:
                `"${filter}" is not a kind, a role or a region. A filter ` +
                `that matches nothing means this rule never fires.`,
        });
    }
    errors.push(...checkEffects(where, effects, known));
    return errors;
}

/* Effects, wherever they appear: on an action, on a transition, on a
   state's way in or out, on a mode's.
 *
 * One function for all five, because the check has to be the same in
 * all five. It was only applied to the two inside a rule, so a
 * misspelt effect on a mode validated clean and then threw from the
 * middle of a session — and the table's diagnostic catch tears the
 * whole model down when that happens, so a typo cost the afternoon
 * rather than the load. */
function checkEffects(
    where: string,
    effects: readonly EffectDefinition[],
    known: Known,
): readonly ValidationError[] {
    const errors: ValidationError[] = [];
    for (const effect of effects) {
        if (!EFFECT_TYPES.has(effect.type)) {
            errors.push({
                where,
                field: "effects",
                message: `"${String(effect.type)}" is not an effect type.`,
            });
            continue;
        }
        const missing = danglingTarget(effect, known);
        if (missing !== null) {
            errors.push({ where, field: "effects", message: missing });
        }
    }
    return errors;
}

type Known = {
    readonly modes: ReadonlySet<string>;
    readonly roles: ReadonlySet<string>;
    readonly states: ReadonlySet<string>;
    readonly presentations: ReadonlySet<string>;
    readonly kinds: ReadonlySet<string>;
    readonly regions: ReadonlySet<string>;
};

/* A condition may compare against one value or against a list of
   them; `in` and `has` take a list. */
function valuesOf(condition: { readonly value?: unknown }): readonly string[] {
    const value = condition.value;
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) {
        return value.filter((v): v is string => typeof v === "string");
    }
    return [];
}

/* Only the condition types whose values *are* ids are checked. A
   variable name or a distance has nothing to be checked against. */
function unknownId(type: string, value: string, known: Known): string | null {
    const sets: Readonly<Record<string, ReadonlySet<string>>> = {
        kind: known.kinds,
        role: known.roles,
        state: known.states,
        mode: known.modes,
        region: known.regions,
    };
    const set = sets[type];
    if (set === undefined || set.has(value)) return null;
    return `No ${type} called "${value}" is defined.`;
}

function danglingTarget(
    effect: EffectDefinition,
    known: Known,
): string | null {
    switch (effect.type) {
        case "changeMode":
            return known.modes.has(effect.modeId)
                ? null
                : `No mode called "${effect.modeId}" is defined.`;
        case "changeState":
            return known.states.has(effect.stateId)
                ? null
                : `No state called "${effect.stateId}" is defined.`;
        case "assignRole":
            return effect.roleId === null || known.roles.has(effect.roleId)
                ? null
                : `No role called "${effect.roleId}" is defined.`;
        case "changePresentation":
            return known.presentations.has(effect.presentationId)
                ? null
                : `No presentation called ` +
                      `"${effect.presentationId}" is defined.`;
        default:
            return null;
    }
}

/* Two definitions under one id.
 *
 * Every set the validator builds collapses them, so a duplicate was
 * invisible here and then threw out of `KindRegistry.register` —
 * after `ProgrammeLoader.load` had already cleared the registry, so
 * the table lost the programme it had and got an exception instead of
 * a result. */
function checkDuplicates(
    programme: ProgrammeDefinition,
): readonly ValidationError[] {
    const errors: ValidationError[] = [];
    const groups: readonly [string, readonly { id: string }[]][] = [
        ["kinds", programme.kinds],
        ["actions", programme.actions],
        ["modes", programme.modes],
        ["roles", programme.roles],
        ["presentations", programme.presentations],
        ["tablePresentations", programme.tablePresentations],
        ["stateMachines", programme.stateMachines],
        ["gestures", programme.gestures],
        [
            "states",
            programme.stateMachines.flatMap((machine) => machine.states),
        ],
    ];
    for (const [field, entries] of groups) {
        const seen = new Set<string>();
        for (const entry of entries) {
            if (seen.has(entry.id)) {
                errors.push({
                    where: entry.id,
                    field,
                    message: "Defined twice.",
                });
            }
            seen.add(entry.id);
        }
    }
    return errors;
}

/* Is this a programme at all?
 *
 * Every list the validator walks has to be a list. This is the only
 * check that runs before the others, because the others assume their
 * answer. */
function checkShape(
    programme: ProgrammeDefinition,
): readonly ValidationError[] {
    if (typeof programme !== "object" || programme === null) {
        return [
            {
                where: "(file)",
                field: "(root)",
                message: "A programme has to be an object.",
            },
        ];
    }
    const lists = [
        "kinds",
        "gestures",
        "actions",
        "stateMachines",
        "modes",
        "roles",
        "settings",
        "presentations",
        "tablePresentations",
    ] as const;
    const errors: ValidationError[] = [];
    const where = String(programme.id ?? "(file)");
    for (const name of lists) {
        if (Array.isArray(programme[name])) continue;
        errors.push({
            where,
            field: name,
            message: "Missing, or not a list.",
        });
    }
    if (errors.length > 0) return errors;

    /* And every list *inside* them. The nine above were the only ones
       checked, so a kind with no `signatures`, a machine with no
       `states` or an action with no `trigger` still threw a TypeError
       out of a function documented to return errors rather than throw
       — which is precisely the half-edited file this check exists
       for. */
    for (const kind of programme.kinds) {
        if (!Array.isArray(kind?.signatures)) {
            errors.push({
                where: String(kind?.id ?? where),
                field: "signatures",
                message: "Missing, or not a list.",
            });
        }
        if (!Array.isArray(kind?.affordances)) {
            errors.push({
                where: String(kind?.id ?? where),
                field: "affordances",
                message: "Missing, or not a list.",
            });
        }
    }
    for (const machine of programme.stateMachines) {
        for (const field of ["states", "transitions"] as const) {
            if (Array.isArray(machine?.[field])) continue;
            errors.push({
                where: String(machine?.id ?? where),
                field,
                message: "Missing, or not a list.",
            });
        }
    }
    for (const rule of [
        ...programme.actions,
        ...programme.stateMachines.flatMap((m) =>
            Array.isArray(m?.transitions) ? m.transitions : [],
        ),
    ]) {
        if (typeof rule?.trigger?.eventType !== "string") {
            errors.push({
                where: String(rule?.id ?? where),
                field: "trigger",
                message: "Missing, or has no event type.",
            });
        }
        for (const field of ["conditions", "effects"] as const) {
            if (Array.isArray(rule?.[field])) continue;
            errors.push({
                where: String(rule?.id ?? where),
                field,
                message: "Missing, or not a list.",
            });
        }
    }
    for (const mode of programme.modes) {
        for (const field of [
            "enabledActionIds",
            "enabledRoleIds",
            "entryEffects",
            "exitEffects",
        ] as const) {
            if (Array.isArray(mode?.[field])) continue;
            errors.push({
                where: String(mode?.id ?? where),
                field,
                message: "Missing, or not a list.",
            });
        }
    }
    for (const state of programme.stateMachines.flatMap((m) =>
        Array.isArray(m?.states) ? m.states : [],
    )) {
        for (const field of [
            "enabledActionIds",
            "entryEffects",
            "exitEffects",
        ] as const) {
            if (Array.isArray(state?.[field])) continue;
            errors.push({
                where: String(state?.id ?? where),
                field,
                message: "Missing, or not a list.",
            });
        }
    }
    for (const table of programme.tablePresentations) {
        if (Array.isArray(table?.regions)) continue;
        errors.push({
            where: String(table?.id ?? where),
            field: "regions",
            message: "Missing, or not a list.",
        });
    }
    for (const presentation of programme.presentations) {
        if (Array.isArray(presentation?.bindings)) continue;
        errors.push({
            where: String(presentation?.id ?? where),
            field: "bindings",
            message: "Missing, or not a list.",
        });
    }
    return errors;
}

/* Two signatures that measure the same are two names for one object.
 *
 * The table cannot tell them apart, so whichever is registered first
 * wins every time and the other kind is simply never recognised —
 * silently, and only at the table, and only when someone puts the
 * unlucky puck down and nothing happens.
 *
 * Separable means: a different number of feet, or feet at a distance
 * that differs by more than the tolerance either of them claims. It
 * is a coarse test and deliberately so. A finer one would be a second
 * recogniser, which this plan promised not to build; what is wanted
 * here is to catch two kinds nobody could ever distinguish, not to
 * rank the ones that are merely similar.
 */
function checkSeparable(
    programme: ProgrammeDefinition,
): readonly ValidationError[] {
    const errors: ValidationError[] = [];
    const all = programme.kinds.flatMap((kind) =>
        kind.signatures.map((signature) => ({ kind, signature })),
    );
    for (let i = 0; i < all.length; i += 1) {
        for (let j = i + 1; j < all.length; j += 1) {
            const a = all[i];
            const b = all[j];
            if (a === undefined || b === undefined) continue;
            if (a.kind.id === b.kind.id) continue;
            if (a.signature.contactCount !== b.signature.contactCount) {
                continue;
            }
            const apart = Math.abs(
                a.signature.geometry.footRadiusMM -
                    b.signature.geometry.footRadiusMM,
            );
            const tolerance = Math.max(
                a.signature.distanceToleranceMM,
                b.signature.distanceToleranceMM,
            );
            if (apart > tolerance) continue;
            errors.push({
                where: a.signature.id,
                field: "geometry",
                message:
                    `Cannot be told apart from "${b.signature.id}": both ` +
                    `expect ${String(a.signature.contactCount)} feet and ` +
                    `their radii are ${apart.toFixed(2)} mm apart, within ` +
                    `a tolerance of ${String(tolerance)} mm.`,
            });
        }
    }
    return errors;
}

function* everyEffect(
    programme: ProgrammeDefinition,
): Generator<EffectDefinition> {
    for (const action of programme.actions) yield* action.effects;
    for (const machine of programme.stateMachines) {
        for (const state of machine.states) {
            yield* state.entryEffects;
            yield* state.exitEffects;
        }
        for (const transition of machine.transitions)
            yield* transition.effects;
    }
    for (const mode of programme.modes) {
        yield* mode.entryEffects;
        yield* mode.exitEffects;
    }
}

function everyStateId(programme: ProgrammeDefinition): ReadonlySet<string> {
    const ids = new Set<string>();
    for (const machine of programme.stateMachines) {
        for (const state of machine.states) ids.add(state.id);
    }
    return ids;
}
