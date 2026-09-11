/* The session: the active mode, the variables, the objects on the
   glass, who holds which part, and the log.
 *
 * The only place with real state. Everything else in the model is
 * either a definition, authored up front and unchanging, or a
 * measurement, true for one frame. When a session ends, all of it is
 * gone except the log.
 */
export { EventLog } from "./EventLog";
export { OverflowResolver } from "./OverflowResolver";
export { RoleAssigner } from "./RoleAssigner";
export { Session } from "./Session";
export { SettingsResolver } from "./SettingsResolver";
export * from "./overflow";
export type { AssignmentStatus } from "./AssignmentStatus";
export type { EventLogEntry } from "./EventLogEntry";
export type { ModeDefinition } from "./ModeDefinition";
export type { ModeId } from "./ModeId";
export type { OverflowDecision } from "./OverflowDecision";
export type { OverflowPolicy } from "./OverflowPolicy";
export type { RoleAssignment } from "./RoleAssignment";
export type { RoleDefinition } from "./RoleDefinition";
export type { RoleId } from "./RoleId";
export type { SettingScope } from "./SettingScope";
export type { Settings } from "./Settings";
export type { SettingsQuery } from "./SettingsQuery";
