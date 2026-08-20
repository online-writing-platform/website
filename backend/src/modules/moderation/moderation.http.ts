import type { Request, Response } from "express";
import AppError from "../../errors/app-error.js";
import { getValidatedQuery } from "../../middlewares/validate.middleware.js";
import { moderationServices } from "./moderation.service.js";
import type {
    CreateReportInput,
    ModerationActionInput,
    ModerationTargetParams,
    ReportListQuery,
    ReportParams,
    UpdateReportInput,
} from "./moderation.schema.js";
import { Router } from "express";
import { moderationRateLimiter, reportRateLimiter } from "../../middlewares/rate-limit.middleware.js";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware.js";
import { authenticate, requireRole, requireVerifiedEmail } from "../auth/auth.middleware.js";
import {
    createReportSchema,
    moderationActionSchema,
    moderationTargetParamsSchema,
    reportListQuerySchema,
    reportParamsSchema,
    updateReportSchema,
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
    const report = await moderationServices.service.createReport(
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
    const data = await moderationServices.service.listReports(query);

    response.status(200).json({ data });
}

export async function updateReport(
    request: Request<ReportParams, unknown, UpdateReportInput>,
    response: Response,
): Promise<void> {
    await moderationServices.service.updateReport(
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
    await moderationServices.service.act(
        requireModerator(request),
        request.params.targetType,
        request.params.targetId,
        request.body.action,
        request.body.reason,
    );

    response.status(204).send();
}

const reportRoutes = Router();
const moderationRoutes = Router();

reportRoutes.post(
    "/",
    reportRateLimiter,
    authenticate,
    requireVerifiedEmail,
    validateBody(createReportSchema),
    createReport,
);

moderationRoutes.use(moderationRateLimiter, authenticate, requireRole("MODERATOR", "ADMIN"));
moderationRoutes.get("/reports", validateQuery(reportListQuerySchema), listReports);
moderationRoutes.patch("/reports/:reportId", validateParams(reportParamsSchema), validateBody(updateReportSchema), updateReport);
moderationRoutes.post(
    "/targets/:targetType/:targetId/actions",
    validateParams(moderationTargetParamsSchema),
    validateBody(moderationActionSchema),
    moderateTarget,
);

export { moderationRoutes, reportRoutes };
