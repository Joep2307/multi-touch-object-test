import type { KindId } from "../physical";
import type { ModeId } from "./ModeId";
import type { RoleId } from "./RoleId";

/* Which scopes apply to the question being asked. */
export type SettingsQuery = {
    readonly modeId?: ModeId | null;
    readonly roleId?: RoleId | null;
    readonly kindId?: KindId | null;
};
