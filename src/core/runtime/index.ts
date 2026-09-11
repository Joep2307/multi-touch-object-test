/* The loop, as one object.
 *
 * Contact points become an object, the object's movements become
 * events, events test rules, rules change state and image. Everything
 * here is wiring: the order the pieces run in is the only judgement in
 * this folder, and every judgement it looks like it is making belongs
 * to a definition in the programme.
 */
export { Runtime } from "./Runtime";
