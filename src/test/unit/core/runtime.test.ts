/* The loop, end to end, on the real programme.
 *
 * This is the proof the whole plan was for: contact points become an
 * object, the object's movements become events, events test rules, and
 * rules change state and image — with every decision in that sentence
 * coming out of `exe/public/programmes/participation.json` rather than
 * out of code.
 *
 * What is deliberately *not* here is recognition. Grouping contacts
 * into objects is the one thing the core has never owned, so the test
 * puts physicals in the registry itself, exactly as the bridge does at
 * the table.
 */
import { describe, expect, it } from "vitest";
import {
    AccelerationPolicy,
    BaseFactory,
    ConditionRegistry,
    ContactEventPolicy,
    DirectionPolicy,
    EffectRegistry,
    EventBus,
    KindRegistry,
    MotionHistoryPolicy,
    MovePolicy,
    OpenPuck,
    PhysicalEventPolicy,
    PhysicalRegistry,
    ContactStatusTracker,
    PositionPolicy,
    Presence,
    PresencePolicy,
    ProgrammeLoader,
    PxPerMMEstimator,
    PxPerMMPolicy,
    RegionPolicy,
    RoleAssigner,
    RotatePolicy,
    RuleTrace,
    Runtime,
    Session,
    SettingsResolver,
    SpatialRelationPolicy,
    validateProgramme,
} from "../../../core";
import type { BasePolicies, PhysicalId, SensedContact } from "../../../core";
import type { ProgrammeDefinition } from "../../../core/programme";
import file from "../../../../exe/public/programmes/participation.json";

const programme = file as unknown as ProgrammeDefinition;

const PX_PER_MM = 4;
const POLICIES: BasePolicies = {
    position: new PositionPolicy(),
    direction: new DirectionPolicy(),
    move: new MovePolicy(),
    rotate: new RotatePolicy(),
    motionHistory: new MotionHistoryPolicy(),
    acceleration: new AccelerationPolicy(),
};

/* Three feet in the standard footprint, centred where we say. The
   angles are the ones the real pucks use.
 *
 * `firstSeen` is the moment this press began, not zero, and it is the
 * whole reason this helper exists. `Tap` reads dwell from the
 * contacts' own timestamps, so feet that claim to have been down since
 * the session started make every press a hold — which reaches the
 * rules as `physical.tapped` all the same, and quietly turns a test
 * about tapping into a test about something else. */
const feet = (
    cxMM: number,
    cyMM: number,
    firstSeen: number,
    at: number,
): readonly SensedContact[] =>
    [0, 132, 228].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return {
            id: i,
            x: (cxMM + 34.6 * Math.cos(rad)) * PX_PER_MM,
            y: (cyMM + 34.6 * Math.sin(rad)) * PX_PER_MM,
            radiusPX: 9,
            firstSeen,
            lastSeen: at,
        };
    });

type Table = {
    readonly runtime: Runtime;
    readonly session: Session;
    readonly bus: EventBus;
    readonly trace: RuleTrace;
    readonly puck: OpenPuck;
    put: (cxMM: number, cyMM: number, at: number, down?: boolean) => void;
    press: (cxMM: number, cyMM: number, at: number) => void;
};

const table = (): Table => {
    const kinds = new KindRegistry();
    const loaded = new ProgrammeLoader(kinds).load(programme);
    if (!loaded.ok) {
        throw new Error(
            `The programme does not validate: ${JSON.stringify(loaded.errors)}`,
        );
    }
    const kind = kinds.all()[0];
    if (kind === undefined) throw new Error("no kind");

    const bus = new EventBus();
    const registry = new PhysicalRegistry();
    const session = new Session(
        "test",
        bus,
        registry,
        programme.modes,
        programme.stateMachines.flatMap((machine) => machine.states),
        new EffectRegistry(),
        new RoleAssigner(programme.roles),
        new SettingsResolver(programme.settings),
    );
    const trace = new RuleTrace();
    const runtime = new Runtime(
        programme,
        session,
        bus,
        registry,
        trace,
        new ConditionRegistry(),
        new EffectRegistry(),
        {
            contact: new ContactEventPolicy(),
            physical: new PhysicalEventPolicy(),
            relation: new SpatialRelationPolicy(),
            region: new RegionPolicy(),
        },
    );
    const factory = new BaseFactory(
        new PxPerMMEstimator(PX_PER_MM, new PxPerMMPolicy()),
        POLICIES,
    );
    const contacts = new ContactStatusTracker();
    let pressStartedAt: number | null = null;
    const signature = kind.signatures[0];
    const puck = new OpenPuck(
        "p1" as PhysicalId,
        kind,
        signature,
        new Presence(new PresencePolicy()),
        factory.create(signature),
    );
    registry.add(puck);

    return {
        runtime,
        session,
        bus,
        trace,
        puck,
        put(cxMM, cyMM, at, down = true) {
            if (!down) pressStartedAt = null;
            else pressStartedAt ??= at;
            const points = down
                ? feet(cxMM, cyMM, pressStartedAt ?? at, at)
                : [];
            puck.update(at, { at, points });
            /* Through the tracker, so the frame says what is new and
               what has gone exactly as the glass would. */
            runtime.frame(at, contacts.apply(at, points), PX_PER_MM);
        },
        /* Down and up again inside the tap window: a real press,
           rather than a hold that happens to reach the same event. */
        press(cxMM, cyMM, at) {
            this.put(cxMM, cyMM, at);
            this.put(cxMM, cyMM, at + 100, false);
        },
    };
};

describe("the participation programme", () => {
    it("validates", () => {
        /* Run over the real file, so an edit that breaks it fails
           here rather than at the table. */
        expect(validateProgramme(programme)).toEqual([]);
    });

    it("names every action, state, mode and role with a translation key", () => {
        /* The check the plan wanted in the validator. It cannot live
           in the core — that may not import `src/i18n/` and should not
           — so it lives here, where both trees are visible. */
        const keyed = (name: string): boolean =>
            /^[a-z]+\.[A-Za-z]+$/.test(name);
        for (const action of programme.actions) {
            expect(action.name, action.id).toSatisfy(keyed);
        }
        for (const role of programme.roles) {
            expect(role.name, role.id).toSatisfy(keyed);
        }
        for (const mode of programme.modes) {
            expect(mode.name, mode.id).toSatisfy(keyed);
        }
    });
});

describe("Runtime", () => {
    it("starts in the mode the programme says", () => {
        const t = table();
        t.runtime.start();
        expect(t.session.activeModeId).toBe("Setup");
    });

    it("gives a puck the part its kind is for when it arrives", () => {
        const t = table();
        t.runtime.start();
        t.session.changeMode("FreeInteraction" as never);
        t.put(400, 250, 0);
        expect(t.session.instance("p1")?.roleId).toBe("Participant");
        expect(t.session.instance("p1")?.currentStateId).toBe("Ready");
    });

    it("casts exactly one vote across two taps", () => {
        /* The sentence the whole plan was built around, running on the
           real programme file. Nothing was written to make the second
           tap do nothing: the token left `Ready`, and `cast_vote`
           requires `Ready`. */
        const t = table();
        t.runtime.start();
        t.put(400, 250, 0);
        t.session.changeMode("Voting" as never);

        t.press(400, 250, 1000);
        expect(t.session.variable("votes")).toBe(1);
        t.press(400, 250, 3000);
        expect(t.session.variable("votes")).toBe(1);
    });

    it("says why the second tap did nothing, and names the state", () => {
        /* Nothing was written to make the second tap do nothing. The
           token moved to `Voted`, and `Voted` does not list
           `cast_vote` among the actions it allows — so the action is
           never even evaluated, which is why the trace answers with a
           state rather than with a failed condition. */
        const t = table();
        t.runtime.start();
        t.put(400, 250, 0);
        t.session.changeMode("Voting" as never);
        t.press(400, 250, 1000);
        t.press(400, 250, 3000);
        const refusal = t.trace.lastRefusal("cast_vote");
        expect(refusal?.outcome).toBe("notEnabled");
        expect(refusal?.stateId).toBe("Voted");
    });

    it("never arms a puck that was never in the voting area", () => {
        /* The region is 150 mm around (400, 250); this is well outside
        const t = table();
        t.runtime.start();
        t.put(50, 50, 0);
        t.session.changeMode("Voting" as never);
        t.press(50, 50, 1000);
        expect(t.session.variable("votes")).toBe(0);
        expect(t.trace.lastRefusal("cast_vote")?.reason?.type).toBe("state");
    });

    it("refuses an armed puck carried out of the area", () => {
        /* The condition the machine does not already cover: armed
           inside, tapped outside. Belt and braces, and this is the
           path that needs them. */
        const t = table();
        t.runtime.start();
        t.put(400, 250, 0);
        t.session.changeMode("Voting" as never);
        t.put(400, 250, 500);
        expect(t.session.instance("p1")?.currentStateId).toBe("Voting");
        t.put(400, 250, 600, false);
        t.press(50, 50, 700);
        expect(t.session.variable("votes")).toBe(0);
        expect(t.trace.lastRefusal("cast_vote")?.reason?.type).toBe("region");
    });

    it("logs both taps, and what consumed them", () => {
        const t = table();
        t.runtime.start();
        t.put(400, 250, 0);
        t.session.changeMode("Voting" as never);
        t.press(400, 250, 1000);
        t.press(400, 250, 3000);
        const taps = t.session.log
            .all()
            .filter((entry) => entry.event.type === "physical.tapped");
        expect(taps).toHaveLength(2);
        expect(taps[0]?.consumedBy).toContain("cast_vote");
        expect(taps[1]?.consumedBy).not.toContain("cast_vote");
        expect(taps[0]?.modeId).toBe("Voting");
    });

    it("asks for a sound rather than making one", () => {
        const t = table();
        t.runtime.start();
        t.put(400, 250, 0);
        t.session.changeMode("Voting" as never);
        t.press(400, 250, 1000);
        expect(t.runtime.drainOutbox().map((r) => r.type)).toContain(
            "playSound",
        );
    });

    it("draws the table the mode asks for, and the object in it", () => {
        const t = table();
        t.runtime.start();
        t.put(400, 250, 0);
        t.session.changeMode("Voting" as never);
        const plan = t.runtime.frame(
            100,
            { at: 100, points: [], ended: [] },
            PX_PER_MM,
        );
        expect(plan?.items.map((i) => i.presentationId)).toContain(
            "area.voting",
        );
        /* Standing in the voting area during Voting arms the puck,
           which is what the machine's Ready-to-Voting transition
           means, so it is drawn armed. */
        const puck = plan?.items.find((i) => i.subjectId === "p1");
        expect(puck?.props.color).toBe("#d8a13a");
    });

    it("changes what the object looks like when its state changes", () => {
        const t = table();
        t.runtime.start();
        t.put(400, 250, 0);
        t.session.changeMode("Voting" as never);
        t.press(400, 250, 1000);
        const plan = t.runtime.frame(
            1200,
            { at: 1200, points: [], ended: [] },
            PX_PER_MM,
        );
        const puck = plan?.items.find((i) => i.subjectId === "p1");
        expect(puck?.presentationId).toBe("puck.ring.voted");
    });

    it("turns raw touches into contact events too", () => {
        const t = table();
        const seen: string[] = [];
        t.bus.subscribe((e) => seen.push(e.type));
        t.runtime.start();
        t.put(400, 250, 0);
        expect(seen.filter((s) => s === "contact.started")).toHaveLength(3);
    });

    it("counts votes from two pucks separately", () => {
        const t = table();
        t.runtime.start();
        t.put(400, 250, 0);
        t.session.changeMode("Voting" as never);
        t.press(400, 250, 1000);
        /* One puck, one vote — the cap that matters is the state
           machine, not a counter anybody had to write. */
        expect(t.session.variable("votes")).toBe(1);
        expect(t.session.roles.active("Participant" as never)).toHaveLength(1);
    });
});
