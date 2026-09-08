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
} from "../../../core/physical";
import {
    AccelerationPolicy,
    CentroidSolver,
    DirectionPolicy,
    footprintFrom,
    MovePolicy,
    PositionPolicy,
    PxPerMMEstimator,
    PxPerMMPolicy,
    RotatePolicy,
    TailPolicy,
    TapPolicy,
} from "../../../core/base";
import type { ContactPoint } from "../../../core/contact";
import type {
    BasePolicies,
    KindId,
    PhysicalId,
    PhysicalKind,
} from "../../../core/physical";
import type { RegistryEvent } from "../../../core/physical";

const POLICIES: BasePolicies = {
    position: new PositionPolicy(),
    direction: new DirectionPolicy(),
    move: new MovePolicy(),
    rotate: new RotatePolicy(),
    tap: new TapPolicy(),
    tail: new TailPolicy(),
    acceleration: new AccelerationPolicy(),
};

const kindId = (s: string): KindId => s as KindId;
const physicalId = (s: string): PhysicalId => s as PhysicalId;

const TRIAD: PhysicalKind = {
    id: kindId("triad-a"),
    label: "Triad A",
    family: "triad",
    footprint: footprintFrom(
        [0, 132, 228].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return { x: 40 * Math.cos(rad), y: 40 * Math.sin(rad) };
        }),
        80,
        new CentroidSolver(),
    ),
    affordances: [new Apertured(0.58)],
    legacy: false,
};

const factory = (): BaseFactory =>
    new BaseFactory(new PxPerMMEstimator(4, new PxPerMMPolicy()), POLICIES);

const feet = (cx: number, cy: number, at: number): ContactPoint[] =>
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

const makePuck = (id: string, kind: PhysicalKind = TRIAD): OpenPuck =>
    new OpenPuck(
        physicalId(id),
        kind,
        new Presence(new PresencePolicy()),
        factory().create(kind),
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
        const kind: PhysicalKind = { ...TRIAD, affordances: [] };
        const puck = new FilledPuck(
            physicalId("f1"),
            kind,
            new Presence(new PresencePolicy()),
            factory().create(kind),
        );
        puck.update(0, { at: 0, points: feet(400, 300, 0) });
        expect(puck.contains({ x: 400 + 120, y: 300 })).toBe(true);
        expect(puck.contains({ x: 400 + 200, y: 300 })).toBe(false);
    });
});

describe("the duo", () => {
    it("nests and separates from both sides", () => {
        const kind: PhysicalKind = {
            ...TRIAD,
            id: kindId("duo"),
            affordances: [new Nesting(), new Nestable(true)],
        };
        const host = new DuoHost(
            physicalId("host"),
            kind,
            new Presence(new PresencePolicy()),
            factory().create(kind),
        );
        const insert = new DuoInsert(
            physicalId("insert"),
            kind,
            new Presence(new PresencePolicy()),
            factory().create(kind),
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
    it("refuses a coded kind, which has no recogniser yet", () => {
        const coded: PhysicalKind = { ...TRIAD, family: "coded" };
        expect(() => factory().create(coded)).toThrow(/coded/);
    });

    it("shares one screen scale across every physical", () => {
        const shared = new PxPerMMEstimator(4, new PxPerMMPolicy());
        const f = new BaseFactory(shared, POLICIES);
        const a = f.create(TRIAD);
        const b = f.create(TRIAD);
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
            family: "ring",
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
            new Presence(new PresencePolicy()),
            factory().create(TRIAD),
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
