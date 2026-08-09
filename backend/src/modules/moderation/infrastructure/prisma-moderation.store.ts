import { prisma } from "../../../db/index.js";
import { buildCursorPage } from "../../../shared/pagination/page.js";
import { isPrismaErrorCode } from "../../../utils/prisma-error.js";

import type { ModerationStore } from "../application/moderation.ports.js";
import type { ModerationActionValue, ReportTargetTypeValue } from "../domain/moderation.types.js";

interface ReportRow {
    id: string;
    targetType: "USER" | "STORY" | "CHAPTER" | "COMMENT";
    targetId: string;
    reason: "SPAM" | "HARASSMENT" | "HATE_OR_ABUSE" | "SEXUAL_CONTENT" | "VIOLENCE" | "COPYRIGHT" | "IMPERSONATION" | "OTHER";
    details: string | null;
    status: "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";
    resolution: string | null;
    createdAt: Date;
    updatedAt: Date;
    reporter: { username: string; displayName: string };
    assignedTo: { id: string; username: string } | null;
}

export class PrismaModerationStore implements ModerationStore {
    public async targetExists(targetType: ReportTargetTypeValue, targetId: string): Promise<boolean> {
        switch (targetType) {
            case "USER":
                return (await prisma.user.findFirst({ where: { id: targetId, status: { not: "DELETED" } }, select: { id: true } })) !== null;
            case "STORY":
                return (await prisma.story.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true } })) !== null;
            case "CHAPTER":
                return (await prisma.chapter.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true } })) !== null;
            case "COMMENT":
                return (await prisma.comment.findFirst({ where: { id: targetId, status: { not: "DELETED" } }, select: { id: true } })) !== null;
        }
    }

    public async hasOpenReport(reporterId: string, targetType: ReportTargetTypeValue, targetId: string) {
        const report = await prisma.report.findFirst({
            where: { reporterId, targetType, targetId, status: { in: ["OPEN", "REVIEWING"] } },
            select: { id: true },
        });
        return report !== null;
    }

    public async createReport(
        input: Parameters<ModerationStore["createReport"]>[0],
    ) {
        try {
            return await prisma.report.create({
                data: {
                    reporterId: input.reporterId,
                    targetType: input.targetType,
                    targetId: input.targetId,
                    reason: input.reason,
                    ...(input.details ? { details: input.details } : {}),
                },
                select: { id: true, status: true, createdAt: true },
            });
        } catch (error) {
            if (!isPrismaErrorCode(error, "P2002")) throw error;

            const existing = await prisma.report.findFirst({
                where: {
                    reporterId: input.reporterId,
                    targetType: input.targetType,
                    targetId: input.targetId,
                    status: { in: ["OPEN", "REVIEWING"] },
                },
                orderBy: { createdAt: "desc" },
                select: { id: true, status: true, createdAt: true },
            });

            if (existing) return existing;
            throw error;
        }
    }

    public async listReports(input: Parameters<ModerationStore["listReports"]>[0]) {
        const rows: ReportRow[] = await prisma.report.findMany({
            where: {
                ...(input.status ? { status: input.status } : {}),
                ...(input.targetType ? { targetType: input.targetType } : {}),
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: input.limit + 1,
            ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
            select: {
                id: true,
                targetType: true,
                targetId: true,
                reason: true,
                details: true,
                status: true,
                resolution: true,
                createdAt: true,
                updatedAt: true,
                reporter: { select: { username: true, displayName: true } },
                assignedTo: { select: { id: true, username: true } },
            },
        });
        const page = buildCursorPage(rows, input.limit, (row) => row.id);
        return { reports: page.items, pagination: page.pagination };
    }

    public async updateReport(
        reportId: string,
        moderatorId: string,
        input: Parameters<ModerationStore["updateReport"]>[2],
    ) {
        const result = await prisma.report.updateMany({
            where: { id: reportId },
            data: {
                ...(input.status ? { status: input.status } : {}),
                ...(input.resolution !== undefined ? { resolution: input.resolution } : {}),
                ...(input.assignToSelf === true ? { assignedToId: moderatorId } : {}),
                ...(input.assignToSelf === false ? { assignedToId: null } : {}),
            },
        });
        return result.count === 1;
    }

    public async getModerationTarget(targetType: ReportTargetTypeValue, targetId: string) {
        switch (targetType) {
            case "USER": {
                const user = await prisma.user.findFirst({
                    where: { id: targetId, status: { not: "DELETED" } },
                    select: { id: true, role: true },
                });
                return user ? { ownerId: user.id, ownerRole: user.role } : null;
            }
            case "STORY": {
                const story = await prisma.story.findFirst({
                    where: { id: targetId, deletedAt: null },
                    select: { author: { select: { id: true, role: true } } },
                });
                return story ? { ownerId: story.author.id, ownerRole: story.author.role } : null;
            }
            case "CHAPTER": {
                const chapter = await prisma.chapter.findFirst({
                    where: { id: targetId, deletedAt: null },
                    select: { story: { select: { author: { select: { id: true, role: true } } } } },
                });
                return chapter
                    ? { ownerId: chapter.story.author.id, ownerRole: chapter.story.author.role }
                    : null;
            }
            case "COMMENT": {
                const comment = await prisma.comment.findFirst({
                    where: { id: targetId, status: { not: "DELETED" } },
                    select: { user: { select: { id: true, role: true } } },
                });
                return comment ? { ownerId: comment.user.id, ownerRole: comment.user.role } : null;
            }
        }
    }

    public async applyAction(input: Parameters<ModerationStore["applyAction"]>[0]): Promise<boolean> {
        return prisma.$transaction(async (transaction) => {
            let changed = 0;
            const action: ModerationActionValue = input.action;

            switch (action) {
                case "SUSPEND_USER":
                    changed = (await transaction.user.updateMany({
                        where: { id: input.targetId, status: "ACTIVE" },
                        data: { status: "SUSPENDED" },
                    })).count;
                    if (changed === 1) {
                        await transaction.session.updateMany({
                            where: { userId: input.targetId, revokedAt: null },
                            data: { revokedAt: input.at },
                        });
                    }
                    break;
                case "RESTORE_USER":
                    changed = (await transaction.user.updateMany({
                        where: { id: input.targetId, status: "SUSPENDED" },
                        data: { status: "ACTIVE" },
                    })).count;
                    break;
                case "HIDE_STORY":
                    changed = (await transaction.story.updateMany({
                        where: { id: input.targetId, deletedAt: null },
                        data: { moderationState: "HIDDEN" },
                    })).count;
                    break;
                case "RESTORE_STORY":
                    changed = (await transaction.story.updateMany({
                        where: { id: input.targetId, deletedAt: null },
                        data: { moderationState: "VISIBLE" },
                    })).count;
                    break;
                case "HIDE_CHAPTER":
                    changed = (await transaction.chapter.updateMany({
                        where: { id: input.targetId, deletedAt: null },
                        data: { moderationState: "HIDDEN" },
                    })).count;
                    break;
                case "RESTORE_CHAPTER":
                    changed = (await transaction.chapter.updateMany({
                        where: { id: input.targetId, deletedAt: null },
                        data: { moderationState: "VISIBLE" },
                    })).count;
                    break;
                case "HIDE_COMMENT":
                    changed = (await transaction.comment.updateMany({
                        where: { id: input.targetId, status: "ACTIVE" },
                        data: { status: "HIDDEN" },
                    })).count;
                    break;
                case "RESTORE_COMMENT":
                    changed = (await transaction.comment.updateMany({
                        where: { id: input.targetId, status: "HIDDEN" },
                        data: { status: "ACTIVE" },
                    })).count;
                    break;
            }

            if (changed !== 1) return false;

            await transaction.moderationAction.create({
                data: {
                    moderatorId: input.moderatorId,
                    targetType: input.targetType,
                    targetId: input.targetId,
                    action: input.action,
                    ...(input.reason ? { reason: input.reason } : {}),
                    createdAt: input.at,
                },
                select: { id: true },
            });
            return true;
        });
    }
}
