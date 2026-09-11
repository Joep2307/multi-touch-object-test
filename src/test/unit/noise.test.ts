/* De ruismeting: bekende spreiding erin, hetzelfde getal eruit.
 *
 * What this guards is the direction of the error. The measurement decides
 * how many codes a puck may carry, so a report that comes out calmer than
 * the table really is would quietly approve a design that then fails with
 * an audience around it. The numbers below are exact, not statistical: the
 * samples are placed by hand so the spread is known to the millimetre.
 */
import { noiseReport } from "../../puck/noise";
import { noise } from "../../state";
import { beforeEach, describe as suite, expect, it } from "vitest";
import type { NoiseFoot } from "../../types";

const PX_PER_MM = 4;

const foot = (x: number, y: number): NoiseFoot => ({
    ax: x,
    ay: y,
    n: 0,
    sx: 0,
    sy: 0,
    sxx: 0,
    syy: 0,
    miss: 0,
});

/** Four samples around the anchor, each `d` px off in both directions:
 *  the variance per axis is then exactly d². */
const scatter = (f: NoiseFoot, d: number): NoiseFoot => {
    for (const [dx, dy] of [
        [d, d],
        [-d, -d],
        [d, -d],
        [-d, d],
    ]) {
        f.n++;
        f.sx += f.ax + dx;
        f.sy += f.ay + dy;
        f.sxx += (f.ax + dx) ** 2;
        f.syy += (f.ay + dy) ** 2;
    }
    return f;
};

const reset = (): void => {
    noise.phase = "run";
    noise.frames = 4;
    noise.slip = 0;
    noise.feet = [];
    noise.radii = [];
    noise.snapSum = 0;
    noise.snapN = 0;
    noise.codes = new Map();
    noise.extra = 0;
    noise.report = null;
};

beforeEach(reset);

suite("de gemeten spreiding", () => {
    it("geeft de spreiding terug die erin ging", () => {
        noise.feet = [
            scatter(foot(400, 400), 2), // 0,5 mm
            scatter(foot(500, 400), 4), // 1,0 mm
            scatter(foot(450, 480), 2),
        ];
        const r = noiseReport(PX_PER_MM);
        expect(r.feet.map((f) => +f.sd.toFixed(3))).toEqual([0.5, 1, 0.5]);
        expect(r.worst).toBeCloseTo(1, 5);
        expect(r.sd).toBeCloseTo((0.5 + 1 + 0.5) / 3, 5);
    });

    it("telt uitval per pootje", () => {
        const f = scatter(foot(400, 400), 2);
        f.miss = 1;
        noise.feet = [f, scatter(foot(500, 400), 2)];
        const r = noiseReport(PX_PER_MM);
        expect(r.feet[0].miss).toBeCloseTo(0.25, 5);
        expect(r.miss).toBeCloseTo(0.125, 5);
    });

    it("rekent een pootje zonder metingen niet stuk", () => {
        noise.feet = [scatter(foot(400, 400), 2), foot(500, 400)];
        const r = noiseReport(PX_PER_MM);
        expect(Number.isFinite(r.sd)).toBe(true);
        expect(r.feet[1].sd).toBe(0);
    });

    it("neemt de mediaan van de straal en de code die het vaakst kwam", () => {
        noise.radii = [33.8, 34, 34.1, 34, 41];
        noise.codes = new Map([
            [459, 96],
            [455, 4],
        ]);
        noise.feet = [scatter(foot(400, 400), 2)];
        const r = noiseReport(PX_PER_MM);
        expect(r.radiusMM).toBe(34);
        expect(r.codeTop).toBeCloseTo(0.96, 5);
    });
});

suite("het oordeel", () => {
    const grade = (mm: number, miss = 0): string => {
        reset();
        const f = scatter(foot(400, 400), mm * PX_PER_MM);
        f.miss = miss * 4;
        noise.feet = [f];
        return noiseReport(PX_PER_MM).grade;
    };

    it("onder een millimeter: drie pootjes kunnen", () => {
        expect(grade(0.6)).toBe("good");
    });

    it("tussen een en twee millimeter: alleen verspreide patronen", () => {
        expect(grade(1.5)).toBe("fair");
    });

    it("boven twee millimeter: meer pootjes nodig", () => {
        expect(grade(2.4)).toBe("poor");
    });

    /* Voorbij tweeënhalve millimeter loopt de spreiding zelf vast -- een
       punt dat ver genoeg wegvalt wordt niet meer aan zijn pootje gekoppeld.
       Dan moet de uitval het oordeel dragen, anders leest een onbruikbare
       tafel als "matig". */
    it("veel uitval is op zichzelf al onvoldoende", () => {
        expect(grade(0.6, 0.25)).toBe("poor");
    });
});
