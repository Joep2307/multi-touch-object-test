/* The headless model of what lies on the glass.
 *
 * Nothing under src/core/ may import from the app tree or touch the
 * DOM; see tsconfig.core.json and the src/core rules in
 * eslint.config.js. Read TODO.md for what is being built here and in
 * what order.
 *
 * Phases 0 to 2 are done: contacts and replay, then the base traits
 * Position and Direction. Move, Rotate and Tap follow in phase 3,
 * Tail and Acceleration in phase 4, physicals in phase 5.
 */
export * from "./base";
export * from "./contact";
