import { gapsOf } from "./gapsOf";

/* The gaps of a ring as one readable line: 70·82·44·56·108 */
export const gapText = (angles: number[]): string =>
    gapsOf(angles)
        .map((g) => Math.round(g))
        .join("·");
