import { jwtVerify, SignJWT } from "jose";

import env from "../config/env.js";

import AppError from "../errors/app-error.js";

import type { AuthContext } from "../modules/auth/auth.types.js";

import { generateOpaqueToken, hashOpaqueToken } from "./opaque-token.js";

const ACCESS_TOKEN_ISSUER = "writing-platform-api";

const ACCESS_TOKEN_AUDIENCE = "writing-platform-client";

const REFRESH_TOKEN_BYTES = 48;

const accessTokenSecret = new TextEncoder().encode(env.accessTokenSecret);

interface CreateAccessTokenInput {
    userId: string;
    sessionId: string;
}

export async function createAccessToken(
    input: CreateAccessTokenInput,
): Promise<string> {
    return new SignJWT({
        type: "access",

        sessionId: input.sessionId,
    })
        .setProtectedHeader({
            alg: "HS256",

            typ: "JWT",
        })
        .setSubject(input.userId)
        .setIssuer(ACCESS_TOKEN_ISSUER)
        .setAudience(ACCESS_TOKEN_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(
            Math.floor(Date.now() / 1000) + env.accessTokenTtlSeconds,
        )
        .sign(accessTokenSecret);
}

export async function verifyAccessToken(
    accessToken: string,
): Promise<AuthContext> {
    try {
        const { payload } = await jwtVerify(accessToken, accessTokenSecret, {
            issuer: ACCESS_TOKEN_ISSUER,

            audience: ACCESS_TOKEN_AUDIENCE,

            algorithms: ["HS256"],
        });

        if (
            payload.type !== "access" ||
            typeof payload.sub !== "string" ||
            typeof payload.sessionId !== "string"
        ) {
            throw AppError.unauthorized(
                "The access token is invalid.",
                "INVALID_ACCESS_TOKEN",
            );
        }

        return {
            userId: payload.sub,

            sessionId: payload.sessionId,
        };
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        throw AppError.unauthorized(
            "The access token is invalid or expired.",
            "INVALID_ACCESS_TOKEN",
        );
    }
}

export function generateRefreshToken(): string {
    return generateOpaqueToken(REFRESH_TOKEN_BYTES);
}

export function hashRefreshToken(refreshToken: string): string {
    return hashOpaqueToken(refreshToken);
}

export function calculateSessionExpiration(): Date {
    const expiration = new Date();

    expiration.setDate(expiration.getDate() + env.sessionTtlDays);

    return expiration;
}
