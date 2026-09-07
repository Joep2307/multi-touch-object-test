import { QS } from "./QS";

/* ── Dev mode ──────────────────────────────────────────────────────────
   Simulate puck, touch debug, reading in a puck, and the build drawing are
   tools for whoever builds or calibrates the table. At a table with the
   public around it, they're just buttons that can break something — one
   swipe across the tolerance slider and recognition is thrown off. So they
   only appear when the URL asks for them: ?dev. Deliberately not persisted
   in localStorage; whoever wants the tooling adds it themselves. */
export const DEV = QS.has("dev") && QS.get("dev") !== "0";
