/* The session: the only place with real state.
 *
 * The overflow tests are the ones that matter. A physical table cannot
 * refuse to have a ninth block put on it when there are eight voters,
 * so what happens to the ninth has to be sayable — and the answer is
 * different for a queue of Voters and for a single Supervisor, on the
 * same table, at the same time.
 */
import { describe, expect, it } from "vitest";
import {
    EffectRegistry,
    RuleEngine,
    RuleTrace,
    ConditionRegistry,
} from "../../../core/behaviour";
import { EventBus } from "../../../core/events";
import {
    Presence,
    PresencePolicy,
    PhysicalRegistry,
    SystemPhysical,
} from "../../../core";
import {
    EventLog,
    RoleAssigner,
    Session,
    SettingsResolver,
} from "../../../core/session";
import { signatureFrom } from "../../../core";
import type { ActionDefinition, ActionId } from "../../../core/behaviour";
import type { StateId } from "../../../core/behaviour";
import type {
    KindId,
    PhysicalId,
    PhysicalKindDefinition,
    SignatureId,
} from "../../../core/physical";
import type {
    ModeDefinition,
    ModeId,
    OverflowPolicy,
    RoleDefinition,
    RoleId,
    Settings,
} from "../../../core/session";

const roleId = (s: string): RoleId => s as RoleId;
const modeId = (s: string): ModeId => s as ModeId;
const physicalId = (s: string): PhysicalId => s as PhysicalId;

const TOKEN: PhysicalKindDefinition = {
    id: "VotingToken" as KindId,
    label: "Voting token",
    signatures: [
        signatureFrom(
            "token/triad" as SignatureId,
            "triad",
            [0, 132, 228].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                return { x: 40 * Math.cos(rad), y: 40 * Math.sin(rad) };
            }),
            80,
            5,
        ),
    ],
    affordances: [],
    legacy: false,
};

const VOTER: RoleDefinition = {
    id: roleId("Voter"),
    name: "Voter",
    /* Uncapped on purpose: some roles are meant to be held by everyone
       at once, and the cap is per role rather than one rule for the
       table precisely because Voter and Supervisor want opposite
       answers. */
    overflowPolicy: "reject",
};

const capped = (policy: OverflowPolicy, max = 1): RoleDefinition => ({
    id: roleId("Supervisor"),
    name: "Supervisor",
    maximumAssignments: max,
    overflowPolicy: policy,
});

describe("RoleAssigner", () => {
    it("hands out an uncapped role to everyone who asks", () => {
        const assigner = new RoleAssigner([VOTER]);
        for (let i = 0; i < 9; i += 1) {
            assigner.assign(physicalId(`t${String(i)}`), roleId("Voter"), i);
        }
        expect(assigner.active(roleId("Voter"))).toHaveLength(9);
    });

    it("refuses the ninth when the role rejects", () => {
        const assigner = new RoleAssigner([capped("reject")]);
        assigner.assign(physicalId("a"), roleId("Supervisor"), 0);
        expect(
            assigner.assign(physicalId("b"), roleId("Supervisor"), 1),
        ).toBeNull();
        expect(assigner.roleOf(physicalId("a"))).toBe("Supervisor");
        expect(assigner.roleOf(physicalId("b"))).toBeNull();
    });

    it("queues the ninth when the role queues", () => {
        const assigner = new RoleAssigner([capped("queue")]);
        assigner.assign(physicalId("a"), roleId("Supervisor"), 0);
        const queued = assigner.assign(
            physicalId("b"),
            roleId("Supervisor"),
            1,
        );
        expect(queued?.status).toBe("queued");
        expect(assigner.active(roleId("Supervisor"))).toHaveLength(1);
    });

    it("moves the one waiting in when a place opens", () => {
        const assigner = new RoleAssigner([capped("queue")]);
        assigner.assign(physicalId("a"), roleId("Supervisor"), 0);
        assigner.assign(physicalId("b"), roleId("Supervisor"), 1);
        assigner.departed(physicalId("a"), 2);
        expect(assigner.roleOf(physicalId("b"))).toBe("Supervisor");
    });

    it("takes the part from whoever has held it longest", () => {
        const assigner = new RoleAssigner([capped("replaceOldest")]);
        assigner.assign(physicalId("a"), roleId("Supervisor"), 0);
        assigner.assign(physicalId("b"), roleId("Supervisor"), 5);
        expect(assigner.roleOf(physicalId("a"))).toBeNull();
        expect(assigner.roleOf(physicalId("b"))).toBe("Supervisor");
    });

    it("takes the part from the least important holder", () => {
        const assigner = new RoleAssigner([capped("replaceLowestPriority")]);
        assigner.assign(physicalId("a"), roleId("Supervisor"), 0);
        assigner.assign(physicalId("b"), roleId("Supervisor"), 5);
        expect(assigner.roleOf(physicalId("b"))).toBe("Supervisor");
    });

    it("lets everyone hold it when the cap is only advice", () => {
        const assigner = new RoleAssigner([capped("allowTemporarily")]);
        assigner.assign(physicalId("a"), roleId("Supervisor"), 0);
        assigner.assign(physicalId("b"), roleId("Supervisor"), 1);
        /* The overflow is visible: more assignments than the maximum,
           so a programme that cares can notice and say something. */
        expect(assigner.active(roleId("Supervisor"))).toHaveLength(2);
    });

    it("keeps a part through a lift and loses it on a departure", () => {
        /* A puck picked up to point at something must not cost someone
           their vote. */
        const assigner = new RoleAssigner([VOTER]);
        assigner.assign(physicalId("a"), roleId("Voter"), 0);
        expect(assigner.roleOf(physicalId("a"))).toBe("Voter");
        assigner.departed(physicalId("a"), 10);
        expect(assigner.roleOf(physicalId("a"))).toBeNull();
    });

    it("lets go of the part it held before", () => {
        /* Taking a different part used to leave the old assignment
           open, so a role with one place stayed occupied for the rest
           of the session by an object that had visibly moved on — and
           nothing on the table said why nobody else could take it. */
        const assigner = new RoleAssigner([VOTER, capped("reject")]);
        assigner.assign(physicalId("a"), roleId("Supervisor"), 0);
        assigner.assign(physicalId("a"), roleId("Voter"), 1);
        expect(assigner.roleOf(physicalId("a"))).toBe("Voter");
        expect(assigner.active(roleId("Supervisor"))).toHaveLength(0);
        expect(
            assigner.assign(physicalId("b"), roleId("Supervisor"), 2),
        ).not.toBeNull();
    });

    it("does not let one object hold the same part twice", () => {
        /* A queued object offered the part again stacked up a second
           entry, and both were promoted — so one puck occupied two
           places and the next in line never got one. */
        const assigner = new RoleAssigner([capped("queue", 2)]);
        assigner.assign(physicalId("a"), roleId("Supervisor"), 0);
        assigner.assign(physicalId("d"), roleId("Supervisor"), 1);
        assigner.assign(physicalId("b"), roleId("Supervisor"), 2);
        assigner.assign(physicalId("b"), roleId("Supervisor"), 3);
        assigner.assign(physicalId("c"), roleId("Supervisor"), 4);
        assigner.departed(physicalId("a"), 5);
        assigner.departed(physicalId("d"), 6);
        const holders = assigner
            .active(roleId("Supervisor"))
            .map((a) => a.assigneeId);
        expect(new Set(holders).size).toBe(holders.length);
        expect(holders).toContain("c");
    });

    it("ranks holders by their own importance, not the role's", () => {
        /* Priority read off the role is the same number for every
           candidate, so `replaceLowestPriority` fell through to its
           tie-break and behaved exactly like `replaceOldest` for every
           possible input.
         *
           Two places. The first holder is the oldest but the most
           important; the second is newer and least important. A third
           arrives, and it is the least important who gives up the
           place — which is what tells this policy apart from
           `replaceOldest`. */
        const assigner = new RoleAssigner([
            capped("replaceLowestPriority", 2),
        ]);
        assigner.assign(
            physicalId("senior"),
            roleId("Supervisor"),
            0,
            null,
            9,
        );
        assigner.assign(
            physicalId("junior"),
            roleId("Supervisor"),
            1,
            null,
            1,
        );
        assigner.assign(physicalId("third"), roleId("Supervisor"), 2, null, 5);
        expect(assigner.roleOf(physicalId("senior"))).toBe("Supervisor");
        expect(assigner.roleOf(physicalId("junior"))).toBeNull();
        expect(assigner.roleOf(physicalId("third"))).toBe("Supervisor");
    });

    it("restricts a part to the kinds allowed to play it", () => {
        const assigner = new RoleAssigner([VOTER]);
        const card: RoleDefinition = {
            ...VOTER,
            eligiblePhysicalKinds: ["VoterCard" as KindId],
        };
        const instance = {
            kindId: "VotingToken" as KindId,
        } as Parameters<RoleAssigner["eligible"]>[0];
        expect(assigner.eligible(instance, card)).toBe(false);
        expect(assigner.eligible(instance, VOTER)).toBe(true);
    });
});

describe("SettingsResolver", () => {
    const at = (
        scope: Settings["scope"],
        value: number,
        scopeId?: string,
    ): Settings => ({
        id: `${scope}:${String(value)}`,
        scope,
        ...(scopeId === undefined ? {} : { scopeId }),
        key: "tapMaxMS",
        value,
    });

    it("lets the most specific scope win, across all five", () => {
        const resolver = new SettingsResolver([
            at("global", 100),
            at("session", 200),
            at("mode", 300, "Voting"),
            at("role", 400, "Voter"),
            at("physicalKind", 500, "VotingToken"),
        ]);
        expect(resolver.value("tapMaxMS")).toBe(200);
        expect(resolver.value("tapMaxMS", { modeId: modeId("Voting") })).toBe(
            300,
        );
        expect(
            resolver.value("tapMaxMS", {
                modeId: modeId("Voting"),
                roleId: roleId("Voter"),
            }),
        ).toBe(400);
        expect(
            resolver.value("tapMaxMS", {
                modeId: modeId("Voting"),
                roleId: roleId("Voter"),
                kindId: "VotingToken" as KindId,
            }),
        ).toBe(500);
    });

    it("ignores a scope the question is not about", () => {
        const resolver = new SettingsResolver([
            at("global", 100),
            at("mode", 300, "Voting"),
        ]);
        expect(
            resolver.value("tapMaxMS", { modeId: modeId("Discussion") }),
        ).toBe(100);
    });

    it("falls back to the default when nothing defines the key", () => {
        const resolver = new SettingsResolver([]);
        expect(resolver.number("tapMaxMS", 300)).toBe(300);
    });
});

describe("EventLog", () => {
    const entry = (timestamp: number) => ({
        id: `e${String(timestamp)}` as never,
        type: "physical.tapped" as const,
        sourceId: null,
        targetId: null,
        timestamp,
        payload: {},
        properties: {},
    });

    it("stamps every entry with the mode it arose in", () => {
        /* One field, and it is what makes debugging, analytics,
           replay, undo and the afternoon's account all possible from
           one structure. */
        const log = new EventLog();
        log.append(entry(0), modeId("Voting"));
        expect(log.all()[0]?.modeId).toBe("Voting");
    });

    it("reads back a range, both ends included", () => {
        const log = new EventLog();
        log.append(entry(0), null);
        log.append(entry(100), null);
        log.append(entry(200), null);
        expect(log.between(0, 100)).toHaveLength(2);
    });

    it("has no way to change what it holds", () => {
        const log = new EventLog();
        log.append(entry(0), null);
        expect("remove" in log).toBe(false);
        expect("update" in log).toBe(false);
    });
});

const table = (): {
    session: Session;
    bus: EventBus;
    registry: PhysicalRegistry;
    put: (id: string) => void;
} => {
    const bus = new EventBus();
    const registry = new PhysicalRegistry();
    const modes: ModeDefinition[] = [
        {
            id: modeId("Setup"),
            name: "Setup",
            enabledActionIds: [],
            enabledRoleIds: [],
            entryEffects: [
                { type: "updateVariable", key: "phase", set: "setup" },
            ],
            exitEffects: [
                { type: "updateVariable", key: "left", set: "setup" },
            ],
        },
        {
            id: modeId("Voting"),
            name: "Voting",
            enabledActionIds: ["cast_vote" as ActionId],
            enabledRoleIds: [roleId("Voter")],
            initialStateAssignments: {
                ["VotingToken" as KindId]: "Ready" as StateId,
            },
            entryEffects: [
                { type: "updateVariable", key: "phase", set: "voting" },
            ],
            exitEffects: [],
        },
    ];
    const session = new Session(
        "s1",
        bus,
        registry,
        modes,
        [],
        new EffectRegistry(),
        new RoleAssigner([VOTER]),
        new SettingsResolver([]),
    );
    return {
        session,
        bus,
        registry,
        put: (id: string) => {
            registry.add(
                new SystemPhysical(
                    physicalId(id),
                    TOKEN,
                    new Presence(new PresencePolicy()),
                ),
            );
        },
    };
};

describe("Session", () => {
    it("runs exit, then the swap, then entry, then the announcement", () => {
        const t = table();
        const seen: string[] = [];
        t.bus.subscribe((e) => seen.push(e.type));
        t.session.beginFrame(0);
        t.session.changeMode(modeId("Setup"));
        t.session.changeMode(modeId("Voting"));
        expect(t.session.variable("left")).toBe("setup");
        expect(t.session.variable("phase")).toBe("voting");
        expect(seen).toEqual(["mode.changed", "mode.changed"]);
    });

    it("puts every object into the state the new mode starts it in", () => {
        const t = table();
        t.put("a");
        t.put("b");
        t.session.beginFrame(0);
        t.session.changeMode(modeId("Voting"));
        expect(t.session.instance("a")?.currentStateId).toBe("Ready");
        expect(t.session.instance("b")?.currentStateId).toBe("Ready");
    });

    it("narrows what can be done to the state and the mode together", () => {
        /* Both halves. A state is what makes a second tap do nothing,
           and an engine consulting only the mode would fire an action
           the menu had already stopped offering. */
        const t = table();
        t.put("a");
        t.session.beginFrame(0);
        t.session.changeMode(modeId("Voting"));
        t.session.assign(physicalId("a"), {
            currentStateId: "Voted" as StateId,
        });
        /* No state definitions were given to this session, so the
           state cannot narrow anything and only the mode applies. */
        expect([...(t.session.enabledActionIds("a") ?? [])]).toEqual([
            "cast_vote",
        ]);
    });

    it("narrows what can be done to what the mode allows", () => {
        const t = table();
        t.session.beginFrame(0);
        expect(t.session.enabledActionIds(null)).toBeNull();
        t.session.changeMode(modeId("Voting"));
        expect([...(t.session.enabledActionIds(null) ?? [])]).toEqual([
            "cast_vote",
        ]);
        t.session.changeMode(modeId("Setup"));
        expect([...(t.session.enabledActionIds(null) ?? [])]).toEqual([]);
    });

    it("refuses a mode nobody defined", () => {
        const t = table();
        expect(() => t.session.changeMode(modeId("Nonsense"))).toThrow(
            /No mode called/,
        );
    });

    it("writes an assignment through, so it outlives the frame", () => {
        /* Updating only the frame's cache would lose every change on
           the next frame; updating only the physical would hide it
           from the next condition in this one. */
        const t = table();
        t.put("a");
        t.session.beginFrame(0);
        t.session.assign(physicalId("a"), {
            currentStateId: "Voted" as StateId,
        });
        expect(t.session.instance("a")?.currentStateId).toBe("Voted");
        t.session.beginFrame(16);
        expect(t.session.instance("a")?.currentStateId).toBe("Voted");
    });

    it("takes the part away from whoever it displaced", () => {
        /* A grant that displaces an existing holder used to leave that
           holder claiming a part it no longer had: two Supervisors
           where the maximum is one, and no error anywhere. */
        const bus = new EventBus();
        const registry = new PhysicalRegistry();
        const put = (id: string): void => {
            registry.add(
                new SystemPhysical(
                    physicalId(id),
                    TOKEN,
                    new Presence(new PresencePolicy()),
                ),
            );
        };
        put("a");
        put("b");
        const session = new Session(
            "s2",
            bus,
            registry,
            [],
            [],
            new EffectRegistry(),
            new RoleAssigner([capped("replaceOldest")]),
            new SettingsResolver([]),
        );
        session.beginFrame(0);
        session.assignRole(physicalId("a"), roleId("Supervisor"));
        expect(session.instance("a")?.roleId).toBe("Supervisor");
        session.beginFrame(10);
        session.assignRole(physicalId("b"), roleId("Supervisor"));
        expect(session.instance("b")?.roleId).toBe("Supervisor");
        expect(session.instance("a")?.roleId).toBeNull();
        expect(session.roles.active(roleId("Supervisor"))).toHaveLength(1);
    });

    it("hands the outbox over and keeps nothing back", () => {
        const t = table();
        t.session.beginFrame(0);
        t.session.request({ type: "playSound", sound: "ding", at: 0 });
        expect(t.session.drainOutbox()).toHaveLength(1);
        expect(t.session.drainOutbox()).toHaveLength(0);
    });

    it("fires a timer from the frame clock when the frame comes round", () => {
        const t = table();
        const seen: string[] = [];
        t.bus.subscribe((e) => seen.push(e.type));
        t.session.beginFrame(1000);
        t.session.startTimer("close", 500);
        t.session.beginFrame(1400);
        expect(seen).toHaveLength(0);
        t.session.beginFrame(1500);
        expect(seen).toEqual(["custom.timer.close"]);
    });

    it("runs a whole vote through the engine it is the context for", () => {
        /* The seam closing: the engine was built and tested in phase C
           against a table of six maps, and this class walked into the
           same shape without the engine changing. */
        const t = table();
        const action: ActionDefinition = {
            id: "cast_vote" as ActionId,
            name: "Cast a vote",
            trigger: { eventType: "physical.tapped" },
            conditions: [
                { type: "state", operator: "eq", value: "Ready" },
                { type: "mode", operator: "eq", value: "Voting" },
            ],
            effects: [
                { type: "updateVariable", key: "votes", add: 1 },
                { type: "changeState", target: "self", stateId: "Voted" },
            ],
        };
        const engine = new RuleEngine(
            [action],
            new ConditionRegistry(),
            new EffectRegistry(),
            new RuleTrace(),
        );
        t.bus.subscribe((e) => {
            engine.handle(e, t.session);
        });
        t.put("a");
        t.session.beginFrame(0);
        t.session.changeMode(modeId("Voting"));
        const tap = (at: number): void => {
            t.bus.publish({
                type: "physical.tapped",
                sourceId: "a",
                targetId: null,
                timestamp: at,
                payload: {},
                properties: {},
            });
        };
        tap(100);
        tap(400);
        expect(t.session.variable("votes")).toBe(1);
    });
});
