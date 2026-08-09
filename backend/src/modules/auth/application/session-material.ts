import type { AuthSecurity } from "./auth.ports.js";

import type { ClientInformation } from "../domain/auth.types.js";

export interface SessionMaterial {
    refreshToken: string;

    refreshTokenHash: string;

    expiresAt: Date;

    userAgent?: string;
    ipAddress?: string;
}

function sanitizeClientInformation(
    clientInformation: ClientInformation,
): ClientInformation {
    const userAgent = clientInformation.userAgent?.trim().slice(0, 512);

    const ipAddress = clientInformation.ipAddress?.trim().slice(0, 45);

    return {
        ...(userAgent
            ? {
                  userAgent,
              }
            : {}),

        ...(ipAddress
            ? {
                  ipAddress,
              }
            : {}),
    };
}

export function createSessionMaterial(
    security: AuthSecurity,
    clientInformation: ClientInformation,
): SessionMaterial {
    const refreshToken = security.generateRefreshToken();

    const refreshTokenHash = security.hashRefreshToken(refreshToken);

    const safeClientInformation = sanitizeClientInformation(clientInformation);

    return {
        refreshToken,

        refreshTokenHash,

        expiresAt: security.calculateSessionExpiration(),

        ...safeClientInformation,
    };
}
