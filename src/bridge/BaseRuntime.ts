import {
    ConditionRegistry,
    ContactEventPolicy,
    EffectRegistry,
    EventBus,
    PhysicalEventPolicy,
    RegionPolicy,
    RoleAssigner,
    RuleTrace,
    Runtime,
    Session,
    SettingsResolver,
    SpatialRelationPolicy,
    validateProgramme,
} from "../core";
import type { ProgrammeDefinition, RenderPlan } from "../core";
import type { TrackBridge } from "./TrackBridge";

/* The new model running beside the old table, and touching nothing.
 *
 * The last step before the migration, and deliberately inert: the
 * outbox is **never drained**, so no sound is played, nothing is
 * redrawn, and no rule can reach the running table. What it produces
 * is a log and a trace, which is what the migration will be argued
 * from.
 *
 * The programme is loaded once, lazily, and only on a URL that asked
 * for it. A static import would put it in the bundle the table loads
 * every morning, for a diagnostic almost nobody turns on.
 *
 * **The programme's rules do not fire on today's pucks yet, and that
 * is expected.** The kinds the bridge builds come from
 * `templateToKind`, and a template carries no default role and no state
 * machine — so nothing is assigned a part, and the conditions that ask
 * for one refuse. What this proves is that contacts become events and
 * events reach the engine; making them fire is the feature migration,
 * one action at a time.
 */
export class BaseRuntime {
    readonly #bus = new EventBus();
    readonly trace = new RuleTrace();
    #runtime: Runtime | null = null;
    #session: Session | null = null;
    #loading = false;
    #problem: string | null = null;
    #plan: RenderPlan | null = null;

    /* Kick the load off once, and never again. Returns immediately;
       the runtime starts feeding on whichever frame it is ready. */
    load(bridge: TrackBridge): void {
        if (this.#loading || this.#runtime !== null) return;
        this.#loading = true;
        void import("../../exe/public/programmes/participation.json")
            .then((module) => {
                this.#build(
                    bridge,
                    module.default as unknown as ProgrammeDefinition,
                );
            })
            .catch((error: unknown) => {
                this.#problem =
                    error instanceof Error ? error.message : "load failed";
            });
    }

    #build(bridge: TrackBridge, programme: ProgrammeDefinition): void {
        const errors = validateProgramme(programme);
        if (errors.length > 0) {
            const first = errors[0];
            this.#problem = `programme: ${String(first?.where)}.${String(
                first?.field,
            )}`;
            return;
        }
        /* One registry, shared. Two would be two answers to "what
           does this effect do", which is the thing a registry exists
           to prevent. */
        const effects = new EffectRegistry();
        const session = new Session(
            "table",
            this.#bus,
            bridge.physicals,
            programme.modes,
            programme.stateMachines.flatMap((machine) => machine.states),
            effects,
            new RoleAssigner(programme.roles),
            new SettingsResolver(programme.settings),
        );
        const runtime = new Runtime(
            programme,
            session,
            this.#bus,
            bridge.physicals,
            this.trace,
            new ConditionRegistry(),
            effects,
            {
                contact: new ContactEventPolicy(),
                physical: new PhysicalEventPolicy(),
                relation: new SpatialRelationPolicy(),
                region: new RegionPolicy(),
            },
        );
        runtime.start();
        this.#session = session;
        this.#runtime = runtime;
    }

    /* One frame, on the physicals the bridge has already updated. */
    update(bridge: TrackBridge, at: number, pxPerMM: number): void {
        const runtime = this.#runtime;
        if (runtime === null) return;
        this.#plan = runtime.frame(at, bridge.contactFrame, pxPerMM);
        /* Taken and thrown away on purpose. Draining it is what the
           migration will change, one effect at a time; until then the
           list must not be allowed to grow all afternoon. */
        runtime.drainOutbox();
    }

    /* What the model says the table should show. Drawn as a
       diagnostic over the real table, never instead of it. */
    get renderPlan(): RenderPlan | null {
        return this.#plan;
    }

    /* One line for the overlay. The table is a kiosk with no console,
       so a diagnostic that is only logged may as well not exist. */
    summary(): string {
        if (this.#problem !== null) return `model: ${this.#problem}`;
        const session = this.#session;
        if (session === null) return "model: loading…";
        const fired = this.trace
            .all()
            .filter((entry) => entry.outcome === "fired").length;
        return (
            `model: ${session.activeModeId ?? "no mode"} · ` +
            `${String(session.log.length)} events · ` +
            `${String(fired)} rules fired`
        );
    }
}
