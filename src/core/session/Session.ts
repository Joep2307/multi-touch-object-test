import { EventLog } from "./EventLog";
import { TimerWheel } from "../behaviour/TimerWheel";
import { physicalInstanceOf } from "../physical/physicalInstanceOf";
import type { ActionId } from "../behaviour/ActionId";
import type { EffectRegistry } from "../behaviour/EffectRegistry";
import type { EventBus } from "../events/EventBus";
import type { EventDraft } from "../events/EventDraft";
import type { ExtensionProperties } from "../programme/ExtensionProperties";
import type { ModeDefinition } from "./ModeDefinition";
import type { ModeId } from "./ModeId";
import type { OutboxRequest } from "../behaviour/OutboxRequest";
import type { PhysicalAssignment } from "../physical/PhysicalAssignment";
import type { PhysicalId } from "../physical/PhysicalId";
import type { PhysicalInstance } from "../physical/PhysicalInstance";
import type { PhysicalKindDefinition } from "../physical/PhysicalKindDefinition";
import type { PhysicalRegistry } from "../physical/PhysicalRegistry";
import type { RelationKind } from "../relation/RelationKind";
import type { RoleAssigner } from "./RoleAssigner";
import type { RoleId } from "./RoleId";
import type { RuleContext } from "../behaviour/RuleContext";
import type { SettingsResolver } from "./SettingsResolver";
import type { SpatialRelation } from "../relation/SpatialRelation";
import type { StateDefinition } from "../behaviour/StateDefinition";
import type { StateId } from "../behaviour/StateId";

/* The only place with real state.
 *
 * Everything else in the model is either a definition, which is
 * authored up front and never changes, or a measurement, which is
 * true for one frame. The session is what exists in between: the
 * active mode, the variables, the objects on the glass, who holds
 * which part, and the log. When it ends, all of it is gone except the
 * log.
 *
 * It is also the `RuleContext` the behaviour layer talks through. That
 * is why the seam was written as a type in phase C: the engine was
 * built and tested against a table of six maps, and this class walked
 * into the same shape without the engine changing.
 *
 * **Instances are cached once a frame and written through.** A rule
 * that changes a state has to be visible to the next condition in the
 * same frame, and the change also has to outlive the frame — so
 * `assign` updates both the cache and the physical it came from.
 * Reading a fresh snapshot per condition would be correct and far too
 * slow; writing only the cache would lose every change on the next
 * frame.
 */
export class Session implements RuleContext {
    readonly log = new EventLog();
    readonly timers = new TimerWheel();
    readonly outbox: OutboxRequest[] = [];
    at = 0;
    properties: ExtensionProperties = {};

    readonly #variables = new Map<string, unknown>();
    readonly #instances = new Map<string, PhysicalInstance>();
    readonly #regions = new Map<string, readonly string[]>();
    #relations: readonly SpatialRelation[] = [];
    #activeModeId: ModeId | null = null;

    constructor(
        readonly id: string,
        private readonly bus: EventBus,
        private readonly physicals: PhysicalRegistry,
        private readonly modes: readonly ModeDefinition[],
        /* Every state any of the programme's machines can be in, so
           that "what may this object do" can be answered without the
           session knowing what a state machine is. */
        private readonly states: readonly StateDefinition[],
        private readonly effects: EffectRegistry,
        readonly roles: RoleAssigner,
        readonly settings: SettingsResolver,
    ) {}

    get activeModeId(): ModeId | null {
        return this.#activeModeId;
    }

    get activeMode(): ModeDefinition | null {
        if (this.#activeModeId === null) return null;
        return this.modes.find((m) => m.id === this.#activeModeId) ?? null;
    }

    /* Refresh the frame's view of the table. Call once, before any
       rule runs, so that everything reacting to this frame is looking
       at the same instant. */
    beginFrame(at: number): void {
        this.at = at;
        this.#instances.clear();
        for (const physical of this.physicals.all()) {
            this.#instances.set(physical.id, physicalInstanceOf(physical, at));
        }
        for (const draft of this.timers.due(at)) this.bus.publish(draft);
    }

    instances(): readonly PhysicalInstance[] {
        return [...this.#instances.values()];
    }

    /* What the spatial index found this frame, and which areas each
       object is standing in. Handed in rather than computed here: the
       session holds state, it does not measure. */
    observe(
        relations: readonly SpatialRelation[],
        regions: ReadonlyMap<string, readonly string[]>,
    ): void {
        this.#relations = relations;
        this.#regions.clear();
        for (const [id, names] of regions) this.#regions.set(id, names);
    }

    // --- RuleContext -----------------------------------------------

    enabledActionIds(subjectId: string | null): ReadonlySet<ActionId> | null {
        const mode = this.activeMode;
        const byMode =
            mode === null ? null : new Set<ActionId>(mode.enabledActionIds);
        const stateId =
            subjectId === null
                ? null
                : (this.instance(subjectId)?.currentStateId ?? null);
        const state =
            stateId === null
                ? undefined
                : this.states.find((s) => s.id === stateId);
        if (state === undefined) return byMode;
        const byState = new Set<ActionId>(state.enabledActionIds);
        if (byMode === null) return byState;
        return new Set([...byState].filter((id) => byMode.has(id)));
    }

    instance(id: string): PhysicalInstance | null {
        return this.#instances.get(id) ?? null;
    }

    kindOf(id: string): PhysicalKindDefinition | null {
        return this.physicals.get(id as PhysicalId)?.kind ?? null;
    }

    relationBetween(sourceId: string, targetId: string): RelationKind | null {
        return this.#find(sourceId, targetId)?.relation ?? null;
    }

    distanceBetween(sourceId: string, targetId: string): number | null {
        return this.#find(sourceId, targetId)?.distancePX ?? null;
    }

    regionsOf(id: string): readonly string[] {
        return this.#regions.get(id) ?? [];
    }

    variable(key: string): unknown {
        return this.#variables.get(key);
    }

    setVariable(key: string, value: unknown): void {
        this.#variables.set(key, value);
    }

    variables(): ReadonlyMap<string, unknown> {
        return this.#variables;
    }

    assign(id: PhysicalId, change: PhysicalAssignment): void {
        const physical = this.physicals.get(id);
        if (physical !== null) physical.assign(change);
        const cached = this.#instances.get(id);
        if (cached === undefined) return;
        this.#instances.set(id, {
            ...cached,
            ...(change.roleId === undefined ? {} : { roleId: change.roleId }),
            ...(change.currentStateId === undefined
                ? {}
                : { currentStateId: change.currentStateId }),
            ...(change.properties === undefined
                ? {}
                : { properties: change.properties }),
        });
    }

    /* Give an object a part, through the ledger that holds the cap and
       the overflow policy — and then make every object's `roleId`
       agree with what the ledger now says.
     *
     * The reconciliation is the part that is easy to miss. Granting a
     * part to a ninth voter can *displace* an existing holder, and
     * without walking the ledger afterwards that holder goes on
     * claiming a role it no longer has: two Supervisors where the
     * maximum is one, and no error anywhere. A queued object promoted
     * later has the mirror problem — it holds the part and does not
     * know it. */
    assignRole(id: PhysicalId, roleId: RoleId | null): void {
        if (roleId === null) {
            this.roles.departed(id, this.at);
        } else {
            this.roles.assign(id, roleId, this.at);
        }
        this.#reconcileRoles();
    }

    #reconcileRoles(): void {
        for (const physical of this.physicals.all()) {
            const held = this.roles.roleOf(physical.id);
            if (physical.roleId === held) continue;
            this.assign(physical.id, { roleId: held });
        }
    }

    /* Leave the old mode, arrive in the new one, and put every object
       into the state the new mode says it starts in.
     *
     * The order is the one anyone would say out loud: exit effects,
     * the swap, initial states, entry effects, then the announcement.
     * The announcement comes last so that anything reacting to it sees
     * a table that has already finished changing. */
    changeMode(id: ModeId): void {
        const next = this.modes.find((m) => m.id === id);
        if (next === undefined) {
            throw new Error(`No mode called "${id}" is defined.`);
        }
        const previous = this.activeMode;
        if (previous !== null) {
            for (const effect of previous.exitEffects) {
                this.effects.run(effect, null, this);
            }
        }
        this.#activeModeId = id;
        this.#applyInitialStates(next);
        for (const effect of next.entryEffects) {
            this.effects.run(effect, null, this);
        }
        this.publish({
            type: "mode.changed",
            sourceId: null,
            targetId: null,
            timestamp: this.at,
            payload: { modeId: id, previousModeId: previous?.id ?? null },
            properties: {},
        });
    }

    startTimer(
        name: string,
        afterMS: number,
        sourceId: string | null = null,
    ): void {
        this.timers.start(name, this.at + afterMS, sourceId);
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
        this.log.append(
            {
                id: `note-${String(this.log.length + 1)}` as never,
                type: "custom.note",
                sourceId: null,
                targetId: null,
                timestamp: this.at,
                payload: { note, ...payload },
                properties: {},
            },
            this.#activeModeId,
        );
    }

    /* Take everything on the outbox and leave it empty. The caller
       above the core is what actually plays a sound or redraws
       something; nothing here ever does. */
    drainOutbox(): readonly OutboxRequest[] {
        const requests = [...this.outbox];
        this.outbox.length = 0;
        return requests;
    }

    #applyInitialStates(mode: ModeDefinition): void {
        const assignments = mode.initialStateAssignments;
        if (assignments === undefined) return;
        /* Walks the registry, not the frame's cache. The cache is only
           filled by `beginFrame`, and the very first mode change
           happens before any frame has run — so a table with pucks
           already on it opened its session with none of them in the
           state the mode says they start in. */
        for (const physical of this.physicals.all()) {
            const stateId: StateId | undefined = assignments[physical.kind.id];
            if (stateId === undefined) continue;
            this.assign(physical.id, { currentStateId: stateId });
        }
    }

    #find(sourceId: string, targetId: string): SpatialRelation | null {
        return (
            this.#relations.find(
                (r) => r.sourceId === sourceId && r.targetId === targetId,
            ) ?? null
        );
    }
}
