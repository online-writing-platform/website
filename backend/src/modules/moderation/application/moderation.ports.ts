import type {
    ModerationActionValue,
    ReportReasonValue,
    ReportStatusValue,
    ReportTargetTypeValue,
    AccountRoleValue,
} from "../domain/moderation.types.js";

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
