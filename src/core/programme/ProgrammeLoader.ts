import { validateProgramme } from "./validateProgramme";
import type { KindRegistry } from "../physical/KindRegistry";
import type { ProgrammeDefinition } from "./ProgrammeDefinition";
import type { ValidationError } from "./ValidationError";

/* What a load produced: the programme, or every reason it was
   refused. */
export type LoadResult =
    | { readonly ok: true; readonly programme: ProgrammeDefinition }
    | { readonly ok: false; readonly errors: readonly ValidationError[] };

/* Reads a programme, checks it, and only then believes it.
 *
 * **A failed load changes nothing.** The programme is validated
 * completely before a single registry is touched, so a second load
 * that turns out to be broken leaves the running session exactly as it
 * was. The alternative — register as you go, unwind on failure — means
 * a half-loaded table at the precise moment nobody can debug it, and
 * unwinding is the code path that never gets tested.
 *
 * That is also why `load` returns a result rather than throwing.
 * Refusing a programme is a normal thing to do with a file somebody is
 * still editing, and a caller that has to catch an exception to find
 * out will eventually catch it too broadly.
 */
export class ProgrammeLoader {
    #current: ProgrammeDefinition | null = null;

    constructor(private readonly kinds: KindRegistry) {}

    get current(): ProgrammeDefinition | null {
        return this.#current;
    }

    load(programme: ProgrammeDefinition): LoadResult {
        const errors = validateProgramme(programme);
        if (errors.length > 0) return { ok: false, errors };
        this.kinds.clear();
        for (const kind of programme.kinds) this.kinds.register(kind);
        this.#current = programme;
        return { ok: true, programme };
    }

    /* JSON in, programme out. The cast is the boundary: everything on
       the other side of it has been checked by `validateProgramme`,
       and nothing before it can be trusted at all. */
    loadJSON(text: string): LoadResult {
        let parsed: unknown;
        try {
            parsed = JSON.parse(text);
        } catch (error) {
            return {
                ok: false,
                errors: [
                    {
                        where: "(file)",
                        field: "(json)",
                        message:
                            error instanceof Error
                                ? error.message
                                : "Could not be parsed.",
                    },
                ],
            };
        }
        return this.load(parsed as ProgrammeDefinition);
    }
}
