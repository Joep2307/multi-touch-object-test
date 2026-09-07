import { stt } from "./stt";

export const sttWorks = (): boolean =>
    stt.mode === "backend" || stt.mode === "browser";
