import assert from "node:assert/strict";
import test from "node:test";

import {
    AuthenticateSessionUseCase,
    RefreshSessionUseCase,
} from "../session.service.js";

void test("an existing access token cannot authenticate an unverified account", async () => {
    const sessions = {
        getAuthenticatedPrincipal: () =>
            Promise.resolve({
                userId: "user-1",
                sessionId: "session-1",
                role: "USER" as const,
                emailVerified: false,
            }),
    };
    const security = {
        verifyAccessToken: () =>
            Promise.resolve({ userId: "user-1", sessionId: "session-1" }),
    };
    const useCase = new AuthenticateSessionUseCase(
        sessions as never,
        security as never,
    );

    await assert.rejects(
        () => useCase.execute("access-token"),
        (error: unknown) =>
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "EMAIL_VERIFICATION_REQUIRED",
    );
});

void test("refresh revokes a legacy session for an unverified account", async () => {
    let revokedSessionId: string | undefined;
    const expiresAt = new Date(Date.now() + 60_000);
    const sessions = {
        findSessionByRefreshTokenHash: () =>
            Promise.resolve({
                id: "session-1",
                userId: "user-1",
                refreshTokenHash: "refresh-hash",
                expiresAt,
                revokedAt: null,
                user: {
                    id: "user-1",
                    email: "writer@example.com",
                    username: "writer",
                    displayName: "Writer",
                    bio: null,
                    avatarUrl: null,
                    emailVerifiedAt: null,
                    status: "ACTIVE" as const,
                    role: "USER" as const,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            }),
        revokeSessionById: (sessionId: string) => {
            revokedSessionId = sessionId;
            return Promise.resolve();
        },
        rotateSession: () => Promise.resolve(true),
    };
    const security = {
        hashRefreshToken: () => "refresh-hash",
        generateRefreshToken: () => "next-refresh-token",
        createAccessToken: () => Promise.resolve("access-token"),
    };
    const useCase = new RefreshSessionUseCase(
        sessions as never,
        security as never,
    );

    await assert.rejects(
        () => useCase.execute("refresh-token"),
        (error: unknown) =>
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "EMAIL_VERIFICATION_REQUIRED",
    );
    assert.equal(revokedSessionId, "session-1");
});
