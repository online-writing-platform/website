import AppError from "../../../errors/app-error.js";

import type {
    SocialNotificationPublisher,
    SocialStore,
    SocialUserDirectory,
} from "./social.ports.js";

export class SocialService {
    public constructor(
        private readonly store: SocialStore,
        private readonly users: SocialUserDirectory,
        private readonly notifications: SocialNotificationPublisher,
    ) {}

    private async requireTarget(username: string) {
        const target = await this.users.findActiveByUsername(username);
        if (!target) {
            throw AppError.notFound("The requested user was not found.", "USER_NOT_FOUND");
        }
        return target;
    }

    public async follow(actorId: string, username: string): Promise<void> {
        const target = await this.requireTarget(username);

        if (actorId === target.id) {
            throw AppError.badRequest("You cannot follow yourself.", "CANNOT_FOLLOW_SELF");
        }

        const result = await this.store.follow(actorId, target.id);
        if (result === "CREATED") {
            await this.notifications.publish({
                recipientId: target.id,
                actorId,
                type: "FOLLOW",
                data: { username: target.username },
            });
        }
    }

    public async unfollow(actorId: string, username: string): Promise<void> {
        const target = await this.requireTarget(username);
        await this.store.unfollow(actorId, target.id);
    }

    public async relationship(actorId: string, username: string) {
        const target = await this.requireTarget(username);
        return { following: await this.store.isFollowing(actorId, target.id) };
    }

    public async listFollowers(username: string, cursor: string | undefined, limit: number) {
        const target = await this.requireTarget(username);
        return this.store.listFollowers(target.id, cursor, limit);
    }

    public async listFollowing(username: string, cursor: string | undefined, limit: number) {
        const target = await this.requireTarget(username);
        return this.store.listFollowing(target.id, cursor, limit);
    }
}
