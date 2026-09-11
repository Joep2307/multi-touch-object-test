/* Rules and states: when, provided that, then.
 *
 * The centrepiece is the model's own example — a voting token that
 * casts one vote and then does nothing on the second tap — because it
 * is the smallest thing that exercises the whole grammar and the one
 * everything else in the plan was designed around.
 */
import { describe, expect, it } from "vitest";
import {
    ConditionRegistry,
    EffectRegistry,
    RuleEngine,
    RuleTrace,
    StateMachineRunner,
    TimerWheel,
    enabledActionsFor,
} from "../../../core/behaviour";
import { EventBus } from "../../../core/events";
import type {
    ActionDefinition,
    ActionId,
    OutboxRequest,
    RuleContext,
    StateDefinition,
    StateId,
    StateMachineDefinition,
    StateMachineId,
    TransitionId,
} from "../../../core/behaviour";
import type { EventDraft, InteractionEvent } from "../../../core/events";
import type {
    KindId,
    PhysicalAssignment,
    PhysicalId,
    PhysicalInstance,
    PhysicalKindDefinition,
} from "../../../core/physical";
import type { RelationKind } from "../../../core/relation";
import type { ModeId, RoleId } from "../../../core/session";

const actionId = (s: string): ActionId => s as ActionId;
const stateId = (s: string): StateId => s as StateId;

/* A table small enough to read: the seam the behaviour layer talks
   through, with nothing behind it but maps. Phase D replaces it with a
   real session and nothing in this file has to change. */
class TestTable implements RuleContext {
    at = 0;
    activeModeId: ModeId | null = null;
    enabled: Set<ActionId> | null = null;
    readonly table = new Map<string, PhysicalInstance>();
    readonly variables = new Map<string, unknown>();
    readonly outbox: OutboxRequest[] = [];
    readonly notes: { note: string; payload: unknown }[] = [];
    readonly timers = new TimerWheel();
    readonly relations = new Map<string, RelationKind>();
    readonly distances = new Map<string, number>();
    readonly regions = new Map<string, readonly string[]>();
    modeChanges: ModeId[] = [];
    readonly roleChanges: { id: PhysicalId; roleId: RoleId | null }[] = [];

    constructor(private readonly bus: EventBus) {}

    enabledActionIds(): ReadonlySet<ActionId> | null {
        return this.enabled;
    }

    assignRole(id: PhysicalId, roleId: RoleId | null): void {
        this.roleChanges.push({ id, roleId });
        this.assign(id, { roleId });
    }

    instance(id: string): PhysicalInstance | null {
        return this.table.get(id) ?? null;
    }

    instances(): readonly PhysicalInstance[] {
        return [...this.table.values()];
    }

    kindOf(id: string): PhysicalKindDefinition | null {
        const instance = this.table.get(id);
        if (instance === undefined) return null;
        return {
            id: instance.kindId,
            label: "test",
            signatures: [
                {
                    id: "sig" as never,
                    family: "triad",
                    contactCount: 3,
                    geometry: {
                        expectedCount: 3,
                        footRadiusMM: 40,
                        outerDiameterMM: 80,
                    },
                    distanceToleranceMM: 5,
                    orientationRule: "free",
                    scaleRule: "fixed",
                },
            ],
            affordances: [],
            legacy: false,
        };
    }

    relationBetween(sourceId: string, targetId: string): RelationKind | null {
        return this.relations.get(`${sourceId}->${targetId}`) ?? null;
    }

    distanceBetween(sourceId: string, targetId: string): number | null {
        return this.distances.get(`${sourceId}->${targetId}`) ?? null;
    }

    regionsOf(id: string): readonly string[] {
        return this.regions.get(id) ?? [];
    }

    variable(key: string): unknown {
        return this.variables.get(key);
    }

    setVariable(key: string, value: unknown): void {
        this.variables.set(key, value);
    }

    assign(id: PhysicalId, change: PhysicalAssignment): void {
        const was = this.table.get(id);
        if (was === undefined) return;
        this.table.set(id, {
            ...was,
            ...(change.roleId === undefined ? {} : { roleId: change.roleId }),
            ...(change.currentStateId === undefined
                ? {}
                : { currentStateId: change.currentStateId }),
            ...(change.properties === undefined
                ? {}
                : { properties: change.properties }),
        });
    }

    changeMode(id: ModeId): void {
        this.modeChanges.push(id);
        this.activeModeId = id;
    }

    startTimer(name: string, afterMS: number): void {
        this.timers.start(name, this.at + afterMS);
    }

    publish(draft: EventDraft): void {
        this.bus.publish(draft);
    }

    request(request: OutboxRequest): void {
        this.outbox.push(request);
    }

    appendToLog(
        note: string,
        payload: Readonly<Record<string, unknown>>,
    ): void {
        this.notes.push({ note, payload });
    }

    /* Move the clock and let anything due fire, exactly as a frame
       would. No wall clock anywhere. */
    tick(at: number): void {
        this.at = at;
        for (const draft of this.timers.due(at)) this.bus.publish(draft);
    }

    put(id: string, over: Partial<PhysicalInstance> = {}): void {
        this.table.set(id, {
            id: id as PhysicalId,
            kindId: "VotingToken" as KindId,
            signatureId: null,
            roleId: null,
            pose: null,
            motion: null,
            currentStateId: null,
            properties: {},
            firstSeenAt: 0,
            lastSeenAt: 0,
            status: "detected",
            ...over,
        });
    }
}

const CAST_VOTE: ActionDefinition = {
    id: actionId("cast_vote"),
    name: "Cast a vote",
    trigger: { eventType: "physical.tapped" },
    conditions: [
        { type: "role", operator: "eq", value: "Voter" },
        { type: "state", operator: "eq", value: "Ready" },
        { type: "mode", operator: "eq", value: "Voting" },
    ],
    effects: [
        { type: "emitEvent", eventType: "custom.vote.cast" },
        { type: "updateVariable", key: "votes", add: 1 },
        { type: "changeState", target: "self", stateId: "Voted" },
    ],
};

type Rig = {
    table: TestTable;
    bus: EventBus;
    trace: RuleTrace;
    seen: InteractionEvent[];
};

const rig = (actions: readonly ActionDefinition[]): Rig => {
    const bus = new EventBus();
    const trace = new RuleTrace();
    const engine = new RuleEngine(
        actions,
        new ConditionRegistry(),
        new EffectRegistry(),
        trace,
    );
    const table = new TestTable(bus);
    const seen: InteractionEvent[] = [];
    bus.subscribe((event) => seen.push(event));
    bus.subscribe((event) => {
        engine.handle(event, table);
    });
    return { table, bus, trace, seen };
};

const tap = (bus: EventBus, sourceId: string, at: number): void => {
    bus.publish({
        type: "physical.tapped",
        sourceId,
        targetId: null,
        timestamp: at,
        payload: { gesture: "tap" },
        properties: {},
    });
};

describe("casting a vote", () => {
    const ready = (): Rig => {
        const r = rig([CAST_VOTE]);
        r.table.activeModeId = "Voting" as ModeId;
        r.table.put("t1", {
            roleId: "Voter" as RoleId,
            currentStateId: stateId("Ready"),
        });
        return r;
    };

    it("casts one vote on a tap", () => {
        const r = ready();
        tap(r.bus, "t1", 100);
        expect(r.table.variables.get("votes")).toBe(1);
        expect(r.table.instance("t1")?.currentStateId).toBe("Voted");
        expect(r.seen.map((e) => e.type)).toContain("custom.vote.cast");
    });

    it("does nothing on a second tap, and says why", () => {
        /* Nothing was written to make this true. The token moved to
           `Voted`, and `Voted` is not `Ready`. */
        const r = ready();
        tap(r.bus, "t1", 100);
        tap(r.bus, "t1", 400);
        expect(r.table.variables.get("votes")).toBe(1);
        const refusal = r.trace.lastRefusal("cast_vote");
        expect(refusal?.outcome).toBe("refused");
        expect(refusal?.reason?.type).toBe("state");
        expect(refusal?.reason?.value).toBe("Ready");
    });

    it("refuses a token with the wrong part to play", () => {
        const r = ready();
        r.table.put("t1", {
            roleId: "Observer" as RoleId,
            currentStateId: stateId("Ready"),
        });
        tap(r.bus, "t1", 100);
        expect(r.table.variables.get("votes")).toBeUndefined();
        expect(r.trace.lastRefusal("cast_vote")?.reason?.type).toBe("role");
    });

    it("refuses outside the voting mode", () => {
        const r = ready();
        r.table.activeModeId = "Discussion" as ModeId;
        tap(r.bus, "t1", 100);
        expect(r.trace.lastRefusal("cast_vote")?.reason?.type).toBe("mode");
    });

    it("stops at the first condition that does not hold", () => {
        /* "Role is Observer" is a much better answer than "state is
           Voted" when both are true, and the order the programme wrote
           is what decides which one is reported. */
        const r = ready();
        r.table.put("t1", {
            roleId: "Observer" as RoleId,
            currentStateId: stateId("Voted"),
        });
        tap(r.bus, "t1", 100);
        expect(r.trace.lastRefusal("cast_vote")?.reason?.type).toBe("role");
    });

    it("does not evaluate an action the mode has taken away", () => {
        /* Not the same as failing a condition. A mode narrows what is
           possible; it does not make the rule false. */
        const r = ready();
        r.table.enabled = new Set<ActionId>();
        tap(r.bus, "t1", 100);
        expect(r.trace.lastRefusal("cast_vote")?.outcome).toBe("notEnabled");
        expect(r.trace.lastRefusal("cast_vote")?.reason).toBeUndefined();
    });
});

describe("RuleEngine", () => {
    it("runs higher priority first and keeps written order otherwise", () => {
        const fired: string[] = [];
        const noteAction = (
            id: string,
            priority?: number,
        ): ActionDefinition => ({
            id: actionId(id),
            name: id,
            trigger: { eventType: "physical.tapped" },
            conditions: [],
            effects: [{ type: "appendToLog", note: id }],
            ...(priority === undefined ? {} : { priority }),
        });
        const r = rig([
            noteAction("first"),
            noteAction("second"),
            noteAction("urgent", 10),
        ]);
        r.table.put("t1");
        tap(r.bus, "t1", 0);
        fired.push(...r.table.notes.map((n) => n.note));
        expect(fired).toEqual(["urgent", "first", "second"]);
    });

    it("lets one rule reach another through an emitted event", () => {
        /* And the emitted event is delivered after the emitting action
           has finished, so the second rule never sees a half-applied
           change. */
        const r = rig([
            {
                id: actionId("shout"),
                name: "shout",
                trigger: { eventType: "physical.tapped" },
                conditions: [],
                effects: [
                    { type: "emitEvent", eventType: "custom.shouted" },
                    { type: "updateVariable", key: "step", set: "one" },
                ],
            },
            {
                id: actionId("answer"),
                name: "answer",
                trigger: { eventType: "custom.shouted" },
                conditions: [],
                effects: [
                    { type: "updateVariable", key: "sawStep", set: null },
                ],
            },
        ]);
        r.table.put("t1");
        r.table.variables.set("step", "none");
        const order: string[] = [];
        r.bus.subscribe((e) => order.push(e.type));
        tap(r.bus, "t1", 0);
        expect(order).toEqual(["physical.tapped", "custom.shouted"]);
        expect(r.table.variables.get("step")).toBe("one");
    });

    it("matches a trigger on a kind, so one rule covers every token", () => {
        const r = rig([
            {
                id: actionId("onToken"),
                name: "onToken",
                trigger: {
                    eventType: "physical.tapped",
                    sourceFilter: "VotingToken",
                },
                conditions: [],
                effects: [{ type: "updateVariable", key: "hit", add: 1 }],
            },
        ]);
        r.table.put("t1");
        r.table.put("other", { kindId: "ControlDial" as KindId });
        tap(r.bus, "t1", 0);
        tap(r.bus, "other", 1);
        expect(r.table.variables.get("hit")).toBe(1);
    });

    it("puts a sound on the outbox instead of playing one", () => {
        const r = rig([
            {
                id: actionId("ding"),
                name: "ding",
                trigger: { eventType: "physical.tapped" },
                conditions: [],
                effects: [
                    { type: "playSound", sound: "ding" },
                    {
                        type: "changePresentation",
                        target: "self",
                        presentationId: "lit",
                    },
                ],
            },
        ]);
        r.table.put("t1");
        tap(r.bus, "t1", 0);
        expect(r.table.outbox.map((o) => o.type)).toEqual([
            "playSound",
            "changePresentation",
        ]);
    });

    it("counts rather than overwrites, so two votes are two", () => {
        /* `set` would have both tokens read the old count and write
           the same new one, and one vote would vanish. */
        const r = rig([
            {
                id: actionId("count"),
                name: "count",
                trigger: { eventType: "physical.tapped" },
                conditions: [],
                effects: [{ type: "updateVariable", key: "votes", add: 1 }],
            },
        ]);
        r.table.put("a");
        r.table.put("b");
        tap(r.bus, "a", 0);
        tap(r.bus, "b", 1);
        expect(r.table.variables.get("votes")).toBe(2);
    });
});

describe("what an object can be asked to do", () => {
    const VOTE = CAST_VOTE;
    const MARK: ActionDefinition = {
        id: actionId("place_mark"),
        name: "Place a mark",
        trigger: {
            eventType: "physical.detected",
            sourceFilter: "VotingToken",
        },
        conditions: [],
        effects: [],
    };
    const DIAL: ActionDefinition = {
        id: actionId("turn_dial"),
        name: "Turn the dial",
        trigger: {
            eventType: "physical.rotated",
            sourceFilter: "ControlDial",
        },
        conditions: [],
        effects: [],
        priority: 5,
    };
    const ALL = [VOTE, MARK, DIAL];

    const token: PhysicalInstance = {
        id: "t1" as PhysicalId,
        kindId: "VotingToken" as KindId,
        signatureId: null,
        roleId: "Voter" as RoleId,
        pose: null,
        motion: null,
        currentStateId: stateId("Ready"),
        properties: {},
        firstSeenAt: 0,
        lastSeenAt: 0,
        status: "detected",
    };

    const ready: StateDefinition = {
        id: stateId("Ready"),
        name: "Ready",
        enabledActionIds: [actionId("cast_vote"), actionId("place_mark")],
        entryEffects: [],
        exitEffects: [],
    };
    const voted: StateDefinition = {
        ...ready,
        id: stateId("Voted"),
        name: "Voted",
        enabledActionIds: [actionId("place_mark")],
    };

    it("offers only what this object's state allows", () => {
        expect(
            enabledActionsFor(token, ALL, ready, null).map((a) => a.id),
        ).toEqual(["cast_vote", "place_mark"]);
        expect(
            enabledActionsFor(token, ALL, voted, null).map((a) => a.id),
        ).toEqual(["place_mark"]);
    });

    it("lets the mode narrow it further, and never widen it", () => {
        const only = new Set([actionId("cast_vote")]);
        expect(
            enabledActionsFor(token, ALL, ready, only).map((a) => a.id),
        ).toEqual(["cast_vote"]);
        /* A mode naming an action the state does not allow adds
           nothing: the effective set is an intersection. */
        const wider = new Set([actionId("turn_dial")]);
        expect(enabledActionsFor(token, ALL, ready, wider)).toEqual([]);
    });

    it("does not offer an action written for another kind", () => {
        expect(
            enabledActionsFor(token, ALL, null, null).map((a) => a.id),
        ).not.toContain("turn_dial");
    });

    it("takes no state machine as no restriction, not as none allowed", () => {
        /* An absence and an empty set are different answers, which is
           the whole reason both arguments are nullable. */
        expect(enabledActionsFor(token, ALL, null, null)).toHaveLength(2);
        expect(
            enabledActionsFor(
                token,
                ALL,
                { ...ready, enabledActionIds: [] },
                null,
            ),
        ).toHaveLength(0);
    });

    it("lists them in the order they would fire", () => {
        /* A menu that listed actions in a different order from the one
           they fire in would be a menu that lies about what a tap
           does. */
        const dialToken = { ...token, kindId: "ControlDial" as KindId };
        expect(
            enabledActionsFor(dialToken, ALL, null, null).map((a) => a.id),
        ).toEqual(["turn_dial", "cast_vote"]);
    });
});

describe("conditions", () => {
    const check = (
        condition: ActionDefinition["conditions"][number],
        prepare: (table: TestTable) => void,
    ): boolean => {
        const r = rig([
            {
                id: actionId("probe"),
                name: "probe",
                trigger: { eventType: "physical.tapped" },
                conditions: [condition],
                effects: [{ type: "updateVariable", key: "fired", set: true }],
            },
        ]);
        r.table.put("t1");
        prepare(r.table);
        tap(r.bus, "t1", 0);
        return r.table.variables.get("fired") === true;
    };

    it("fails rather than throwing when there is nothing to compare", () => {
        /* A rule asking about a role on an object that has none has
           been answered, and the answer is no. Throwing would take the
           table down; passing would make a misspelt variable name
           enable everything. */
        expect(
            check({ type: "role", operator: "eq", value: "Voter" }, () => {}),
        ).toBe(false);
        expect(
            check(
                {
                    type: "variable",
                    subject: "typo",
                    operator: "eq",
                    value: 1,
                },
                () => {},
            ),
        ).toBe(false);
    });

    it("asks whether the subject is one of a list", () => {
        expect(
            check(
                {
                    type: "kind",
                    operator: "in",
                    value: ["VotingToken", "Dial"],
                },
                () => {},
            ),
        ).toBe(true);
    });

    it("asks whether the subject is a list containing the value", () => {
        expect(
            check(
                { type: "region", operator: "has", value: "votingArea" },
                (t) => t.regions.set("t1", ["votingArea", "playerArea"]),
            ),
        ).toBe(true);
        expect(
            check(
                { type: "region", operator: "has", value: "votingArea" },
                () => {},
            ),
        ).toBe(false);
    });

    it("compares numbers, and refuses to rank anything else", () => {
        expect(
            check(
                { type: "variable", subject: "n", operator: "lt", value: 5 },
                (t) => t.variables.set("n", 3),
            ),
        ).toBe(true);
        /* Alphabetical order is a question nobody asked. */
        expect(
            check(
                { type: "variable", subject: "n", operator: "lt", value: 5 },
                (t) => t.variables.set("n", "3"),
            ),
        ).toBe(false);
    });

    it("reads a distance between two objects", () => {
        expect(
            check({ type: "distance", operator: "lt", value: 200 }, (t) =>
                t.distances.set("t1->t2", 100),
            ),
        ).toBe(false);
    });

    it("refuses two subjects registered under one name", () => {
        const registry = new ConditionRegistry();
        expect(() =>
            registry.register({
                id: "role",
                resolve: () => undefined,
            } as never),
        ).toThrow(/already/);
    });
});

describe("EffectRegistry", () => {
    it("refuses an effect it has no executor for, loudly", () => {
        /* A programme with a misspelt effect appearing to work — every
           condition passing, nothing happening — is the hardest
           failure to diagnose with visitors standing around. */
        const registry = new EffectRegistry();
        const table = new TestTable(new EventBus());
        expect(() =>
            registry.run({ type: "explode" } as never, null, table),
        ).toThrow(/No executor/);
    });
});

describe("TimerWheel", () => {
    it("fires on the frame it is due, from the frame clock", () => {
        const r = rig([
            {
                id: actionId("arm"),
                name: "arm",
                trigger: { eventType: "physical.tapped" },
                conditions: [],
                effects: [{ type: "startTimer", name: "close", afterMS: 500 }],
            },
            {
                id: actionId("closed"),
                name: "closed",
                trigger: { eventType: "custom.timer.close" },
                conditions: [],
                effects: [
                    { type: "updateVariable", key: "closed", set: true },
                ],
            },
        ]);
        r.table.put("t1");
        r.table.at = 1000;
        tap(r.bus, "t1", 1000);
        r.table.tick(1400);
        expect(r.table.variables.get("closed")).toBeUndefined();
        r.table.tick(1500);
        expect(r.table.variables.get("closed")).toBe(true);
    });

    it("replaces a timer of the same name rather than adding one", () => {
        const wheel = new TimerWheel();
        wheel.start("close", 100);
        wheel.start("close", 500);
        expect(wheel.pendingCount).toBe(1);
        expect(wheel.due(200)).toHaveLength(0);
        expect(wheel.due(500)).toHaveLength(1);
    });

    it("stamps the deadline, not the frame that noticed it", () => {
        /* A frame that ran late must not move the recorded moment, or
           a replay drifts a little further every time. */
        const wheel = new TimerWheel();
        wheel.start("close", 500);
        expect(wheel.due(920)[0]?.timestamp).toBe(500);
    });

    it("fires two timers due together in deadline order", () => {
        const wheel = new TimerWheel();
        wheel.start("late", 400);
        wheel.start("early", 100);
        expect(wheel.due(500).map((e) => e.payload.name)).toEqual([
            "early",
            "late",
        ]);
    });
});

const MACHINE: StateMachineDefinition = {
    id: "token" as StateMachineId,
    name: "Voting token",
    initialStateId: stateId("Ready"),
    states: [
        {
            id: stateId("Ready"),
            name: "Ready",
            enabledActionIds: [actionId("cast_vote")],
            entryEffects: [
                { type: "updateVariable", key: "entered", set: "Ready" },
            ],
            exitEffects: [
                { type: "updateVariable", key: "leaving", set: "Ready" },
            ],
        },
        {
            id: stateId("Voted"),
            name: "Voted",
            enabledActionIds: [],
            entryEffects: [
                /* Reads what the exit effect just wrote, which is the
                   whole reason the order is exit, transition, entry. */
                { type: "updateVariable", key: "cameFrom", set: "Ready" },
            ],
            exitEffects: [],
        },
    ],
    transitions: [
        {
            id: "toVoted" as TransitionId,
            fromStateId: stateId("Ready"),
            toStateId: stateId("Voted"),
            trigger: { eventType: "physical.tapped" },
            conditions: [{ type: "role", operator: "eq", value: "Voter" }],
            effects: [{ type: "updateVariable", key: "moved", set: true }],
        },
    ],
};

describe("StateMachineRunner", () => {
    const runnerRig = (): {
        table: TestTable;
        bus: EventBus;
        trace: RuleTrace;
        types: string[];
    } => {
        const bus = new EventBus();
        const trace = new RuleTrace();
        const runner = new StateMachineRunner(
            MACHINE,
            new ConditionRegistry(),
            new EffectRegistry(),
            trace,
        );
        const table = new TestTable(bus);
        const types: string[] = [];
        bus.subscribe((e) => types.push(e.type));
        bus.subscribe((e) => {
            runner.handle(e, table);
        });
        table.put("t1", { roleId: "Voter" as RoleId });
        runner.enter("t1" as PhysicalId, table);
        return { table, bus, trace, types };
    };

    it("puts an object into its initial state and runs the entry", () => {
        const r = runnerRig();
        expect(r.table.instance("t1")?.currentStateId).toBe("Ready");
        expect(r.table.variables.get("entered")).toBe("Ready");
    });

    it("runs exit, then the transition, then entry", () => {
        const r = runnerRig();
        tap(r.bus, "t1", 100);
        expect(r.table.variables.get("leaving")).toBe("Ready");
        expect(r.table.variables.get("moved")).toBe(true);
        expect(r.table.variables.get("cameFrom")).toBe("Ready");
        expect(r.table.instance("t1")?.currentStateId).toBe("Voted");
    });

    it("announces leaving and arriving", () => {
        const r = runnerRig();
        tap(r.bus, "t1", 100);
        expect(r.types).toEqual([
            "state.entered",
            "physical.tapped",
            "state.exited",
            "state.entered",
        ]);
    });

    it("takes one transition per event, not a chain", () => {
        const r = runnerRig();
        tap(r.bus, "t1", 100);
        tap(r.bus, "t1", 200);
        /* Nothing leaves `Voted`, so the second tap finds no
           transition at all. */
        expect(r.table.instance("t1")?.currentStateId).toBe("Voted");
    });

    it(
        "refuses a transition whose condition does not hold, with a " +
            "reason",
        () => {
            const r = runnerRig();
            r.table.put("t1", {
                roleId: "Observer" as RoleId,
                currentStateId: stateId("Ready"),
            });
            tap(r.bus, "t1", 100);
            expect(r.table.instance("t1")?.currentStateId).toBe("Ready");
            expect(r.trace.lastRefusal("toVoted")?.reason?.type).toBe("role");
        },
    );
});
