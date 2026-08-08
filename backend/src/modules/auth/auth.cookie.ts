import type { CookieOptions, Request, Response } from "express";

import env from "../../config/env.js";

function getBaseRefreshCookieOptions(): CookieOptions {
    return {
        httpOnly: true,

        secure: env.isProduction,

        sameSite: "lax",

        path: "/api/v1/auth",
    };
}

export function setRefreshTokenCookie(
    response: Response,
    refreshToken: string,
    expiresAt: Date,
): void {
    response.cookie(env.refreshCookieName, refreshToken, {
        ...getBaseRefreshCookieOptions(),

        expires: expiresAt,
    });
}

export function clearRefreshTokenCookie(response: Response): void {
    response.clearCookie(env.refreshCookieName, getBaseRefreshCookieOptions());
}

export function getRefreshTokenCookie(request: Request): string | undefined {
    const cookies = request.cookies as Record<string, unknown> | undefined;

    const value = cookies?.[env.refreshCookieName];

    if (typeof value !== "string" || value.length === 0) {
        return undefined;
    }

    return value;
}
