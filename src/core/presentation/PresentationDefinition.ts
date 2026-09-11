import type { Binding } from "./Binding";
import type { ExtensionProperties } from "../programme/ExtensionProperties";
import type { PresentationId } from "./PresentationId";
import type { Renderer } from "./Renderer";

/* What something looks like, and nothing about why.
 *
 * The whole presentation layer is image without behaviour. A
 * presentation knows which renderer it uses and what it binds to —
 * position follows an object's pose, colour follows its state — and it
 * does not know what changed the state or what will change it next.
 *
 * That is enforced rather than trusted: nothing under
 * `src/core/presentation/` may import from `behaviour/` or `session/`
 * except types, and the lint rule says so. No arrow runs from here
 * back into behaviour.
 *
 * `layer` is a number rather than a name so that a programme can slot
 * something between two existing layers without renaming either.
 */
export type PresentationDefinition = {
    readonly id: PresentationId;
    readonly name: string;
    readonly renderer: Renderer;
    readonly layer: number;
    readonly assets?: Readonly<Record<string, string>>;
    readonly bindings: readonly Binding[];
    readonly properties?: ExtensionProperties;
};
