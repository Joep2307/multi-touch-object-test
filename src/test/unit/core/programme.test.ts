/* The programme: every definition a session runs, in one file.
 *
 * A programme is JSON, so the compiler checks exactly one side of the
 * boundary and nothing on the other. `validateProgramme` is the other
 * side, and these tests are what make it worth trusting — because a
 * dangling id that only shows up when someone taps a particular puck
 * in a particular mode is a fault that gets found at the table, in
 * front of people, or not at all.
 */
import { describe, expect, it } from "vitest";
import {
    KindRegistry,
    ProgrammeLoader,
    signatureFrom,
    validateProgramme,
} from "../../../core";
import type { ProgrammeDefinition } from "../../../core/programme";
import type {
    ActionId,
    StateId,
    StateMachineId,
    TransitionId,
} from "../../../core/behaviour";
import type { GestureId } from "../../../core/gesture";
import type { KindId, SignatureId } from "../../../core/physical";
import type { PresentationId, RegionId } from "../../../core/presentation";
import type { ModeId, RoleId } from "../../../core/session";

const TRIAD_FEET = [0, 132, 228].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: 40 * Math.cos(rad), y: 40 * Math.sin(rad) };
});

/* The smallest programme that does something: a token that can be
   voted with once. */
const valid = (): ProgrammeDefinition => ({
    id: "test.voting",
    name: "Voting",
    version: "1.0.0",
    initialModeId: "Voting" as ModeId,
    kinds: [
        {
            id: "VotingToken" as KindId,
            label: "Voting token",
            signatures: [
                signatureFrom(
                    "VotingToken/triad" as SignatureId,
                    "triad",
                    TRIAD_FEET,
                    80,
                    5,
                ),
            ],
            affordances: [],
            defaultRoleId: "Voter" as RoleId,
            stateMachineId: "token" as StateMachineId,
            presentationId: "token.shape" as PresentationId,
            legacy: false,
        },
    ],
    gestures: [
        {
            id: "gesture.tap" as GestureId,
            gesture: "tap",
            maxDurationMS: 300,
            maxDistancePX: 18,
        },
    ],
    actions: [
        {
            id: "cast_vote" as ActionId,
            name: "Cast a vote",
            trigger: { eventType: "physical.tapped" },
            conditions: [{ type: "state", operator: "eq", value: "Ready" }],
            effects: [
                { type: "updateVariable", key: "votes", add: 1 },
                { type: "emitEvent", eventType: "custom.vote.cast" },
            ],
        },
        {
            id: "tally" as ActionId,
            name: "Tally",
            trigger: { eventType: "custom.vote.cast" },
            conditions: [],
            effects: [{ type: "appendToLog", note: "a vote" }],
        },
    ],
    stateMachines: [
        {
            id: "token" as StateMachineId,
            name: "Token",
            initialStateId: "Ready" as StateId,
            states: [
                {
                    id: "Ready" as StateId,
                    name: "Ready",
                    enabledActionIds: ["cast_vote" as ActionId],
                    entryEffects: [],
                    exitEffects: [],
                },
                {
                    id: "Voted" as StateId,
                    name: "Voted",
                    enabledActionIds: [],
                    entryEffects: [],
                    exitEffects: [],
                },
            ],
            transitions: [
                {
                    id: "toVoted" as TransitionId,
                    fromStateId: "Ready" as StateId,
                    toStateId: "Voted" as StateId,
                    trigger: { eventType: "physical.tapped" },
                    conditions: [],
                    effects: [],
                },
            ],
        },
    ],
    modes: [
        {
            id: "Voting" as ModeId,
            name: "Voting",
            tablePresentationId: "table.voting" as PresentationId,
            enabledActionIds: ["cast_vote" as ActionId, "tally" as ActionId],
            enabledRoleIds: ["Voter" as RoleId],
            initialStateAssignments: {
                ["VotingToken" as KindId]: "Ready" as StateId,
            },
            entryEffects: [],
            exitEffects: [],
        },
    ],
    roles: [
        {
            id: "Voter" as RoleId,
            name: "Voter",
            overflowPolicy: "allowTemporarily",
            eligiblePhysicalKinds: ["VotingToken" as KindId],
        },
    ],
    settings: [
        {
            id: "s1",
            scope: "global",
            key: "tapMaxMS",
            value: 300,
        },
    ],
    presentations: [
        {
            id: "token.shape" as PresentationId,
            name: "Token",
            renderer: "shape",
            layer: 10,
            bindings: [{ target: "position", source: "pose.position" }],
        },
    ],
    tablePresentations: [
        {
            id: "table.voting" as PresentationId,
            name: "Voting table",
            regions: [
                {
                    id: "votingArea" as RegionId,
                    name: "Voting area",
                    shape: {
                        kind: "circle",
                        centreMM: { x: 100, y: 100 },
                        radiusMM: 50,
                    },
                    acceptedPhysicalKinds: ["VotingToken" as KindId],
                    acceptedRoles: ["Voter" as RoleId],
                },
            ],
            physicalPresentations: {
                ["VotingToken" as KindId]: "token.shape" as PresentationId,
            },
        },
    ],
});

const errorsFor = (
    change: (p: ProgrammeDefinition) => ProgrammeDefinition,
): readonly { where: string; field: string; message: string }[] =>
    validateProgramme(change(valid()));

describe("validateProgramme", () => {
    it("passes a programme with nothing wrong with it", () => {
        expect(validateProgramme(valid())).toEqual([]);
    });

    it("names the definition and the field, not just the problem", () => {
        /* "Mode Voting enables action cast_vot, which is not defined"
           is a fix. "Invalid programme" is a morning. */
        const errors = errorsFor((p) => ({
            ...p,
            modes: [
                { ...p.modes[0]!, enabledActionIds: ["cast_vot" as ActionId] },
            ],
        }));
        expect(errors).toHaveLength(1);
        expect(errors[0]?.where).toBe("Voting");
        expect(errors[0]?.field).toBe("enabledActionIds");
        expect(errors[0]?.message).toContain("cast_vot");
    });

    it("reports every mistake, not only the first", () => {
        /* Failing on the first means six runs to find six, and whoever
           is editing the file is the person least able to guess what
           the seventh will be. */
        const errors = errorsFor((p) => ({
            ...p,
            initialModeId: "Nonsense" as ModeId,
            roles: [
                {
                    ...p.roles[0]!,
                    eligiblePhysicalKinds: ["Missing" as KindId],
                },
            ],
        }));
        expect(errors.length).toBeGreaterThanOrEqual(2);
    });

    it("catches a mode nobody defined", () => {
        expect(
            errorsFor((p) => ({ ...p, initialModeId: "Nope" as ModeId })),
        ).toHaveLength(1);
    });

    it("catches a kind pointing at a role, machine or drawing that is not there", () => {
        expect(
            errorsFor((p) => ({
                ...p,
                kinds: [
                    {
                        ...p.kinds[0]!,
                        defaultRoleId: "Ghost" as RoleId,
                        stateMachineId: "Ghost" as StateMachineId,
                        presentationId: "Ghost" as PresentationId,
                    },
                ],
            })),
        ).toHaveLength(3);
    });

    it("catches a machine starting in a state it does not have", () => {
        const errors = errorsFor((p) => ({
            ...p,
            stateMachines: [
                {
                    ...p.stateMachines[0]!,
                    initialStateId: "Nowhere" as StateId,
                },
            ],
        }));
        expect(errors[0]?.field).toBe("initialStateId");
    });

    it("catches a transition leaving or arriving nowhere", () => {
        const errors = errorsFor((p) => ({
            ...p,
            stateMachines: [
                {
                    ...p.stateMachines[0]!,
                    transitions: [
                        {
                            ...p.stateMachines[0]!.transitions[0]!,
                            fromStateId: "Nowhere" as StateId,
                            toStateId: "Elsewhere" as StateId,
                        },
                    ],
                },
            ],
        }));
        expect(errors.map((e) => e.field)).toEqual([
            "fromStateId",
            "toStateId",
        ]);
    });

    it("catches a rule that can never fire", () => {
        /* An event type that is neither a core event nor one any
           effect in this programme emits. */
        const errors = errorsFor((p) => ({
            ...p,
            actions: [
                {
                    ...p.actions[0]!,
                    trigger: { eventType: "custom.nobody.emits.this" },
                },
                p.actions[1]!,
            ],
        }));
        expect(errors[0]?.field).toBe("trigger.eventType");
        expect(errors[0]?.message).toContain("never fire");
    });

    it("accepts a custom event some effect in the programme emits", () => {
        /* `tally` triggers on `custom.vote.cast`, which `cast_vote`
           emits. Without following that thread the validator would
           reject every programme that talks to itself. */
        expect(validateProgramme(valid())).toEqual([]);
    });

    it("accepts a trigger on a timer some effect starts", () => {
        expect(
            errorsFor((p) => ({
                ...p,
                actions: [
                    {
                        ...p.actions[0]!,
                        effects: [
                            ...p.actions[0]!.effects,
                            { type: "startTimer", name: "close", afterMS: 10 },
                        ],
                    },
                    {
                        ...p.actions[1]!,
                        trigger: { eventType: "custom.timer.close" },
                    },
                ],
            })),
        ).toEqual([]);
    });

    it("catches a condition type that does not exist", () => {
        const errors = errorsFor((p) => ({
            ...p,
            actions: [
                {
                    ...p.actions[0]!,
                    conditions: [
                        { type: "vibes" as never, operator: "eq", value: 1 },
                    ],
                },
                p.actions[1]!,
            ],
        }));
        expect(errors[0]?.field).toBe("conditions");
    });

    it("catches a signature whose count disagrees with its geometry", () => {
        const errors = errorsFor((p) => ({
            ...p,
            kinds: [
                {
                    ...p.kinds[0]!,
                    signatures: [
                        { ...p.kinds[0]!.signatures[0], contactCount: 9 },
                    ],
                },
            ],
        }));
        expect(errors[0]?.field).toBe("contactCount");
    });

    it("catches a slot signature with no code, which has no orientation", () => {
        const errors = errorsFor((p) => ({
            ...p,
            kinds: [
                {
                    ...p.kinds[0]!,
                    signatures: [
                        { ...p.kinds[0]!.signatures[0], family: "slot" },
                    ],
                },
            ],
        }));
        expect(errors.map((e) => e.field)).toContain("slotCode");
    });

    it("catches a region accepting a kind or role nobody defined", () => {
        const errors = errorsFor((p) => ({
            ...p,
            tablePresentations: [
                {
                    ...p.tablePresentations[0]!,
                    regions: [
                        {
                            ...p.tablePresentations[0]!.regions[0]!,
                            acceptedPhysicalKinds: ["Ghost" as KindId],
                            acceptedRoles: ["Ghost" as RoleId],
                        },
                    ],
                },
            ],
        }));
        expect(errors).toHaveLength(2);
    });

    it("catches two kinds nobody could tell apart", () => {
        /* Whichever is registered first would win every time, and the
           other kind would simply never be recognised — silently, and
           only at the table, and only when someone puts the unlucky
           puck down and nothing happens. */
        const errors = errorsFor((p) => ({
            ...p,
            kinds: [
                p.kinds[0]!,
                {
                    ...p.kinds[0]!,
                    id: "Twin" as KindId,
                    signatures: [
                        {
                            ...p.kinds[0]!.signatures[0],
                            id: "Twin/triad" as SignatureId,
                        },
                    ],
                },
            ],
        }));
        expect(errors.map((e) => e.field)).toContain("geometry");
        expect(errors[0]?.message).toContain("Cannot be told apart");
    });

    it("accepts two kinds that differ by more than their tolerance", () => {
        const errors = errorsFor((p) => ({
            ...p,
            kinds: [
                p.kinds[0]!,
                {
                    ...p.kinds[0]!,
                    id: "Bigger" as KindId,
                    signatures: [
                        signatureFrom(
                            "Bigger/triad" as SignatureId,
                            "triad",
                            TRIAD_FEET.map((f) => ({
                                x: f.x * 1.6,
                                y: f.y * 1.6,
                            })),
                            120,
                            5,
                        ),
                    ],
                },
            ],
        }));
        expect(errors).toEqual([]);
    });

    it("lets one kind be read two ways without complaining", () => {
        /* Two signatures on the *same* kind are two readings of one
           object, not two objects that look alike. */
        const errors = errorsFor((p) => ({
            ...p,
            kinds: [
                {
                    ...p.kinds[0]!,
                    signatures: [
                        p.kinds[0]!.signatures[0],
                        {
                            ...p.kinds[0]!.signatures[0],
                            id: "VotingToken/again" as SignatureId,
                        },
                    ],
                },
            ],
        }));
        expect(errors).toEqual([]);
    });

    it("catches a role needing more holders than it allows", () => {
        const errors = errorsFor((p) => ({
            ...p,
            roles: [
                {
                    ...p.roles[0]!,
                    minimumAssignments: 4,
                    maximumAssignments: 2,
                },
            ],
        }));
        expect(errors[0]?.field).toBe("minimumAssignments");
    });
});

describe("validateProgramme, on a half-edited file", () => {
    it("reports a missing nested list instead of throwing", () => {
        /* The shape check only looked at the nine top-level lists, so
           a kind with no `signatures` threw a TypeError out of a
           function documented to return errors — which is exactly the
           file somebody is in the middle of editing. */
        /* Cast through `unknown`: the whole point is that these shapes
           cannot be written in TypeScript, which is exactly why the
           validator has to catch them coming out of a file. */
        const without = (field: string, list: string): ProgrammeDefinition => {
            const programme = valid() as unknown as Record<string, unknown[]>;
            const first = {
                ...(programme[list]?.[0] as object),
            } as Record<string, unknown>;
            delete first[field];
            return {
                ...(programme as unknown as ProgrammeDefinition),
                [list]: [first],
            } as unknown as ProgrammeDefinition;
        };
        for (const [field, list] of [
            ["signatures", "kinds"],
            ["states", "stateMachines"],
            ["trigger", "actions"],
            ["enabledActionIds", "modes"],
        ]) {
            expect(
                validateProgramme(without(field ?? "", list ?? "")).length,
                `${String(list)}.${String(field)}`,
            ).toBeGreaterThan(0);
        }
    });

    it("catches the same definition twice", () => {
        /* Every set the validator builds collapsed them, so a
           duplicate was invisible here and then threw out of the kind
           registry — after the loader had already cleared it. */
        const errors = errorsFor((p) => ({
            ...p,
            kinds: [p.kinds[0]!, p.kinds[0]!],
        }));
        expect(errors[0]?.message).toBe("Defined twice.");
    });

    it("catches a misspelt effect on a mode or a state", () => {
        /* Effect types were only checked inside a rule, so this
           validated clean and threw from the middle of a session. */
        expect(
            errorsFor((p) => ({
                ...p,
                modes: [
                    {
                        ...p.modes[0]!,
                        entryEffects: [
                            { type: "chnageMode", modeId: "Voting" } as never,
                        ],
                    },
                ],
            })).map((e) => e.message),
        ).toContain('"chnageMode" is not an effect type.');
    });

    it("catches an effect pointing at nothing", () => {
        expect(
            errorsFor((p) => ({
                ...p,
                actions: [
                    {
                        ...p.actions[0]!,
                        effects: [{ type: "changeMode", modeId: "Nowhere" }],
                    },
                    p.actions[1]!,
                ],
            }))[0]?.message,
        ).toContain("Nowhere");
    });

    it("catches a condition comparing against something undefined", () => {
        /* A misspelt role in a condition validated clean and then
           simply never matched, so the rule silently did nothing. */
        expect(
            errorsFor((p) => ({
                ...p,
                actions: [
                    {
                        ...p.actions[0]!,
                        conditions: [
                            { type: "role", operator: "eq", value: "Votor" },
                        ],
                    },
                    p.actions[1]!,
                ],
            }))[0]?.message,
        ).toContain("Votor");
    });

    it("catches a trigger filtered on something that matches nothing", () => {
        expect(
            errorsFor((p) => ({
                ...p,
                actions: [
                    {
                        ...p.actions[0]!,
                        trigger: {
                            eventType: "physical.tapped",
                            sourceFilter: "Nonsense",
                        },
                    },
                    p.actions[1]!,
                ],
            }))[0]?.field,
        ).toBe("trigger.sourceFilter");
    });
});

describe("ProgrammeLoader", () => {
    it("registers the kinds of a programme it accepts", () => {
        const kinds = new KindRegistry();
        const loader = new ProgrammeLoader(kinds);
        const result = loader.load(valid());
        expect(result.ok).toBe(true);
        expect(kinds.all()).toHaveLength(1);
        expect(loader.current?.id).toBe("test.voting");
    });

    it("changes nothing at all when it refuses", () => {
        /* Register-as-you-go and unwind-on-failure leaves a
           half-loaded table at the precise moment nobody can debug it,
           and the unwinding is the path that never gets tested. */
        const kinds = new KindRegistry();
        const loader = new ProgrammeLoader(kinds);
        loader.load(valid());
        const before = kinds.all();
        const result = loader.load({
            ...valid(),
            initialModeId: "Nope" as ModeId,
            kinds: [],
        });
        expect(result.ok).toBe(false);
        expect(kinds.all()).toEqual(before);
        expect(loader.current?.id).toBe("test.voting");
    });

    it("refuses rather than throws, because editing a file is normal", () => {
        const loader = new ProgrammeLoader(new KindRegistry());
        const result = loader.loadJSON("{ not json");
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.errors[0]?.field).toBe("(json)");
    });

    it("round-trips a programme through JSON unchanged", () => {
        const programme = valid();
        const text = JSON.stringify(programme);
        const loader = new ProgrammeLoader(new KindRegistry());
        const result = loader.loadJSON(text);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(JSON.stringify(result.programme)).toBe(text);
        }
    });
});
