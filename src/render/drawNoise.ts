import { NOISE } from "../config/NOISE";
import { noise } from "../state/noise";
import { view } from "../state/view";

/* Dutch decimals, like the rest of this panel reads. */
const nl = (n: number, d = 1): string => n.toFixed(d).replace(".", ",");
const pct = (f: number): string => nl(f * 100, 1) + "%";

const GRADE = { good: "#39d8a4", fair: "#ffd166", poor: "#ff5f56" };

/* The noise measurement, top right, next to the puck diagnosis panel.

   What it answers: how steadily does this glass report the feet of a puck
   that is lying still? That single number decides how many codes can be
   told apart safely, so it belongs at the table, in millimetres, while you
   have the puck in your hand -- not in a spreadsheet afterwards. */
export function drawNoise(ctx: CanvasRenderingContext2D): void {
    const rows: { text: string; tone?: "head" | "warn" | string }[] = [];
    rows.push({ text: "Ruismeting", tone: "head" });
    if (noise.phase === "wait")
        rows.push({ text: "leg een puck stil op het glas" });
    else if (noise.phase === "hold") rows.push({ text: "stil houden…" });
    else if (noise.phase === "run")
        rows.push({
            text: `meten… ${noise.frames} / ${NOISE.FRAMES} beeldjes`,
        });
    const r = noise.phase === "done" ? noise.report : null;
    if (r) {
        rows.push({ text: `${r.feet.length} pootjes · ${r.frames} beeldjes` });
        rows.push({
            text:
                `spreiding ${nl(r.sd, 2)} mm per as ` +
                `(slechtste ${nl(r.worst, 2)})`,
        });
        rows.push({
            text: `uitval ${pct(r.miss)} · extra punten ${pct(r.extra)}`,
            tone: r.miss > 0.02 ? "warn" : undefined,
        });
        rows.push({
            text: `straal ${nl(r.radiusMM)} mm ± ${nl(r.radiusSD, 2)}`,
        });
        rows.push({
            text:
                `rooster ${nl(r.snapDeg)}° van het midden · ` +
                `code stabiel ${pct(r.codeTop)}`,
        });
        rows.push({ text: r.verdict, tone: GRADE[r.grade] });
        rows.push({ text: r.advice, tone: GRADE[r.grade] });
    }

    const F = 14,
        LH = 20,
        pad = 12;
    ctx.save();
    ctx.font = `${F}px 'JetBrains Mono',ui-monospace,monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const w =
        Math.max(...rows.map((q) => ctx.measureText(q.text).width)) + pad * 2;
    const h = rows.length * LH + pad * 2;
    const x = Math.max(16, view.W - w - 16);
    ctx.fillStyle = "rgba(7,9,12,.82)";
    ctx.strokeStyle = "rgba(232,237,244,.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, 16, w, h, 10);
    ctx.fill();
    ctx.stroke();
    rows.forEach((q, i) => {
        ctx.fillStyle =
            q.tone === "head"
                ? "#e8edf4"
                : q.tone === "warn"
                  ? "#ffd166"
                  : (q.tone ?? "#9aa7b8");
        ctx.fillText(q.text, x + pad, 16 + pad + i * LH);
    });
    ctx.restore();
}
