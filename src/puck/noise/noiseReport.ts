import { CFG } from "../../config/CFG";
import { noise } from "../../state/noise";
import type { NoiseReport } from "../../types/NoiseReport";

const median = (a: number[]): number => {
    if (!a.length) return 0;
    const s = [...a].sort((x, y) => x - y);
    return s[s.length >> 1];
};

/* The sums turned into millimetres, and one line of what it means.

   `sd` is per axis: the two variances averaged, not added. That is the
   number a simulation puts in as sigma per coordinate, so measurement and
   simulation can be laid side by side without a conversion in between.

   The verdict follows the simulated confusion rates for a puck with three
   feet on nine slots: under a millimetre nothing goes wrong, around two
   millimetres it names the wrong puck in a few per cent of frames, and
   above that only more feet help -- six of twelve falls silent instead of
   choosing wrongly, which is the only acceptable kind of failure at a table
   with an audience.

   Dropouts count towards the verdict on their own. Past two and a half
   millimetres of scatter the spread itself stops rising -- a point that
   lands far enough away is no longer matched to its foot at all -- but
   those unmatched frames show up as dropouts, so that is what says the
   measurement has run out of road. */
export function noiseReport(pxPerMM: number): NoiseReport {
    const k = pxPerMM || 1;
    const frames = Math.max(1, noise.frames);
    const feet = noise.feet.map((f) => {
        const n = Math.max(1, f.n);
        const vx = f.sxx / n - (f.sx / n) ** 2;
        const vy = f.syy / n - (f.sy / n) ** 2;
        return {
            sd: Math.sqrt(Math.max(0, (vx + vy) / 2)) / k,
            miss: f.miss / frames,
        };
    });
    const sd = feet.length
        ? feet.reduce((s, f) => s + f.sd, 0) / feet.length
        : 0;
    const worst = feet.reduce((m, f) => Math.max(m, f.sd), 0);
    const miss = feet.length
        ? feet.reduce((s, f) => s + f.miss, 0) / feet.length
        : 0;
    const radiusMM = median(noise.radii);
    const rv = noise.radii.length
        ? noise.radii.reduce((s, r) => s + (r - radiusMM) ** 2, 0) /
          noise.radii.length
        : 0;
    let top = 0;
    for (const c of noise.codes.values()) top = Math.max(top, c);
    const codeSeen = [...noise.codes.values()].reduce((s, c) => s + c, 0);

    const grade: NoiseReport["grade"] =
        sd <= 1 && miss < 0.02
            ? "good"
            : sd <= 2 && miss < 0.1
              ? "fair"
              : "poor";
    const verdict =
        grade === "good"
            ? "goed — drie pootjes op negen vakjes kan"
            : grade === "fair"
              ? "matig — alleen verspreide patronen"
              : "slecht — meer pootjes nodig";
    const advice =
        miss >= 0.1
            ? "veel uitval: de pootjes maken slecht contact of liggen te dicht op elkaar"
            : grade === "good"
              ? "tien codes met drie pootjes zijn haalbaar"
              : grade === "fair"
                ? "houd het op vier patronen zonder buren, of neem een tweede ringmaat"
                : `zes pootjes op ${CFG.slotCount} vakjes: die zwijgen in plaats van zich te vergissen`;

    return {
        frames: noise.frames,
        feet,
        sd,
        worst,
        miss,
        extra: noise.extra / frames,
        radiusMM,
        radiusSD: Math.sqrt(rv),
        snapDeg: noise.snapN ? noise.snapSum / noise.snapN : 0,
        codeTop: codeSeen ? top / codeSeen : 0,
        verdict,
        advice,
        grade,
    };
}
