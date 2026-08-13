import type { RequestHandler } from "express";

import env from "../../config/env.js";
import AppError from "../../errors/app-error.js";

export const requireTrustedOrigin: RequestHandler = (request, _response, next) => {
    const origin = request.get("origin");
    const fetchSite = request.get("sec-fetch-site");
    if (fetchSite === "cross-site") {
        next(AppError.forbidden("Cross-site cookie authentication is not allowed.", "CSRF_ORIGIN_REJECTED"));
        return;
    }
    if (origin && !env.clientOrigins.includes(origin)) {
        next(AppError.forbidden("The request origin is not trusted.", "CSRF_ORIGIN_REJECTED"));
        return;
    }
    next();
};
