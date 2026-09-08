/* A swappable rule object: where a number would otherwise be
   hardcoded.
 *
 * The rule for the whole core is that no function body contains a
 * tuning value. Every one lives either on a descriptor (what an object
 * *is*) or on a policy (how the table should *behave*). Today those
 * numbers are spread through `CFG` and a few function bodies, which is
 * why changing the tap threshold means reading three files first.
 *
 * `describe()` is what makes this an abstract class rather than a bare
 * type: every policy can list its values, so a dev overlay can show
 * every tuning number on the table in one panel, and `ModelValidator`
 * can check them, without either of them knowing what policies exist.
 */
export abstract class Policy {
    abstract readonly id: string;

    /* Every tuning value this policy holds, by name. Used for the
       diagnostics panel and by the validator; never read to drive
       behaviour. */
    abstract describe(): Readonly<Record<string, number>>;
}
