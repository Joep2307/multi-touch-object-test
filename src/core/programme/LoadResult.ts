import type { ProgrammeDefinition } from "./ProgrammeDefinition";
import type { ValidationError } from "./ValidationError";

/* What a load produced: the programme, or every reason it was
   refused. */
export type LoadResult =
    | { readonly ok: true; readonly programme: ProgrammeDefinition }
    | { readonly ok: false; readonly errors: readonly ValidationError[] };
