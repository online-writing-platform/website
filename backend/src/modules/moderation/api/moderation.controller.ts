import type { Request, Response } from "express";

import AppError from "../../../errors/app-error.js";
import { getValidatedQuery } from "../../../middlewares/validate.middleware.js";
import { moderationModule } from "../moderation.module.js";
import type {
    CreateReportInput,
    ModerationActionInput,
    ModerationTargetParams,
    ReportListQuery,
    ReportParams,
    UpdateReportInput,
} from "./moderation.schema.js";

function requireUserId(request: Request): string {
    const userId = request.auth?.userId;

    if (!userId) {
        throw AppError.unauthorized();
    }

    return userId;
}

function requireModerator(request: Request): {
    userId: string;
    role: "MODERATOR" | "ADMIN";
} {
    const auth = request.auth;

    if (!auth || (auth.role !== "MODERATOR" && auth.role !== "ADMIN")) {
        throw AppError.forbidden(
            "Moderator access is required.",
            "MODERATOR_REQUIRED",
        );
    }

    return {
        userId: auth.userId,
        role: auth.role,
    };
}

export async function createReport(
    request: Request<Record<string, never>, unknown, CreateReportInput>,
    response: Response,
): Promise<void> {
    const report = await moderationModule.service.createReport(
        requireUserId(request),
        request.body,
    );

    response.status(201).json({ data: { report } });
}

export async function listReports(
    request: Request,
    response: Response,
): Promise<void> {
    requireModerator(request);

    const query = getValidatedQuery<ReportListQuery>(request);
    const data = await moderationModule.service.listReports(query);

    response.status(200).json({ data });
}

export async function updateReport(
    request: Request<ReportParams, unknown, UpdateReportInput>,
    response: Response,
): Promise<void> {
    await moderationModule.service.updateReport(
        requireModerator(request),
        request.params.reportId,
        request.body,
    );

    response.status(204).send();
}

export async function moderateTarget(
    request: Request<ModerationTargetParams, unknown, ModerationActionInput>,
    response: Response,
): Promise<void> {
    await moderationModule.service.act(
        requireModerator(request),
        request.params.targetType,
        request.params.targetId,
        request.body.action,
        request.body.reason,
    );

    response.status(204).send();
}
