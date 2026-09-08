/* The headless model of what lies on the glass.
 *
 * Nothing under src/core/ may import from the app tree or touch the
 * DOM; see tsconfig.core.json and the src/core rules in
 * eslint.config.js. Read TODO.md for what is being built here and in
 * what order.
 *
 * Phases 0 to 3 and 5 are done: contacts and replay, the base traits,
 * and physicals with their kinds and presence. Phase 4 (Tail and
 * Acceleration) is being written separately; phase 6 brings the
 * bridge that runs this beside the old pipeline.
 */
export * from "./base";
export * from "./contact";
export * from "./physical";
