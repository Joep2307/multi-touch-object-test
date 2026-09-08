/* Reproducible contact recordings with the failures of a real table.
 *
 * Geometry alone is too clean to exercise tracking. This helper keeps
 * contact lifetimes separate from foot identities, so jitter preserves a
 * touch while a dropout creates a genuinely new one when the foot returns.
 */
import type { FootprintSpec, Vec2 } from "../../../core/base";
import type {
    ContactFrame,
    ContactPoint,
    ContactRecording,
} from "../../../core/contact";

const HALF_TURN_DEG = 180;
const UINT32_RANGE = 4_294_967_296;

export type SyntheticFootprint =
    | {
          readonly kind: "triad";
          readonly radiusMM: number;
          readonly apexOffsetDeg: number;
      }
    | {
          readonly kind: "ring";
          readonly radiusMM: number;
          readonly anglesDeg: readonly number[];
      };

export type SyntheticPath =
    | {
          readonly kind: "still";
          readonly centrePX: Vec2;
          readonly rotationDeg: number;
      }
    | {
          readonly kind: "straight";
          readonly fromPX: Vec2;
          readonly toPX: Vec2;
          readonly fromRotationDeg: number;
          readonly toRotationDeg: number;
      }
    | {
          readonly kind: "rotate";
          readonly centrePX: Vec2;
          readonly fromDeg: number;
          readonly toDeg: number;
      };

export type SyntheticDropout = {
    readonly object: "primary" | "secondary";
    readonly foot: number;
    readonly fromFrame: number;
    readonly toFrame: number;
};

export type SyntheticStray = {
    readonly positionPX: Vec2;
    readonly radiusPX: number;
    readonly fromFrame: number;
    readonly toFrame: number;
};

export type SyntheticSecondObject = {
    readonly footprint: SyntheticFootprint;
    readonly offsetPX: Vec2;
    readonly rotationOffsetDeg: number;
};

export type SynthesiseOptions = {
    readonly seed: number;
    readonly name: string;
    readonly recordedAt: string;
    readonly frameCount: number;
    readonly frameMS: number;
    readonly startAt: number;
    readonly pxPerMM: number;
    readonly footprint: SyntheticFootprint;
    readonly path: SyntheticPath;
    readonly jitterMM: number;
    readonly dropouts?: readonly SyntheticDropout[];
    readonly strayContacts?: readonly SyntheticStray[];
    readonly secondObject?: SyntheticSecondObject;
    readonly footContactRadiusPX?: number;
};

type ContactLife = {
    id: number | null;
    firstSeen: number;
};

type Pose = {
    readonly centrePX: Vec2;
    readonly rotationDeg: number;
};

class Random {
    #state: number;
    #spareGaussian: number | null = null;

    constructor(seed: number) {
        this.#state = seed >>> 0;
    }

    next(): number {
        this.#state =
            (Math.imul(1_664_525, this.#state) + 1_013_904_223) >>> 0;
        return this.#state / UINT32_RANGE;
    }

    gaussian(): number {
        if (this.#spareGaussian !== null) {
            const result = this.#spareGaussian;
            this.#spareGaussian = null;
            return result;
        }
        /* `1 - next()` excludes zero, which would turn log(0) into an
           infinite contact coordinate and hide the noise being tested. */
        const radius = Math.sqrt(-2 * Math.log(1 - this.next()));
        const angle = 2 * Math.PI * this.next();
        this.#spareGaussian = radius * Math.sin(angle);
        return radius * Math.cos(angle);
    }
}

const radians = (degrees: number): number =>
    (degrees * Math.PI) / HALF_TURN_DEG;

const interpolate = (from: number, to: number, progress: number): number =>
    from + (to - from) * progress;

const poseAt = (path: SyntheticPath, progress: number): Pose => {
    if (path.kind === "still") {
        return {
            centrePX: path.centrePX,
            rotationDeg: path.rotationDeg,
        };
    }
    if (path.kind === "rotate") {
        return {
            centrePX: path.centrePX,
            rotationDeg: interpolate(path.fromDeg, path.toDeg, progress),
        };
    }
    return {
        centrePX: {
            x: interpolate(path.fromPX.x, path.toPX.x, progress),
            y: interpolate(path.fromPX.y, path.toPX.y, progress),
        },
        rotationDeg: interpolate(
            path.fromRotationDeg,
            path.toRotationDeg,
            progress,
        ),
    };
};

const rawFeet = (footprint: SyntheticFootprint): Vec2[] => {
    const angles =
        footprint.kind === "triad"
            ? [0, 120 + footprint.apexOffsetDeg, 240 - footprint.apexOffsetDeg]
            : footprint.anglesDeg;
    return angles.map((degrees) => ({
        x: footprint.radiusMM * Math.cos(radians(degrees)),
        y: footprint.radiusMM * Math.sin(radians(degrees)),
    }));
};

/* The path follows the centroid, so an asymmetric triad must be centred
   and rescaled after its angular construction. Otherwise `radiusMM`
   would describe a circle the solver never measures. */
export const syntheticFeet = (
    footprint: SyntheticFootprint,
): readonly Vec2[] => {
    const raw = rawFeet(footprint);
    if (raw.length === 0) return [];
    if (footprint.kind === "ring") return raw;
    let sumX = 0;
    let sumY = 0;
    for (const value of raw) {
        sumX += value.x;
        sumY += value.y;
    }
    const centroid = {
        x: sumX / raw.length,
        y: sumY / raw.length,
    };
    const centred = raw.map((value) => ({
        x: value.x - centroid.x,
        y: value.y - centroid.y,
    }));
    const meanRadius =
        centred.reduce((sum, value) => sum + Math.hypot(value.x, value.y), 0) /
        centred.length;
    if (meanRadius <= 0) return centred;
    const scale = footprint.radiusMM / meanRadius;
    return centred.map((value) => ({
        x: value.x * scale,
        y: value.y * scale,
    }));
};

export const syntheticFootprintSpec = (
    footprint: SyntheticFootprint,
    outerDiameterMM: number,
): FootprintSpec => {
    const feet = syntheticFeet(footprint);
    if (feet.length === 0) {
        return {
            expectedCount: 0,
            footRadiusMM: 0,
            footRadiusSpreadMM: 0,
            outerDiameterMM,
        };
    }
    const distances = feet.map((value) => Math.hypot(value.x, value.y));
    const footRadiusMM =
        distances.reduce((sum, value) => sum + value, 0) / distances.length;
    const footRadiusSpreadMM =
        distances.reduce(
            (sum, value) => sum + Math.abs(value - footRadiusMM),
            0,
        ) / distances.length;
    return {
        expectedCount: feet.length,
        footRadiusMM,
        footRadiusSpreadMM,
        outerDiameterMM,
    };
};

const isDropped = (
    dropouts: readonly SyntheticDropout[],
    object: SyntheticDropout["object"],
    foot: number,
    frame: number,
): boolean =>
    dropouts.some(
        (dropout) =>
            dropout.object === object &&
            dropout.foot === foot &&
            frame >= dropout.fromFrame &&
            frame <= dropout.toFrame,
    );

const transformedFoot = (
    localMM: Vec2,
    pose: Pose,
    pxPerMM: number,
    jitterPX: number,
    random: Random,
): Vec2 => {
    const angle = radians(pose.rotationDeg);
    const x = localMM.x * pxPerMM;
    const y = localMM.y * pxPerMM;
    return {
        x:
            pose.centrePX.x +
            x * Math.cos(angle) -
            y * Math.sin(angle) +
            random.gaussian() * jitterPX,
        y:
            pose.centrePX.y +
            x * Math.sin(angle) +
            y * Math.cos(angle) +
            random.gaussian() * jitterPX,
    };
};

export const synthesise = (options: SynthesiseOptions): ContactRecording => {
    const random = new Random(options.seed);
    const primaryFeet = syntheticFeet(options.footprint);
    const secondaryFeet =
        options.secondObject === undefined
            ? []
            : syntheticFeet(options.secondObject.footprint);
    const primaryLives: ContactLife[] = primaryFeet.map(() => ({
        id: null,
        firstSeen: 0,
    }));
    const secondaryLives: ContactLife[] = secondaryFeet.map(() => ({
        id: null,
        firstSeen: 0,
    }));
    const strays = options.strayContacts ?? [];
    const strayLives: ContactLife[] = strays.map(() => ({
        id: null,
        firstSeen: 0,
    }));
    const dropouts = options.dropouts ?? [];
    const jitterPX = options.jitterMM * options.pxPerMM;
    const footRadiusPX = options.footContactRadiusPX ?? 8;
    let nextId = 0;

    const frames: ContactFrame[] = [];
    for (let frame = 0; frame < options.frameCount; frame += 1) {
        const denominator = Math.max(1, options.frameCount - 1);
        const progress = frame / denominator;
        const at = options.startAt + frame * options.frameMS;
        const primaryPose = poseAt(options.path, progress);
        const points: ContactPoint[] = [];

        const addObject = (
            object: SyntheticDropout["object"],
            feet: readonly Vec2[],
            lives: ContactLife[],
            pose: Pose,
        ): void => {
            for (let foot = 0; foot < feet.length; foot += 1) {
                const local = feet[foot];
                const life = lives[foot];
                if (local === undefined || life === undefined) {
                    throw new Error("Foot state does not match its footprint");
                }
                if (isDropped(dropouts, object, foot, frame)) {
                    life.id = null;
                    continue;
                }
                if (life.id === null) {
                    life.id = nextId;
                    nextId += 1;
                    life.firstSeen = at;
                }
                const position = transformedFoot(
                    local,
                    pose,
                    options.pxPerMM,
                    jitterPX,
                    random,
                );
                points.push({
                    id: life.id,
                    x: position.x,
                    y: position.y,
                    radiusPX: footRadiusPX,
                    firstSeen: life.firstSeen,
                    lastSeen: at,
                });
            }
        };

        addObject("primary", primaryFeet, primaryLives, primaryPose);
        if (options.secondObject !== undefined) {
            const second = options.secondObject;
            addObject("secondary", secondaryFeet, secondaryLives, {
                centrePX: {
                    x: primaryPose.centrePX.x + second.offsetPX.x,
                    y: primaryPose.centrePX.y + second.offsetPX.y,
                },
                rotationDeg:
                    primaryPose.rotationDeg + second.rotationOffsetDeg,
            });
        }

        for (let index = 0; index < strays.length; index += 1) {
            const stray = strays[index];
            const life = strayLives[index];
            if (stray === undefined || life === undefined) {
                throw new Error("Stray state does not match its definition");
            }
            const active = frame >= stray.fromFrame && frame <= stray.toFrame;
            if (!active) {
                life.id = null;
                continue;
            }
            if (life.id === null) {
                life.id = nextId;
                nextId += 1;
                life.firstSeen = at;
            }
            points.push({
                id: life.id,
                x: stray.positionPX.x,
                y: stray.positionPX.y,
                radiusPX: stray.radiusPX,
                firstSeen: life.firstSeen,
                lastSeen: at,
            });
        }

        points.sort((left, right) => left.id - right.id);
        frames.push({ at, points });
    }

    return {
        version: 1,
        name: options.name,
        recordedAt: options.recordedAt,
        frames,
    };
};
