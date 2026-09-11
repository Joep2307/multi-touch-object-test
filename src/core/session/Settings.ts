import type { SettingScope } from "./SettingScope";

/* One tunable value, and how widely it applies.
 *
 * This is where `CFG` goes to die. Today it is one flat object with no
 * scope, so "the tap interval" is one number for the whole table
 * forever; here the same key can have a different answer per mode, per
 * role or per kind, and nothing that reads it has to know which.
 *
 * `scopeId` names the mode, role or kind this applies to, and is
 * absent for the two scopes that have nothing to name.
 * `defaultValue` is what to fall back to when nothing at any scope
 * defines the key — kept beside the value rather than in the code that
 * reads it, so a missing setting is a data problem with a data answer.
 */
export type Settings = {
    readonly id: string;
    readonly scope: SettingScope;
    readonly scopeId?: string;
    readonly key: string;
    readonly value: unknown;
    readonly defaultValue?: unknown;
    /* A range, a list of allowed values, or nothing. Checked by
       `ModelValidator` at boot rather than at every read: a setting
       that is out of range is a broken programme, not a runtime
       condition to handle sixty times a second. */
    readonly validation?: {
        readonly min?: number;
        readonly max?: number;
        readonly oneOf?: readonly unknown[];
    };
};
