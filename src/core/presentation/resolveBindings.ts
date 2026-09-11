import { resolveBindingSource } from "./resolveBindingSource";
import type { PhysicalInstance } from "../physical";
import type { Binding } from "./Binding";
import type { PresentationView } from "./PresentationView";
import type { RenderProps } from "./RenderProps";

/* Turn a presentation's bindings into what to draw.
 *
 * Pure: the same inputs give the same output, every time, with no
 * state kept between frames. That is what makes the whole layer
 * testable without a canvas and what lets a renderer compare two
 * frames to decide whether anything needs repainting.
 *
 * A binding whose source resolves to nothing falls back rather than
 * disappearing. A drawing with no position is not a drawing that is
 * somewhere else; it is one nobody can see, and a fallback of zero is
 * usually more debuggable than an absence.
 */
export function resolveBindings(
    bindings: readonly Binding[],
    instance: PhysicalInstance | null,
    view: PresentationView,
): RenderProps {
    const props: Record<string, unknown> = {};
    for (const binding of bindings) {
        const raw = resolveBindingSource(binding.source, instance, view);
        const mapped = mapValue(raw, binding);
        if (mapped === undefined) continue;
        props[binding.target] = mapped;
    }
    return props;
}

/* A map turns a state id into a colour, or a mode into whether
   something is visible. Without it every programme would need a rule
   per state whose only effect was to change a colour, and the image
   would be back in the rules. */
function mapValue(raw: unknown, binding: Binding): unknown {
    if (binding.map === undefined) {
        return raw ?? binding.fallback;
    }
    if (raw === undefined || raw === null) return binding.fallback;
    const key = typeof raw === "string" ? raw : String(raw);
    return binding.map[key] ?? binding.fallback;
}
