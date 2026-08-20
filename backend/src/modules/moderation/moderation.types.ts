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

export interface ModerationStore {
    targetVisibleToReporter(
        reporterId: string,
        targetType: ReportTargetTypeValue,
        targetId: string,
    ): Promise<boolean>;
    hasOpenReport(
        reporterId: string,
        targetType: ReportTargetTypeValue,
        targetId: string,
    ): Promise<boolean>;
    createReport(input: {
        reporterId: string;
        targetType: ReportTargetTypeValue;
        targetId: string;
        reason: ReportReasonValue;
        details?: string;
    }): Promise<{ id: string; status: ReportStatusValue; createdAt: Date }>;
    listReports(input: {
        cursor?: string;
        limit: number;
        status?: ReportStatusValue;
        targetType?: ReportTargetTypeValue;
    }): Promise<{
        reports: Array<{
            id: string;
            targetType: ReportTargetTypeValue;
            targetId: string;
            reason: ReportReasonValue;
            details: string | null;
            status: ReportStatusValue;
            resolution: string | null;
            createdAt: Date;
            updatedAt: Date;
            reporter: { username: string; displayName: string };
            assignedTo: { id: string; username: string } | null;
        }>;
        pagination: { hasMore: boolean; nextCursor: string | null };
    }>;
    updateReport(
        reportId: string,
        moderatorId: string,
        input: {
            status?: ReportStatusValue;
            resolution?: string | null;
            assignToSelf?: boolean;
        },
    ): Promise<boolean>;
    getModerationTarget(targetType: ReportTargetTypeValue, targetId: string): Promise<{
        ownerId: string;
        ownerRole: AccountRoleValue;
    } | null>;
    applyAction(input: {
        moderatorId: string;
        moderatorRole: AccountRoleValue;
        targetType: ReportTargetTypeValue;
        targetId: string;
        action: ModerationActionValue;
        reason?: string;
        at: Date;
    }): Promise<boolean>;
}
