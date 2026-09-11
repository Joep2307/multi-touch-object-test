import type { KindId } from "../physical/KindId";
import type { ModeId } from "./ModeId";
import type { RoleId } from "./RoleId";
import type { Settings } from "./Settings";

/* Which scopes apply to the question being asked. */
export type SettingsQuery = {
    readonly modeId?: ModeId | null;
    readonly roleId?: RoleId | null;
    readonly kindId?: KindId | null;
};

/* The most specific answer wins.
 *
 * A tap interval set once for the table, overridden for the Voting
 * mode, and overridden again for one awkward kind of puck — and
 * nothing that reads it knows which of the three it got. That is what
 * lets `CFG` be dismantled one policy at a time rather than in a
 * single rewrite: a policy starts reading its number through here,
 * and the number is wherever it already was until someone moves it.
 *
 * Ordering is by scope, not by declaration order, so a programme file
 * can list its settings in whatever order reads best.
 */
export class SettingsResolver {
    readonly #byKey = new Map<string, Settings[]>();

    constructor(settings: readonly Settings[] = []) {
        for (const setting of settings) this.add(setting);
    }

    add(setting: Settings): void {
        const known = this.#byKey.get(setting.key);
        if (known === undefined) {
            this.#byKey.set(setting.key, [setting]);
            return;
        }
        known.push(setting);
    }

    value(key: string, query: SettingsQuery = {}): unknown {
        const candidates = this.#byKey.get(key);
        if (candidates === undefined) return undefined;
        let best: Settings | null = null;
        let bestRank = -1;
        let fallback: unknown;
        for (const setting of candidates) {
            if (setting.defaultValue !== undefined) {
                fallback = setting.defaultValue;
            }
            const rank = rankOf(setting, query);
            if (rank > bestRank) {
                best = setting;
                bestRank = rank;
            }
        }
        return best === null ? fallback : best.value;
    }

    number(key: string, fallback: number, query: SettingsQuery = {}): number {
        const value = this.value(key, query);
        return typeof value === "number" ? value : fallback;
    }
}

/* How specific this setting is to the question, or -1 if it does not
   apply at all. The order of the cases is the order of the scopes. */
function rankOf(setting: Settings, query: SettingsQuery): number {
    switch (setting.scope) {
        case "global":
            return 0;
        case "session":
            return 1;
        case "mode":
            return setting.scopeId === query.modeId ? 2 : -1;
        case "role":
            return setting.scopeId === query.roleId ? 3 : -1;
        case "physicalKind":
            return setting.scopeId === query.kindId ? 4 : -1;
    }
}
