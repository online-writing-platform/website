import AppError from "../../../errors/app-error.js";

import type { ModerationActor, ModerationActionValue, ReportTargetTypeValue } from "../domain/moderation.types.js";
import type { ModerationStore } from "./moderation.ports.js";

export class ModerationService {
    public constructor(private readonly store: ModerationStore) {}

    public async createReport(
        reporterId: string,
        input: {
            targetType: ReportTargetTypeValue;
            targetId: string;
            reason: Parameters<ModerationStore["createReport"]>[0]["reason"];
            details?: string;
        },
    ) {
        if (!(await this.store.targetExists(input.targetType, input.targetId))) {
            throw AppError.notFound("The reported resource was not found.", "REPORT_TARGET_NOT_FOUND");
        }

        if (await this.store.hasOpenReport(reporterId, input.targetType, input.targetId)) {
            throw AppError.conflict(
                "You already have an active report for this resource.",
                "REPORT_ALREADY_EXISTS",
            );
        }

        return this.store.createReport({ reporterId, ...input });
    }

    public listReports(input: Parameters<ModerationStore["listReports"]>[0]) {
        return this.store.listReports(input);
    }

    public async updateReport(
        actor: ModerationActor,
        reportId: string,
        input: Parameters<ModerationStore["updateReport"]>[2],
    ): Promise<void> {
        const updated = await this.store.updateReport(reportId, actor.userId, input);
        if (!updated) {
            throw AppError.notFound("The report was not found.", "REPORT_NOT_FOUND");
        }
    }

    public async act(
        actor: ModerationActor,
        targetType: ReportTargetTypeValue,
        targetId: string,
        action: ModerationActionValue,
        reason?: string,
    ): Promise<void> {
        const allowedActions: Record<ReportTargetTypeValue, ModerationActionValue[]> = {
            USER: ["SUSPEND_USER", "RESTORE_USER"],
            STORY: ["HIDE_STORY", "RESTORE_STORY"],
            CHAPTER: ["HIDE_CHAPTER", "RESTORE_CHAPTER"],
            COMMENT: ["HIDE_COMMENT", "RESTORE_COMMENT"],
        };

        if (!allowedActions[targetType].includes(action)) {
            throw AppError.badRequest(
                "The moderation action is incompatible with the target type.",
                "INVALID_MODERATION_ACTION",
            );
        }

        const target = await this.store.getModerationTarget(targetType, targetId);
        if (!target) {
            throw AppError.notFound("The moderation target was not found.", "MODERATION_TARGET_NOT_FOUND");
        }

        if (target.ownerId === actor.userId) {
            throw AppError.forbidden("You cannot moderate your own account or content.", "CANNOT_MODERATE_SELF");
        }

        if (actor.role === "MODERATOR" && target.ownerRole !== "USER") {
            throw AppError.forbidden(
                "Moderators cannot take action against privileged accounts or their content.",
                "INSUFFICIENT_MODERATION_ROLE",
            );
        }

        const applied = await this.store.applyAction({
            moderatorId: actor.userId,
            targetType,
            targetId,
            action,
            ...(reason ? { reason: reason.trim() } : {}),
            at: new Date(),
        });

        if (!applied) {
            throw AppError.notFound("The moderation target was not found.", "MODERATION_TARGET_NOT_FOUND");
        }
    }
}
