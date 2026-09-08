import { Physical } from "./Physical";

/* A physical control wired to the table: no place on the glass, but
   real, and pressed by a person.
 *
 * Separate from `VirtualPhysical` because a person is acting. When
 * the journal is read back, "somebody pressed reset" and "the table
 * reset itself after a timeout" must be distinguishable, and the
 * class is where that distinction lives.
 */
export abstract class HardwareControl extends Physical {
    override readonly hasPose = false;
    override readonly virtual = false;
}
