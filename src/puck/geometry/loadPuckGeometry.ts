import { LAYOUT } from "./LAYOUT";
import { puckGeometry } from "./puckGeometry";
import type { PuckGeometryExports } from "../../types";
import wasmUrl from "./puck_geometry.wasm?url";

/* Pull in the Rust crate. Once, at startup; the render loop doesn't wait for
   it — as long as this is running, recognise() simply recognises nothing. */
export async function loadPuckGeometry(): Promise<void> {
    try {
        const bytes = await (await fetch(wasmUrl)).arrayBuffer();
        const { instance } = await WebAssembly.instantiate(bytes, {});
        const ex = instance.exports as unknown as PuckGeometryExports;
        // The layout here and the one in lib.rs must match; otherwise we'd
        // read numbers from the wrong place and every puck would be a ghost.
        if (
            ex.max_points() !== LAYOUT.MAX_POINTS ||
            ex.max_templates() !== LAYOUT.MAX_TEMPLATES ||
            ex.max_tracks() !== LAYOUT.MAX_TRACKS ||
            ex.max_out() !== LAYOUT.MAX_OUT
        )
            throw new Error(
                "puck_geometry.wasm past niet bij LAYOUT.ts — " +
                    "draai `npm run wasm`",
            );
        puckGeometry.exports = ex;
    } catch (e) {
        puckGeometry.error = e instanceof Error ? e : new Error(String(e));
        console.error(
            "[puck] de meetkunde (wasm) laadt niet; " +
                "pucks worden niet herkend:",
            e,
        );
    }
}
