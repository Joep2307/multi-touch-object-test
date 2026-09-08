import { TangibleObject } from "./TangibleObject";

/* A disc placed on the glass, recognised by its feet.
 *
 * Abstract, and holding no state of its own, because what separates
 * the pucks from one another is what they physically permit — a hole,
 * a nesting partner — and that lives on the kind as affordances. The
 * subclasses below exist only where a puck genuinely *behaves*
 * differently, which turns out to be a short list.
 */
export abstract class Puck extends TangibleObject {}
