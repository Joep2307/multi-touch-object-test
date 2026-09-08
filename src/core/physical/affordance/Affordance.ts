/* What an object physically permits — which is not the same as what
   its holder is allowed to do.
 *
 * This separation is the most useful line in the whole model.
 * `Apertured` says a tap through the hole is *possible*; a role's
 * function set says it is *allowed*; and neither ever has to know the
 * other exists. Without it, every question about a puck becomes a
 * question about permissions, and physical facts start living in the
 * permission system where they rot.
 *
 * An affordance is a descriptor, not behaviour: it carries the
 * measurements that make the physical fact true, and nothing else.
 */
export abstract class Affordance {
    abstract readonly id: string;
}
