/* The headless model of what lies on the glass.
 *
 * Nothing under src/core/ may import from the app tree or touch the
 * DOM; see tsconfig.core.json and the src/core rules in
 * eslint.config.js.
 *
 * Two plans run through this folder. todo/TODO.md built the Base:
 * contacts and replay, the traits, physicals, kinds and presence,
 * finished through the phase 6 parity bridge.
 * todo/TODO-interaction-model.md builds the layers above it, and its
 * phase A is what gave the recognition layer the model's names —
 * signatures, instances, gestures.
 *
 * The four folders that are barely more than a barrel are deliberate:
 * `behaviour/`, `session/`, `presentation/` and `programme/` hold the
 * branded ids the recognition layer already has to name, so the phases
 * that fill them add files rather than moving them.
 */
export * from "./base";
export * from "./behaviour";
export * from "./contact";
export * from "./events";
export * from "./gesture";
export * from "./physical";
export * from "./presentation";
export * from "./programme";
export * from "./relation";
export * from "./runtime";
export * from "./session";
