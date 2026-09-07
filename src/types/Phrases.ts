/* One language from the language table. Values may be functions — that
   saves separate rules for plurals and filled-in numbers. `topics` is the
   only list.

   The arguments are deliberately `any`: the table in L.ts writes `(n) => …`
   without types, and tr() passes through whatever the caller supplies. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Phrase = string | ((...args: any[]) => string);

export interface Phrases {
    topics: string[];
    [key: string]: Phrase | string[];
}
