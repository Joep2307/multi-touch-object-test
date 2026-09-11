import type { PuckGeometryExports } from "../../types";

/* The loaded wasm module, or null while it's still on its way (or refused to
   load — then the table recognises nothing, but still renders). The views
   onto memory are recreated on every call: Rust can grow the memory, and
   then an old Float64Array would be detached. */
export const puckGeometry = {
    exports: null as PuckGeometryExports | null,
    error: null as Error | null,
    f64(ptr: number, len: number): Float64Array {
        return new Float64Array(this.exports!.memory.buffer, ptr, len);
    },
    u8(ptr: number, len: number): Uint8Array {
        return new Uint8Array(this.exports!.memory.buffer, ptr, len);
    },
};
