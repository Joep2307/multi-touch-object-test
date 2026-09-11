import { AppendToLogEffect } from "./effects/AppendToLogEffect";
import { AssignRoleEffect } from "./effects/AssignRoleEffect";
import { ChangeModeEffect } from "./effects/ChangeModeEffect";
import { ChangePresentationEffect } from "./effects/ChangePresentationEffect";
import { ChangeStateEffect } from "./effects/ChangeStateEffect";
import { EmitEventEffect } from "./effects/EmitEventEffect";
import { PlaySoundEffect } from "./effects/PlaySoundEffect";
import { StartTimerEffect } from "./effects/StartTimerEffect";
import { UpdateVariableEffect } from "./effects/UpdateVariableEffect";
import type { EffectDefinition } from "./EffectDefinition";
import type { EffectExecutor } from "./EffectExecutor";
import type { RuleContext } from "./RuleContext";

/* Everything a rule can do, by name.
 *
 * `run` refuses an effect it has no executor for, loudly. The
 * alternative is a programme with a misspelt effect type that appears
 * to work — every condition passing, nothing happening — and that is
 * the single hardest failure to diagnose at a table with visitors
 * standing around it.
 */
export class EffectRegistry {
    readonly #executors = new Map<string, EffectExecutor>();

    constructor(executors: readonly EffectExecutor[] = defaultExecutors()) {
        for (const executor of executors) this.register(executor);
    }

    register(executor: EffectExecutor): void {
        if (this.#executors.has(executor.id)) {
            throw new Error(
                `An effect called "${executor.id}" is already registered.`,
            );
        }
        this.#executors.set(executor.id, executor);
    }

    run(
        definition: EffectDefinition,
        subjectId: string | null,
        context: RuleContext,
    ): void {
        const executor = this.#executors.get(definition.type);
        if (executor === undefined) {
            throw new Error(`No executor for effect "${definition.type}".`);
        }
        executor.run(definition, subjectId, context);
    }
}

function defaultExecutors(): readonly EffectExecutor[] {
    return [
        new ChangeStateEffect(),
        new ChangeModeEffect(),
        new AssignRoleEffect(),
        new UpdateVariableEffect(),
        new EmitEventEffect(),
        new StartTimerEffect(),
        new ChangePresentationEffect(),
        new PlaySoundEffect(),
        new AppendToLogEffect(),
    ];
}
