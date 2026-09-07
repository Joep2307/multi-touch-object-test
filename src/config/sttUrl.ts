import { CFG } from "./CFG";

/* The transcription service doesn't have to be the same machine as the
   knowledge graph, but usually is: if nothing separate is configured, the
   graph's address applies. If that's also empty, speech looks for it
   itself. */
export const sttUrl = (): string => CFG.sttUrl || CFG.kgUrl;
