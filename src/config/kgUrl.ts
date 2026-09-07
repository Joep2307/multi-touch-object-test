import { CFG } from "./CFG";

/* Everything that loads the graph asks for the address here, so there's
   only one place it comes from. */
export const kgUrl = (): string => CFG.kgUrl;
