import { FULL_TURN_DEG } from "../base/direction/constants";
import type { BaseSnapshot } from "../base/BaseSnapshot";
import type { GestureDefinition } from "./GestureDefinition";
import type { GestureId } from "./GestureId";
import type { GestureResult } from "./GestureResult";
import type { MotionSample } from "../base/motion/MotionSample";
import type { PresenceState } from "../physical/PresenceState";
import type { Vec2 } from "../base/Vec2";

/* Turns one object's movement into the gestures a programme asked for.
 *
 * One recogniser per physical, fed the base snapshot once a frame.
 * Everything it needs is in that snapshot and in the presence state,
 * which is what keeps it out of the kinematics: it reads answers, it
 * does not measure. A trait that had to change for a new gesture would
 * mean the split was wrong.
 *
 * Definitions are evaluated **in order**, and the first press gesture
 * that matches wins. That makes precedence data rather than code: a
 * double tap beats a tap because the default list puts it first, and a
 * programme that wants it the other way round says so in its own file.
 *
 * A shake is read from the motion history rather than from state kept
 * here, and that is worth the indirection. The path is already
 * recorded, already decimated by `minStepPX`, and already bounded — so
 * counting reversals in it is a pure function of the snapshot, and a
 * test can hand one in rather than driving thirty frames to build one
 * up.
 */
export class GestureRecogniser {
    readonly #definitions: readonly GestureDefinition[];
    /* When each definition last fired, so a rotate reports once per
       turn rather than once per frame and a shake does not repeat for
       as long as the hand is still shaking. */
    readonly #firedAt = new Map<GestureId, number>();
    readonly #firedAtRotation = new Map<GestureId, number>();
    #wasDown = false;
    #wasMoving = false;
    #wasPlaced = false;
    #seenAFrame = false;
    #lastTapEndedAt: number | null = null;
    #moveStartedAt = 0;
    /* How many feet were down during the press, remembered while they
       still were. A press is judged on the frame the object comes
       *off* the glass, when the count is zero by construction — so a
       definition asking for three feet could never match anything. */
    #downContacts = 0;

    constructor(definitions: readonly GestureDefinition[]) {
        this.#definitions = definitions;
    }

    update(
        snapshot: BaseSnapshot,
        presence: PresenceState,
    ): readonly GestureResult[] {
        const results: GestureResult[] = [];
        /* The first frame sets the marks; it never reports. A
           recogniser built while a puck is already turning — which is
           what happens when a programme finishes loading in the middle
           of a session — would otherwise measure its rotation from
           zero and announce a turn nobody made. */
        if (!this.#seenAFrame) {
            this.#seenAFrame = true;
            for (const def of this.#definitions) {
                if (def.gesture !== "rotate") continue;
                this.#firedAtRotation.set(
                    def.id,
                    snapshot.rotate.deltaTotalDeg,
                );
            }
        }
        this.#presence(snapshot, presence, results);
        this.#press(snapshot, results);
        this.#travel(snapshot, results);
        this.#turn(snapshot, results);
        this.#shake(snapshot, results);
        return results;
    }

    /* Put down and picked up. From `Presence` rather than from the
       contacts, so the hold window that keeps a briefly unmeasured
       puck on the glass applies here too — otherwise every dropout
       would read as a removal and a replacement. */
    #presence(
        snapshot: BaseSnapshot,
        presence: PresenceState,
        results: GestureResult[],
    ): void {
        const placed = presence === "placed";
        if (placed !== this.#wasPlaced) {
            const wanted = placed ? "place" : "remove";
            for (const def of this.#definitions) {
                if (def.gesture !== wanted) continue;
                results.push(this.#result(def, snapshot.at, 0, 0, null));
            }
        }
        this.#wasPlaced = placed;
    }

    /* Tap, double tap and hold, decided on the frame the object comes
       off the glass. Until then a short press and a long one are the
       same event, and guessing at the threshold would fire a tap on
       something that turns out to be a hold. */
    #press(snapshot: BaseSnapshot, results: GestureResult[]): void {
        const tap = snapshot.tap;
        const released = this.#wasDown && !tap.down;
        if (tap.down) this.#downContacts = snapshot.position.contactCount;
        this.#wasDown = tap.down;
        if (!released) return;

        const at = snapshot.at;
        /* The time the object spent *off* the glass between the two
           presses, which is what the definition says it measures. The
           second press's own dwell used to count against the window,
           so two deliberate quarter-second presses a fifth of a second
           apart fell outside a four-hundred-millisecond gap. */
        const gap =
            this.#lastTapEndedAt === null
                ? Number.POSITIVE_INFINITY
                : at - tap.dwellMS - this.#lastTapEndedAt;

        for (const def of this.#definitions) {
            if (!this.#countsPress(def)) continue;
            const matched =
                (def.gesture === "tap" &&
                    tap.dwellMS <= def.maxDurationMS &&
                    tap.movedPX <= def.maxDistancePX) ||
                (def.gesture === "doubleTap" &&
                    tap.dwellMS <= def.maxDurationMS &&
                    tap.movedPX <= def.maxDistancePX &&
                    gap <= def.maxGapMS) ||
                (def.gesture === "hold" &&
                    tap.dwellMS >= def.minDurationMS &&
                    tap.movedPX <= def.maxDistancePX);
            if (!matched) continue;
            results.push(
                this.#result(def, at, tap.dwellMS, tap.movedPX, null),
            );
            /* A double consumes both taps, so three quick presses read
               as double then tap and never as two doubles. */
            this.#lastTapEndedAt = def.gesture === "tap" ? at : null;
            return;
        }
        /* A press that was neither — a drag, or something between the
           thresholds — breaks any double in progress. */
        this.#lastTapEndedAt = null;
    }

    /* A swipe is judged when the movement stops, because how far it
       went is not known until it has. */
    #travel(snapshot: BaseSnapshot, results: GestureResult[]): void {
        const move = snapshot.move;
        const stopped = this.#wasMoving && !move.moving;
        if (move.moving && !this.#wasMoving) this.#moveStartedAt = snapshot.at;
        this.#wasMoving = move.moving;
        if (!stopped) return;

        const from = move.from;
        const to = move.to;
        if (from === null || to === null) return;
        const net: Vec2 = { x: to.x - from.x, y: to.y - from.y };
        const distancePX = Math.hypot(net.x, net.y);
        const durationMS = snapshot.at - this.#moveStartedAt;
        const directionDeg = degreesOf(net);

        for (const def of this.#definitions) {
            if (def.gesture !== "swipe") continue;
            if (!this.#counts(def, snapshot)) continue;
            if (distancePX < def.minDistancePX) continue;
            if (durationMS > def.maxDurationMS) continue;
            if (!withinRange(directionDeg, def.directionRangeDeg)) continue;
            results.push(
                this.#result(
                    def,
                    snapshot.at,
                    durationMS,
                    distancePX,
                    directionDeg,
                ),
            );
        }
    }

    /* Turning reports repeatedly: a dial held round through half a
       circle should say so several times, not once at the end. Each
       report is measured from where the last one fired, so the steps
       tile the turn instead of overlapping. */
    #turn(snapshot: BaseSnapshot, results: GestureResult[]): void {
        const total = snapshot.rotate.deltaTotalDeg;
        for (const def of this.#definitions) {
            if (def.gesture !== "rotate") continue;
            if (!this.#counts(def, snapshot)) continue;
            const since = this.#firedAtRotation.get(def.id) ?? 0;
            const turned = total - since;
            if (Math.abs(turned) < def.minRotationDeg) continue;
            /* Advance by whole steps, not to wherever the turn has got
               to. Snapping the baseline forward threw away everything
               past the threshold, so a puck turned at seven degrees a
               frame reported ten steps for a full circle instead of
               twelve, and the loss accumulated all session. */
            const steps =
                Math.trunc(Math.abs(turned) / def.minRotationDeg) *
                Math.sign(turned);
            this.#firedAtRotation.set(
                def.id,
                since + steps * def.minRotationDeg,
            );
            results.push(
                this.#result(def, snapshot.at, 0, 0, wrapDegrees(turned)),
            );
        }
    }

    /* A shake goes back and forth and ends up where it started, which
       is exactly what separates it from a swipe: both cover ground,
       only one of them arrives somewhere. */
    #shake(snapshot: BaseSnapshot, results: GestureResult[]): void {
        for (const def of this.#definitions) {
            if (def.gesture !== "shake") continue;
            if (!this.#counts(def, snapshot)) continue;
            const firedAt = this.#firedAt.get(def.id);
            if (
                firedAt !== undefined &&
                snapshot.at - firedAt < def.withinMS
            ) {
                continue;
            }
            const window = snapshot.motionHistory.points.filter(
                (point) => snapshot.at - point.at <= def.withinMS,
            );
            const path = walk(window, def.minStepPX);
            if (path.reversals < def.minReversals) continue;
            if (path.travelledPX < def.minTravelPX) continue;
            if (path.netPX > def.maxNetDistancePX) continue;
            this.#firedAt.set(def.id, snapshot.at);
            results.push(
                this.#result(
                    def,
                    snapshot.at,
                    def.withinMS,
                    path.travelledPX,
                    null,
                ),
            );
        }
    }

    #counts(def: GestureDefinition, snapshot: BaseSnapshot): boolean {
        const wanted = def.requiredContactCount;
        return (
            wanted === undefined || snapshot.position.contactCount === wanted
        );
    }

    /* The same question for a press, asked of the count while the
       object was still down. A press is judged on the frame it comes
       *off* the glass, when the count is zero by construction, so
       asking then meant a definition wanting three feet could never
       match anything at all. */
    #countsPress(def: GestureDefinition): boolean {
        const wanted = def.requiredContactCount;
        return wanted === undefined || this.#downContacts === wanted;
    }

    #result(
        def: GestureDefinition,
        at: number,
        durationMS: number,
        distancePX: number,
        directionDeg: number | null,
    ): GestureResult {
        return {
            definitionId: def.id,
            gesture: def.gesture,
            at,
            durationMS,
            distancePX,
            directionDeg,
        };
    }

    reset(): void {
        this.#firedAt.clear();
        this.#firedAtRotation.clear();
        this.#wasDown = false;
        this.#wasMoving = false;
        this.#wasPlaced = false;
        this.#seenAFrame = false;
        this.#lastTapEndedAt = null;
        this.#moveStartedAt = 0;
        this.#downContacts = 0;
    }
}

type Walk = {
    readonly reversals: number;
    readonly travelledPX: number;
    readonly netPX: number;
};

/* How much a path doubled back on itself. A step below `minStepPX` is
   not a direction change, it is the sensor, so it is skipped rather
   than counted — otherwise a puck standing still shakes. */
function walk(points: readonly MotionSample[], minStepPX: number): Walk {
    let reversals = 0;
    let travelledPX = 0;
    let previous: Vec2 | null = null;
    for (let i = 1; i < points.length; i += 1) {
        const a = points[i - 1];
        const b = points[i];
        if (a === undefined || b === undefined) continue;
        const step: Vec2 = { x: b.x - a.x, y: b.y - a.y };
        const length = Math.hypot(step.x, step.y);
        travelledPX += length;
        if (length < minStepPX) continue;
        if (
            previous !== null &&
            previous.x * step.x + previous.y * step.y < 0
        ) {
            reversals += 1;
        }
        previous = step;
    }
    const first = points[0];
    const last = points[points.length - 1];
    const netPX =
        first === undefined || last === undefined
            ? 0
            : Math.hypot(last.x - first.x, last.y - first.y);
    return { reversals, travelledPX, netPX };
}

function degreesOf(v: Vec2): number {
    return wrapDegrees((Math.atan2(v.y, v.x) * FULL_TURN_DEG) / (2 * Math.PI));
}

function wrapDegrees(deg: number): number {
    const wrapped = deg % FULL_TURN_DEG;
    return wrapped < 0 ? wrapped + FULL_TURN_DEG : wrapped;
}

/* Ranges may wrap through zero: 350 to 10 is the twenty degrees around
   north, not the three hundred and forty the other way. */
function withinRange(
    deg: number,
    range: readonly [number, number] | null,
): boolean {
    if (range === null) return true;
    const [from, to] = range;
    const start = wrapDegrees(from);
    const end = wrapDegrees(to);
    return start <= end
        ? deg >= start && deg <= end
        : deg >= start || deg <= end;
}
