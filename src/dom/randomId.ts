/* Timestamp plus some noise: unique enough for one table on one
   afternoon. */
export const randomId = (): string =>
    Date.now() + "-" + Math.random().toString(36).slice(2, 6);
