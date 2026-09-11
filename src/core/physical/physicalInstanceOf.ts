import { instanceStatusOf } from "./instanceStatusOf";
import { isTangible } from "./isTangible";
import type { InstanceMotion } from "./InstanceMotion";
import type { InstancePose } from "./InstancePose";
import type { Physical } from "./Physical";
import type { PhysicalInstance } from "./PhysicalInstance";

/* Flatten one physical into the record everything above recognition
   reads.
 *
 * One function rather than a method, because it is the boundary
 * itself: a `Physical` is a live object with traits inside it, and a
 * `PhysicalInstance` is a photograph of it. Making it a method would
 * put the photograph on the thing being photographed, and the
 * temptation to add "just one" live getter to the result would never
 * stop.
 *
 * Everything is read from the traits' snapshots rather than from the
 * traits, so the record cannot change under a consumer that holds on
 * to it — which the event log and every replay depend on.
 */
export function physicalInstanceOf(
    physical: Physical,
    at: number,
): PhysicalInstance {
    const presence = physical.presence;
    const common = {
        id: physical.id,
        kindId: physical.kind.id,
        roleId: physical.roleId,
        currentStateId: physical.currentStateId,
        properties: physical.properties,
        firstSeenAt: presence.firstSensedAt,
        lastSeenAt: presence.lastSensedAt,
    };

    if (!isTangible(physical)) {
        /* The table, the reset button, a remote stand-in: real enough
           to act, with nothing to measure. */
        return {
            ...common,
            signatureId: null,
            pose: null,
            motion: null,
            status: instanceStatusOf(presence.state, false),
        };
    }

    const snapshot = physical.base.snapshot(at);
    const pose: InstancePose = {
        /* The *smoothed* centre, not the raw one. `Move` exists
           because a solved centre carries the sensor's noise, and
           handing the raw value to everything above would mean every
           consumer filtering it again, each slightly differently. The
           two are equal on the frame an object is first seen, so
           nothing is lost by preferring the quieter one.

           The last accepted centre is the third fallback, and it is
           load-bearing. A tap's verdict lands on the frame the object
           comes *off* the glass, when there is nothing left to
           measure — so without it, every rule asking where a tap
           happened would be asking about an object with no position,
           and would fail. `status` still says `missing`, so anything
           that must not act on a remembered place can check. */
        position:
            snapshot.move.to ??
            snapshot.position.centre ??
            physical.lastKnownCentre,
        directionDeg: snapshot.direction.headingDeg,
        directionKnown: snapshot.direction.known,
        sizePX: physical.outerDiameterPX(),
        held: snapshot.position.held,
    };
    const motion: InstanceMotion = {
        velocity: snapshot.acceleration.velocity,
        speedPXperS: snapshot.acceleration.speedPXperS,
        acceleration: snapshot.acceleration.acceleration,
    };
    return {
        ...common,
        signatureId: physical.signature.id,
        pose,
        motion,
        status: instanceStatusOf(presence.state, snapshot.position.sensed),
    };
}
