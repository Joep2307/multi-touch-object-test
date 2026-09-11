/* What the table shows.
 *
 * Image without behaviour: a presentation knows that colour follows
 * state, and does not know what changed the state. The lint rule in
 * eslint.config.js is what actually holds that line; these tests check
 * that the layer is worth having behind it.
 */
import { describe, expect, it } from "vitest";
import {
    RegionPolicy,
    RegionTracker,
    buildRenderPlan,
    regionContains,
    resolveBindings,
} from "../../../core/presentation";
import type {
    Binding,
    PresentationDefinition,
    PresentationId,
    PresentationView,
    RegionDefinition,
    RegionId,
    TablePresentation,
} from "../../../core/presentation";
import type { StateId } from "../../../core/behaviour";
import type {
    KindId,
    PhysicalId,
    PhysicalInstance,
} from "../../../core/physical";
import type { RoleId } from "../../../core/session";

const PX_PER_MM = 4;
const presentationId = (s: string): PresentationId => s as PresentationId;
const regionId = (s: string): RegionId => s as RegionId;

const view = (over: Partial<PresentationView> = {}): PresentationView => ({
    at: 0,
    activeModeId: "Voting",
    variable: () => undefined,
    ...over,
});

const token = (
    id: string,
    x: number,
    over: Partial<PhysicalInstance> = {},
): PhysicalInstance => ({
    id: id as PhysicalId,
    kindId: "VotingToken" as KindId,
    signatureId: null,
    roleId: null,
    pose: {
        position: { x, y: 400 },
        directionDeg: 90,
        directionKnown: true,
        sizePX: 320,
    },
    motion: null,
    currentStateId: null,
    properties: {},
    firstSeenAt: 0,
    lastSeenAt: 0,
    status: "detected",
    ...over,
});

describe("bindings", () => {
    const bind = (
        bindings: readonly Binding[],
        instance: PhysicalInstance | null,
        v = view(),
    ) => resolveBindings(bindings, instance, v);

    it("follows a pose", () => {
        const props = bind(
            [
                { target: "position", source: "pose.position" },
                { target: "rotation", source: "pose.direction" },
            ],
            token("a", 100),
        );
        expect(props.position).toEqual({ x: 100, y: 400 });
        expect(props.rotation).toBe(90);
    });

    it("turns a state into a colour through a map", () => {
        /* Without the map every programme would need a rule per state
           whose only effect was to change a colour, and the image
           would be back in the rules. */
        const binding: Binding = {
            target: "color",
            source: "currentState",
            map: { Ready: "#8fbf6f", Voted: "#c05a3e" },
            fallback: "#999999",
        };
        expect(
            bind(
                [binding],
                token("a", 0, { currentStateId: "Ready" as StateId }),
            ).color,
        ).toBe("#8fbf6f");
        expect(
            bind(
                [binding],
                token("a", 0, { currentStateId: "Voted" as StateId }),
            ).color,
        ).toBe("#c05a3e");
        expect(bind([binding], token("a", 0)).color).toBe("#999999");
    });

    it("follows the mode, without knowing what changed it", () => {
        const binding: Binding = {
            target: "visible",
            source: "activeMode",
            map: { Voting: true, Discussion: false },
            fallback: false,
        };
        expect(bind([binding], null).visible).toBe(true);
        expect(
            bind([binding], null, view({ activeModeId: "Discussion" }))
                .visible,
        ).toBe(false);
    });

    it("reads a session variable and a programme's own property", () => {
        const props = bind(
            [
                { target: "text", source: "variables.voteCount" },
                { target: "opacity", source: "properties.weight" },
            ],
            token("a", 0, { properties: { weight: 0.5 } }),
            view({ variable: (key) => (key === "voteCount" ? 7 : undefined) }),
        );
        expect(props.text).toBe(7);
        expect(props.opacity).toBe(0.5);
    });

    it("falls back rather than throwing on a path nobody defined", () => {
        /* A typo in a drawing should make something look wrong, not
           take the table down in front of people. */
        const props = bind(
            [{ target: "text", source: "pose.nonsense", fallback: "?" }],
            token("a", 0),
        );
        expect(props.text).toBe("?");
    });

    it("is pure, so the same frame draws the same twice", () => {
        const bindings: Binding[] = [
            { target: "position", source: "pose.position" },
        ];
        const instance = token("a", 100);
        expect(bind(bindings, instance)).toEqual(bind(bindings, instance));
    });
});

describe("regionContains", () => {
    it("knows a circle, a rectangle and a polygon", () => {
        expect(
            regionContains(
                { kind: "circle", centreMM: { x: 0, y: 0 }, radiusMM: 50 },
                { x: 30, y: 30 },
            ),
        ).toBe(true);
        expect(
            regionContains(
                {
                    kind: "rect",
                    centreMM: { x: 0, y: 0 },
                    widthMM: 100,
                    heightMM: 40,
                },
                { x: 40, y: 30 },
            ),
        ).toBe(false);
        expect(
            regionContains(
                {
                    kind: "polygon",
                    pointsMM: [
                        { x: 0, y: 0 },
                        { x: 100, y: 0 },
                        { x: 100, y: 100 },
                        { x: 0, y: 100 },
                    ],
                },
                { x: 50, y: 50 },
            ),
        ).toBe(true);
    });

    it("takes a margin, which is what makes hysteresis possible", () => {
        const shape = {
            kind: "circle" as const,
            centreMM: { x: 0, y: 0 },
            radiusMM: 50,
        };
        expect(regionContains(shape, { x: 52, y: 0 }, 5)).toBe(true);
        expect(regionContains(shape, { x: 52, y: 0 }, -5)).toBe(false);
    });
});

const VOTING_AREA: RegionDefinition = {
    id: regionId("votingArea"),
    name: "Voting area",
    shape: { kind: "circle", centreMM: { x: 100, y: 100 }, radiusMM: 50 },
    acceptedPhysicalKinds: ["VotingToken" as KindId],
};

describe("RegionTracker", () => {
    const tracker = (
        regions: readonly RegionDefinition[] = [VOTING_AREA],
    ): RegionTracker => new RegionTracker(regions, new RegionPolicy());

    /* Millimetres to pixels, since an instance's pose is in pixels and
       a region is described in millimetres. */
    const atMM = (id: string, xMM: number): PhysicalInstance => ({
        ...token(id, xMM * PX_PER_MM),
        pose: {
            position: { x: xMM * PX_PER_MM, y: 100 * PX_PER_MM },
            directionDeg: 0,
            directionKnown: true,
            sizePX: 320,
        },
    });

    it("says when an object arrives and when it leaves", () => {
        const t = tracker();
        expect(t.update([atMM("a", 0)], PX_PER_MM).entered).toHaveLength(0);
        const arrived = t.update([atMM("a", 100)], PX_PER_MM);
        expect(arrived.entered.map((c) => c.regionId)).toEqual(["votingArea"]);
        expect(arrived.membership.get("a")).toEqual(["votingArea"]);
        const left = t.update([atMM("a", 0)], PX_PER_MM);
        expect(left.exited.map((c) => c.regionId)).toEqual(["votingArea"]);
    });

    it("crosses once, with jitter sitting on the edge", () => {
        /* Without the band, a puck put down half on the line would
           cross in and out for as long as it lay there, and a rule
           watching for the crossing would fire sixty times a second. */
        const t = tracker();
        t.update([atMM("a", 0)], PX_PER_MM);
        let entered = 0;
        let exited = 0;
        for (const xMM of [149, 151, 148, 152, 150, 149.5, 151.5]) {
            const update = t.update([atMM("a", xMM)], PX_PER_MM);
            entered += update.entered.length;
            exited += update.exited.length;
        }
        expect(entered + exited).toBeLessThanOrEqual(1);
    });

    it("reports the wrong object arriving, and marks it unwelcome", () => {
        /* A region cannot keep anything out, so the useful thing is to
           say what arrived and whether it was welcome. */
        const t = tracker();
        const dial = {
            ...atMM("d", 100),
            kindId: "ControlDial" as KindId,
        };
        expect(t.update([dial], PX_PER_MM).entered[0]?.accepted).toBe(false);
    });

    it("checks the role as well as the kind", () => {
        const t = tracker([
            { ...VOTING_AREA, acceptedRoles: ["Voter" as RoleId] },
        ]);
        const stranger = t.update([atMM("a", 100)], PX_PER_MM);
        expect(stranger.entered[0]?.accepted).toBe(false);
        t.reset();
        const voter = t.update(
            [{ ...atMM("a", 100), roleId: "Voter" as RoleId }],
            PX_PER_MM,
        );
        expect(voter.entered[0]?.accepted).toBe(true);
    });

    it("empties every region an object it can no longer see was in", () => {
        /* Silence would leave a rule waiting for an exit that never
           comes. */
        const t = tracker();
        t.update([atMM("a", 100)], PX_PER_MM);
        expect(t.update([], PX_PER_MM).exited).toHaveLength(1);
    });
});

const SHAPE = (id: string, layer: number): PresentationDefinition => ({
    id: presentationId(id),
    name: id,
    renderer: "shape",
    layer,
    bindings: [
        { target: "position", source: "pose.position" },
        {
            target: "color",
            source: "currentState",
            map: { Ready: "#8fbf6f", Voted: "#c05a3e" },
            fallback: "#cccccc",
        },
    ],
});

const TABLE: TablePresentation = {
    id: presentationId("table.voting"),
    name: "Voting table",
    background: "#101010",
    regions: [{ ...VOTING_AREA, presentationId: presentationId("area") }],
    physicalPresentations: {
        ["VotingToken" as KindId]: presentationId("token"),
    },
};

describe("buildRenderPlan", () => {
    const presentations = [
        { ...SHAPE("area", 0), renderer: "shape" as const },
        SHAPE("token", 10),
    ];

    it("draws the regions under the objects", () => {
        const plan = buildRenderPlan(
            TABLE,
            presentations,
            [token("a", 100)],
            view(),
        );
        expect(plan.items.map((i) => i.presentationId)).toEqual([
            "area",
            "token",
        ]);
        expect(plan.background).toBe("#101010");
    });

    it("differs between two states only in the bound colour", () => {
        const plan = buildRenderPlan(
            TABLE,
            presentations,
            [
                token("a", 100, { currentStateId: "Ready" as StateId }),
                token("b", 100, { currentStateId: "Voted" as StateId }),
            ],
            view(),
        );
        const [a, b] = plan.items.filter((i) => i.subjectId !== "votingArea");
        expect(a?.props.position).toEqual(b?.props.position);
        expect(a?.props.color).toBe("#8fbf6f");
        expect(b?.props.color).toBe("#c05a3e");
    });

    it("lets a state override the kind's drawing outright", () => {
        const plan = buildRenderPlan(
            {
                ...TABLE,
                statePresentations: {
                    ["Voted" as StateId]: presentationId("voted"),
                },
            },
            [...presentations, SHAPE("voted", 20)],
            [token("a", 100, { currentStateId: "Voted" as StateId })],
            view(),
        );
        expect(plan.items.map((i) => i.presentationId)).toContain("voted");
    });

    it("draws nothing for an object that is no longer there", () => {
        const plan = buildRenderPlan(
            TABLE,
            presentations,
            [token("a", 100, { status: "removed" })],
            view(),
        );
        expect(plan.items.map((i) => i.subjectId)).toEqual(["votingArea"]);
    });

    it("hands back nothing a renderer could reach the model through", () => {
        /* The guarantee the whole layer exists for. A plan holds no
           instance, no session and no rule. */
        const plan = buildRenderPlan(
            TABLE,
            presentations,
            [token("a", 100)],
            view(),
        );
        const serialised = JSON.stringify(plan);
        expect(serialised).not.toContain("firstSeenAt");
        expect(JSON.parse(serialised)).toEqual(plan);
    });
});
