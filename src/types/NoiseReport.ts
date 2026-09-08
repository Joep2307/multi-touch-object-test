/* The outcome of a noise measurement, in millimetres and fractions.
   `sd` is the spread per axis -- the same quantity a simulation feeds in as
   sigma, so the two can be compared directly. `verdict` is the one line
   that answers what the measurement was for: what kind of code this table
   can carry. */
export interface NoiseReport {
    frames: number;
    feet: { sd: number; miss: number }[];
    sd: number;
    worst: number;
    miss: number;
    extra: number;
    radiusMM: number;
    radiusSD: number;
    snapDeg: number;
    codeTop: number;
    verdict: string;
    advice: string;
    grade: "good" | "fair" | "poor";
}
