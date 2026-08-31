import assert from "node:assert/strict";
import test from "node:test";

import { RefreshSessionUseCase } from "../session.service.js";

void test("replayed refresh token revokes only its compromised session", async () => {
    const revoked: string[] = [];
    const store = {
        findSessionByRefreshTokenHash: () => Promise.resolve(null),
        findConsumedSessionByRefreshTokenHash: () => Promise.resolve({
            sessionId: "compromised-session",
            revokedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
        }),
        revokeSessionById: (sessionId: string) => {
            revoked.push(sessionId);
            return Promise.resolve();
        },
    };
    const security = {
        hashRefreshToken: () => "old-hash",
    };
    const useCase = new RefreshSessionUseCase(store as never, security as never);

    await assert.rejects(
        () => useCase.execute("replayed-token"),
        (error: unknown) =>
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "REFRESH_TOKEN_REPLAY",
    );
    assert.deepEqual(revoked, ["compromised-session"]);
});
