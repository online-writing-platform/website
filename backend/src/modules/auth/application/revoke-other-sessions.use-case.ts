import type { AuthStore } from "./auth.ports.js";

export class RevokeOtherSessionsUseCase {
    public constructor(private readonly store: AuthStore) {}

    public execute(userId: string, currentSessionId: string): Promise<number> {
        return this.store.revokeOtherSessions(
            userId,
            currentSessionId,
            new Date(),
        );
    }
}
