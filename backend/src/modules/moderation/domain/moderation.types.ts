export type ModerationRole = "MODERATOR" | "ADMIN";
export type AccountRoleValue = "USER" | "MODERATOR" | "ADMIN";

export type ReportTargetTypeValue = "USER" | "STORY" | "CHAPTER" | "COMMENT";
export type ReportReasonValue =
    | "SPAM"
    | "HARASSMENT"
    | "HATE_OR_ABUSE"
    | "SEXUAL_CONTENT"
    | "VIOLENCE"
    | "COPYRIGHT"
    | "IMPERSONATION"
    | "OTHER";
export type ReportStatusValue = "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";
export type ModerationActionValue =
    | "SUSPEND_USER"
    | "RESTORE_USER"
    | "HIDE_STORY"
    | "RESTORE_STORY"
    | "HIDE_CHAPTER"
    | "RESTORE_CHAPTER"
    | "HIDE_COMMENT"
    | "RESTORE_COMMENT";

export interface ModerationActor {
    userId: string;
    role: ModerationRole;
}
