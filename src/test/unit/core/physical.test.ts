/* Physicals: what is on the glass, whether it is still there, and
   whether it is the same one as before.
 *
 * Presence and identity are tested hardest here because they are the
 * two places where being wrong is expensive rather than merely ugly:
 * a puck that loses its history, or one that inherits a stranger's.
 */
import { describe, expect, it } from "vitest";
import {
    Apertured,
    BaseFactory,
    DuoHost,
    DuoInsert,
    FilledPuck,
    IdentityMap,
    KindRegistry,
    Nestable,
    Nesting,
    OpenPuck,
    PhysicalRegistry,
    Presence,
    PresencePolicy,
    SimulatedPuck,
    SystemPhysical,
    affordanceOf,
    isTangible,
    physicalInstanceOf,
} from "../../../core/physical";
import {
    AccelerationPolicy,
    CentroidSolver,
    DirectionPolicy,
    footprintFrom,
    MovePolicy,
    FootprintCompletionPolicy,
    PositionPolicy,
    PxPerMMEstimator,
    PxPerMMPolicy,
    RotatePolicy,
    MotionHistoryPolicy,
} from "../../../core/base";
import type { SensedContact } from "../../../core/contact";
import type {
    BasePolicies,
    KindId,
    PhysicalId,
    PhysicalKindDefinition,
    PhysicalSignature,
    SignatureId,
} from "../../../core/physical";
import type { RegistryEvent } from "../../../core/physical";
import type { RoleId } from "../../../core/session";
import type { StateId } from "../../../core/behaviour";

const POLICIES: BasePolicies = {
    position: new PositionPolicy(),
    completion: new FootprintCompletionPolicy(),
    direction: new DirectionPolicy(),
    move: new MovePolicy(),
    rotate: new RotatePolicy(),
    motionHistory: new MotionHistoryPolicy(),
    acceleration: new AccelerationPolicy(),
};

const kindId = (s: string): KindId => s as KindId;
const physicalId = (s: string): PhysicalId => s as PhysicalId;
const signatureId = (s: string): SignatureId => s as SignatureId;

const TRIAD_SIGNATURE: PhysicalSignature = {
    id: signatureId("triad-a/feet"),
    family: "triad",
    contactCount: 3,
    geometry: footprintFrom(
        [0, 132, 228].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return { x: 40 * Math.cos(rad), y: 40 * Math.sin(rad) };
        }),
        80,
        new CentroidSolver(),
    ),
    distanceToleranceMM: 5,
    orientationRule: "free",
    scaleRule: "fixed",
};

const TRIAD: PhysicalKindDefinition = {
    id: kindId("triad-a"),
    label: "Triad A",
    signatures: [TRIAD_SIGNATURE],
    affordances: [new Apertured(0.58)],
    legacy: false,
};

const factory = (): BaseFactory =>
    new BaseFactory(new PxPerMMEstimator(4, new PxPerMMPolicy()), POLICIES);

const feet = (cx: number, cy: number, at: number): SensedContact[] =>
    [0, 132, 228].map((off, i) => {
        const rad = (off * Math.PI) / 180;
        return {
            id: i,
            x: cx + 160 * Math.cos(rad),
            y: cy + 160 * Math.sin(rad),
            radiusPX: 9,
            firstSeen: 0,
            lastSeen: at,
        };
    });

const makePuck = (
    id: string,
    kind: PhysicalKindDefinition = TRIAD,
    signature: PhysicalSignature = kind.signatures[0],
): OpenPuck =>
    new OpenPuck(
        physicalId(id),
        kind,
        signature,
        new Presence(new PresencePolicy()),
        factory().create(signature),
    );

describe("Presence", () => {
    const p = (): Presence => new Presence(new PresencePolicy(900, 10000));

    it("starts unseen and becomes placed when sensed", () => {
        const presence = p();
        expect(presence.state).toBe("unseen");
        presence.update(true, 0);
        expect(presence.state).toBe("placed");
        expect(presence.onTable).toBe(true);
    });

    it("holds on through a short dropout instead of flickering", () => {
        const presence = p();
        presence.update(true, 0);
        presence.update(false, 500);
        expect(presence.state).toBe("placed");
    });

    it("becomes lifted once the hold window passes", () => {
        const presence = p();
        presence.update(true, 0);
        presence.update(false, 1500);
        expect(presence.state).toBe("lifted");
        expect(presence.recoverable).toBe(true);
    });

    it("comes back as itself when put down within memory", () => {
        const presence = p();
        presence.update(true, 0);
        presence.update(false, 1500);
        presence.update(true, 4000);
        expect(presence.state).toBe("placed");
    });

    it("is gone once memory runs out, and stays gone", () => {
        const presence = p();
        presence.update(true, 0);
        presence.update(false, 20000);
        expect(presence.state).toBe("gone");
        presence.update(true, 20016);
        expect(presence.state).toBe("gone");
    });
});

describe("affordances", () => {
    it("finds one that is present, typed", () => {
        const aperture = affordanceOf(TRIAD, Apertured);
        expect(aperture?.holeFraction).toBeCloseTo(0.58, 9);
    });

    it("returns null rather than throwing when absent", () => {
        expect(affordanceOf(TRIAD, Nestable)).toBeNull();
    });

    it("keeps mayOverlap a physical fact, not a permission", () => {
        expect(new Nestable(true).mayOverlap).toBe(true);
        expect(new Nesting().id).toBe("nesting");
    });
});

describe("OpenPuck", () => {
    it("tells a tap in the hole from one on the rim", () => {
        const puck = makePuck("p1");
        const at = 0;
        puck.update(at, { at, points: feet(400, 300, at) });
        expect(puck.holeContains({ x: 400, y: 300 })).toBe(true);
        expect(puck.rimContains({ x: 400, y: 300 })).toBe(false);
        /* Outer radius is 160 px at 4 px/mm; the hole reaches 92.8. */
        expect(puck.holeContains({ x: 400 + 120, y: 300 })).toBe(false);
        expect(puck.rimContains({ x: 400 + 120, y: 300 })).toBe(true);
        expect(puck.rimContains({ x: 400 + 200, y: 300 })).toBe(false);
    });

    it("misses everything before it has been seen", () => {
        expect(makePuck("p2").holeContains({ x: 0, y: 0 })).toBe(false);
    });
});

describe("FilledPuck", () => {
    it("owns its whole face", () => {
        const kind: PhysicalKindDefinition = { ...TRIAD, affordances: [] };
        const puck = new FilledPuck(
            physicalId("f1"),
            kind,
            TRIAD_SIGNATURE,
            new Presence(new PresencePolicy()),
            factory().create(TRIAD_SIGNATURE),
        );
        puck.update(0, { at: 0, points: feet(400, 300, 0) });
        expect(puck.contains({ x: 400 + 120, y: 300 })).toBe(true);
        expect(puck.contains({ x: 400 + 200, y: 300 })).toBe(false);
    });
});

describe("the duo", () => {
    it("nests and separates from both sides", () => {
        const kind: PhysicalKindDefinition = {
            ...TRIAD,
            id: kindId("duo"),
            affordances: [new Nesting(), new Nestable(true)],
        };
        const host = new DuoHost(
            physicalId("host"),
            kind,
            TRIAD_SIGNATURE,
            new Presence(new PresencePolicy()),
            factory().create(TRIAD_SIGNATURE),
        );
        const insert = new DuoInsert(
            physicalId("insert"),
            kind,
            TRIAD_SIGNATURE,
            new Presence(new PresencePolicy()),
            factory().create(TRIAD_SIGNATURE),
        );
        insert.nestInto(host);
        expect(host.hasInsert).toBe(true);
        expect(insert.isNested).toBe(true);
        insert.separate();
        expect(host.hasInsert).toBe(false);
        expect(insert.host).toBeNull();
    });
});

describe("BaseFactory", () => {
    it("refuses a coded signature, which has no recogniser yet", () => {
        const coded: PhysicalSignature = {
            ...TRIAD_SIGNATURE,
            family: "coded",
        };
        expect(() => factory().create(coded)).toThrow(/coded/);
    });

    it("shares one screen scale across every physical", () => {
        const shared = new PxPerMMEstimator(4, new PxPerMMPolicy());
        const f = new BaseFactory(shared, POLICIES);
        const a = f.create(TRIAD_SIGNATURE);
        const b = f.create(TRIAD_SIGNATURE);
        expect(a.pxPerMM).toBe(b.pxPerMM);
    });
});

describe("KindRegistry", () => {
    it("refuses a duplicate id instead of overwriting", () => {
        const reg = new KindRegistry();
        reg.register(TRIAD);
        expect(() => reg.register({ ...TRIAD })).toThrow(/already/);
    });

    it("separates what is still made from what is only supported", () => {
        const reg = new KindRegistry();
        reg.register(TRIAD);
        reg.register({
            ...TRIAD,
            id: kindId("ring-a"),
            signatures: [{ ...TRIAD_SIGNATURE, family: "ring" }],
            legacy: true,
        });
        expect(reg.all()).toHaveLength(2);
        expect(reg.current()).toHaveLength(1);
    });
});

describe("PhysicalRegistry", () => {
    it("announces joining, lifting, returning and leaving", () => {
        const reg = new PhysicalRegistry();
        const seen: string[] = [];
        reg.subscribe((e: RegistryEvent) => seen.push(e.type));
        const puck = makePuck("p3");
        reg.add(puck);

        puck.update(0, { at: 0, points: feet(400, 300, 0) });
        reg.sweep();
        puck.update(1500, { at: 1500, points: [] });
        reg.sweep();
        puck.update(4000, { at: 4000, points: feet(400, 300, 4000) });
        reg.sweep();
        puck.update(20000, { at: 20000, points: [] });
        reg.sweep();

        expect(seen).toEqual(["joined", "lifted", "returned", "left"]);
        expect(reg.all()).toHaveLength(0);
    });

    it("keeps a lifted physical in the recoverable set", () => {
        const reg = new PhysicalRegistry();
        const puck = makePuck("p4");
        reg.add(puck);
        puck.update(0, { at: 0, points: feet(400, 300, 0) });
        puck.update(1500, { at: 1500, points: [] });
        reg.sweep();
        expect(reg.recoverable()).toHaveLength(1);
    });
});

describe("IdentityMap", () => {
    const lift = (puck: OpenPuck, reg: PhysicalRegistry): void => {
        puck.update(0, { at: 0, points: feet(400, 300, 0) });
        reg.sweep();
        puck.update(1500, { at: 1500, points: [] });
        reg.sweep();
    };

    it("recognises the same puck put back where it was", () => {
        const reg = new PhysicalRegistry();
        const puck = makePuck("p5");
        reg.add(puck);
        lift(puck, reg);
        const map = new IdentityMap(reg, 120);
        expect(map.resolve(TRIAD.id, { x: 405, y: 302 })).toBe(puck);
    });

    it("calls it new when it comes back somewhere else", () => {
        const reg = new PhysicalRegistry();
        const puck = makePuck("p6");
        reg.add(puck);
        lift(puck, reg);
        const map = new IdentityMap(reg, 120);
        expect(map.resolve(TRIAD.id, { x: 900, y: 700 })).toBeNull();
    });

    it("never hands one kind's history to another", () => {
        const reg = new PhysicalRegistry();
        const puck = makePuck("p7");
        reg.add(puck);
        lift(puck, reg);
        const map = new IdentityMap(reg, 120);
        expect(map.resolve(kindId("other"), { x: 400, y: 300 })).toBeNull();
    });
});

describe("the physical tree", () => {
    it("marks a simulated puck as tangible but not real", () => {
        const sim = new SimulatedPuck(
            physicalId("sim"),
            TRIAD,
            TRIAD_SIGNATURE,
            new Presence(new PresencePolicy()),
            factory().create(TRIAD_SIGNATURE),
        );
        expect(sim.hasPose).toBe(true);
        expect(sim.virtual).toBe(true);
        expect(isTangible(sim)).toBe(true);
    });

    it("gives the table itself no pose and no base", () => {
        const table = new SystemPhysical(
            physicalId("table"),
            TRIAD,
            new Presence(new PresencePolicy()),
        );
        expect(table.hasPose).toBe(false);
        expect(isTangible(table)).toBe(false);
    });
});

describe("PhysicalInstance", () => {
    it("flattens a puck into the record everything above reads", () => {
        const puck = makePuck("i1");
        puck.update(0, { at: 0, points: feet(400, 300, 0) });
        const instance = physicalInstanceOf(puck, 0);
        expect(instance.id).toBe("i1");
        expect(instance.kindId).toBe("triad-a");
        expect(instance.signatureId).toBe("triad-a/feet");
        expect(instance.status).toBe("detected");
        expect(instance.firstSeenAt).toBe(0);
        /* The smoothed centre, not the raw one: `Move` exists because
           a solved centre carries the sensor's noise, and handing the
           raw value up would have every consumer filtering it again. */
        expect(instance.pose?.position).toEqual(puck.base.move.snapshot().to);
        /* Sized from the kind and the table's scale, never from the
           measurement: 80 mm at four pixels to the millimetre. */
        expect(instance.pose?.sizePX).toBeCloseTo(320, 6);
    });

    it("has no pose for something that is not on the glass", () => {
        const table = new SystemPhysical(
            physicalId("table"),
            TRIAD,
            new Presence(new PresencePolicy()),
        );
        const instance = physicalInstanceOf(table, 0);
        expect(instance.pose).toBeNull();
        expect(instance.motion).toBeNull();
        expect(instance.status).toBe("removed");
    });

    it("carries the role and state the table assigned", () => {
        /* Assigned rather than measured, and through `assign` alone.
           When effects arrive they are the only caller. */
        const puck = makePuck("i2");
        puck.assign({
            roleId: "voter" as RoleId,
            currentStateId: "ready" as StateId,
            properties: { votes: 1 },
        });
        const instance = physicalInstanceOf(puck, 0);
        expect(instance.roleId).toBe("voter");
        expect(instance.currentStateId).toBe("ready");
        expect(instance.properties.votes).toBe(1);
    });

    it("reports a dropped foot as missing while the puck stays placed", () => {
        const puck = makePuck("i3");
        puck.update(0, { at: 0, points: feet(400, 300, 0) });
        puck.update(16, { at: 16, points: [] });
        expect(puck.presence.state).toBe("placed");
        expect(physicalInstanceOf(puck, 16).status).toBe("missing");
    });
});
