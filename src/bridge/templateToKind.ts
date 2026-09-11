import { Apertured } from "../core/physical/affordance/Apertured";
import { CFG } from "../config/CFG";
import { DEFAULT_OUTER_DIAMETER_MM, TEMPLATE_TOLERANCE_MM } from "./constants";
import { Nestable } from "../core/physical/affordance/Nestable";
import { Nesting } from "../core/physical/affordance/Nesting";
import { Opaque } from "../core/physical/affordance/Opaque";
import { Rotatable } from "../core/physical/affordance/Rotatable";
import { Tappable } from "../core/physical/affordance/Tappable";
import { isRing } from "../puck/geometry/isRing";
import { isSlotted } from "../puck/geometry/isSlotted";
import { ringCornersMM } from "./ringCornersMM";
import { signatureFrom } from "../core/physical/signatureFrom";
import { triadCornersMM } from "./triadCornersMM";
import type { Affordance } from "../core/physical/affordance/Affordance";
import type { KindFamily } from "../core/physical/KindFamily";
import type { KindId } from "../core/physical/KindId";
import type { PhysicalKindDefinition } from "../core/physical/PhysicalKindDefinition";
import type { PhysicalSignature } from "../core/physical/PhysicalSignature";
import type { SignatureId } from "../core/physical/SignatureId";
import type { Template } from "../types/Template";

/* Turn one of today's templates into a kind the new model understands.
 *
 * This is the whole of the old world's shape knowledge, translated
 * once. Nothing here decides anything new — that is the point. If the
 * two pipelines are to be compared frame by frame in the parity check,
 * they have to be looking at the same objects, and every difference
 * between them has to come from the code being compared rather than
 * from the kinds being described differently.
 *
 * The one deliberate change is the outer diameter. Templates do not
 * record one, and the old renderer uses `CFG.puckRadiusMM` (45 mm, so
 * 90 mm across) for a puck that is 80 mm across. The duo's small half
 * carries its own `radiusMM` and keeps it; everything else gets the
 * real 80. That single number is most of the misalignment between the
 * drawn ring and the physical object.
 */
export function templateToKind(template: Template): PhysicalKindDefinition {
    return {
        id: template.id as KindId,
        label: template.nameKey ?? template.id,
        /* One template describes one way of being recognised, so it
           becomes exactly one signature. A kind with two of them is
           something the old world could not express. */
        signatures: [signatureOf(template)],
        affordances: affordancesOf(template),
        /* Everything that exists today is a shape we are no longer
           making. The three-point standard is the only current kind,
           and it has no template yet. */
        legacy: true,
    };
}

function familyOf(template: Template): KindFamily {
    if (isSlotted(template)) return "slot";
    if (isRing(template)) return "ring";
    return "triad";
}

/* Derived with the same solver the signature will be measured by, so
   the expected numbers and the measured ones are comparable by
   construction rather than by convention. */
function signatureOf(template: Template): PhysicalSignature {
    const family = familyOf(template);
    const outerDiameterMM =
        template.radiusMM === undefined
            ? DEFAULT_OUTER_DIAMETER_MM
            : template.radiusMM * 2;
    const id = `${template.id}/${family}` as SignatureId;
    if (family === "triad") {
        const ratios = template.ratios ?? [1, 1];
        const corners = triadCornersMM(
            template.longestMM ?? CFG.longestSideMM,
            ratios,
        );
        return signatureFrom(
            id,
            family,
            corners,
            outerDiameterMM,
            TEMPLATE_TOLERANCE_MM,
        );
    }
    const ringMM = template.ringMM ?? CFG.ringRadiusMM;
    const angles =
        family === "slot" ? slotAnglesOf(template) : (template.angles ?? []);
    return signatureFrom(
        id,
        family,
        ringCornersMM(ringMM, angles),
        outerDiameterMM,
        TEMPLATE_TOLERANCE_MM,
        family === "slot"
            ? { slots: template.slots ?? 12, code: template.code ?? 0 }
            : undefined,
    );
}

/* A slot code is a bit mask: which of the `slots` compartments carry a
   foot. Bit 0 is the compartment the arrow points into. */
function slotAnglesOf(template: Template): readonly number[] {
    const slots = template.slots ?? 12;
    const code = template.code ?? 0;
    const step = 360 / slots;
    const angles: number[] = [];
    for (let i = 0; i < slots; i += 1) {
        if ((code & (1 << i)) !== 0) angles.push(i * step);
    }
    return angles;
}

function affordancesOf(template: Template): readonly Affordance[] {
    /* Every puck on this table can be tapped: `wasTap()` in the old
       pipeline is what opens the ring menu, and it asks nothing about
       which puck it is. `Placeable` is deliberately not claimed —
       whether these pucks are *put into* regions or merely used where
       they lie is a question regions will ask, and there are none. */
    const list: Affordance[] = [new Rotatable(), new Tappable()];
    /* Every puck on this table has a viewing hole; the old renderer
       applies `PUCK_HOLE` to all of them without asking. Recorded as
       an affordance so that a solid one can simply not have it. */
    list.push(new Apertured());
    if (template.nest === true) {
        /* The duo. Which half this is decides which way the nesting
           goes: the tool nests into the host, never the reverse. */
        list.push(template.role === "tool" ? new Nestable() : new Nesting());
    } else {
        list.push(new Opaque());
    }
    return list;
}
