import type { SessionView } from "../domain/auth.types.js";

import type { AuthStore } from "./auth.ports.js";

export class ListSessionsUseCase {
    public constructor(private readonly store: AuthStore) {}

    public async execute(
        userId: string,
        currentSessionId: string,
    ): Promise<SessionView[]> {
        const sessions = await this.store.listActiveSessions(userId, new Date());

        return sessions.map((session) => ({
            ...session,
            current: session.id === currentSessionId,
        }));
    }
}
