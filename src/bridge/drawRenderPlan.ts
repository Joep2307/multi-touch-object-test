import type { RenderPlan } from "../core";

const TEXT_COLOUR = "rgba(255,255,255,.88)";
const FALLBACK_COLOUR = "#37e6ff";
const RING_RADIUS_PX = 26;
const LINE_WIDTH_PX = 2;
const TEXT_OFFSET_PX = 34;

/* Paints what the new model says the table should show.
 *
 * The branch the plan asked `frame.ts` to grow, and it is here rather
 * than in `src/render/` because of what it is *for*: this is a
 * diagnostic drawn over the running table, not the table's own
 * drawing. It runs only on a `?base` URL and only alongside the rest
 * of the parity overlay.
 *
 * A `RenderPlan` holds no instance, no session and no rule — that is
 * the guarantee the whole presentation layer exists to make — so this
 * function has nothing to reach back into even if it wanted to. What
 * it receives is an ordered list of what to draw, and it draws it.
 *
 * The shapes are deliberately plain. Making this look like the real
 * table would invite reading it as the real table; a ring and a label
 * say "this is what the model would have drawn" and nothing more. The
 * renderers a programme actually wants — the puck ring, the pin chip,
 * the note tether — arrive with the migration, in `src/render/`, once
 * the model is the one deciding.
 */
export function drawRenderPlan(
    ctx: CanvasRenderingContext2D,
    plan: RenderPlan,
): void {
    ctx.save();
    ctx.lineWidth = LINE_WIDTH_PX;
    ctx.font = "600 12px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (const item of plan.items) {
        if (item.props.visible === false) continue;
        const at = positionOf(item.props.position);
        if (at === null) continue;
        ctx.globalAlpha = opacityOf(item.props.opacity);
        ctx.strokeStyle = colourOf(item.props.color);
        ctx.beginPath();
        ctx.arc(at.x, at.y, RING_RADIUS_PX, 0, Math.PI * 2);
        ctx.stroke();
        const text = item.props.text;
        if (text !== undefined && text !== null) {
            ctx.fillStyle = TEXT_COLOUR;
            ctx.fillText(String(text), at.x + TEXT_OFFSET_PX, at.y);
        }
    }
    ctx.restore();
}

/* A binding resolves to whatever its source held, so everything that
   comes out of a plan is `unknown` and has to be asked rather than
   assumed. A drawing that threw on a programme's typo would take the
   table down over a spelling mistake. */
function positionOf(value: unknown): { x: number; y: number } | null {
    if (typeof value !== "object" || value === null) return null;
    const point = value as { x?: unknown; y?: unknown };
    return typeof point.x === "number" && typeof point.y === "number"
        ? { x: point.x, y: point.y }
        : null;
}

function colourOf(value: unknown): string {
    return typeof value === "string" ? value : FALLBACK_COLOUR;
}

function opacityOf(value: unknown): number {
    return typeof value === "number" && value >= 0 && value <= 1 ? value : 1;
}
