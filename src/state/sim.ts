import type { SimPuck, TrayDrag } from "../types";

/* The drag copies from the tray. `seq` gives each copy its own number: the
   type no longer says which one it is — there can be two of the same lying
   around — but recognition still needs to be able to tell the contact
   points of two pucks apart. One drag per finger (`trayDrags`): at a table,
   two people can reach into the tray at the same time. */
export const sim = {
    pucks: [] as SimPuck[],
    seq: 0,
    trayDrags: new Map<number, TrayDrag>(),
};
