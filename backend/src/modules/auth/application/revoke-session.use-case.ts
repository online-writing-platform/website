import AppError from "../../../errors/app-error.js";

import type { AuthStore } from "./auth.ports.js";

export class RevokeSessionUseCase {
    public constructor(private readonly store: AuthStore) {}

    public async execute(userId: string, sessionId: string): Promise<void> {
        const revoked = await this.store.revokeOwnedSession(
            userId,
            sessionId,
            new Date(),
        );

        if (!revoked) {
            throw AppError.notFound(
                "The session was not found.",
                "SESSION_NOT_FOUND",
            );
        }
    }
}
