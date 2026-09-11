import { puckGeometry } from "../../puck/geometry";
import { fileURLToPath } from "node:url";
import type { PuckGeometryExports } from "../../types";
import fs from "node:fs";
import path from "node:path";

/* The browser fetches the wasm via vite (`?url` + fetch); a test under Node
   just reads it from disk and puts it in the same place. */
export async function loadWasmForTest(): Promise<void> {
    if (puckGeometry.exports) return;
    const file = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../puck/geometry/puck_geometry.wasm",
    );
    const { instance } = await WebAssembly.instantiate(
        fs.readFileSync(file),
        {},
    );
    puckGeometry.exports = instance.exports as unknown as PuckGeometryExports;
}
