/* The programme: every definition a session runs, loaded from one file
   and validated before it is believed.
 *
 * Everything to the right of `InteractionEvent` in the loop comes from
 * here, which is what makes a voting session and a board game two
 * files rather than two builds.
 */
export { ProgrammeLoader } from "./ProgrammeLoader";
export { validateProgramme } from "./validateProgramme";
export type { ExtensionProperties } from "./ExtensionProperties";
export type { LoadResult } from "./LoadResult";
export type { ProgrammeDefinition } from "./ProgrammeDefinition";
export type { ValidationError } from "./ValidationError";
