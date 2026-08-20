import AppError from "../../errors/app-error.js";
import { notificationServices } from "../notifications/notification.service.js";
import { userServices } from "../users/user.service.js";
import { SocialRepository } from "./social.repo.js";
import { type SocialInteractionPolicy, type SocialNotificationPublisher, type SocialStore, type SocialUserDirectory } from "./social.types.js";

export class SocialPolicy implements SocialInteractionPolicy {
    public constructor(private readonly store: SocialStore) {}

    public async assertMayInteract(
        actorId: string,
        targetUserId: string,
    ): Promise<void> {
        if (actorId === targetUserId) return;

        if (await this.store.isBlockedBetween(actorId, targetUserId)) {
            throw AppError.forbidden(
                "This interaction is not available because of a block relationship.",
                "INTERACTION_BLOCKED",
            );
        }
    }

    public isBlockedBetween(firstUserId: string, secondUserId: string) {
        return this.store.isBlockedBetween(firstUserId, secondUserId);
    }
}

export class SocialService {
    public constructor(
        private readonly store: SocialStore,
        private readonly users: SocialUserDirectory,
        private readonly notifications: SocialNotificationPublisher,
        private readonly policy: SocialInteractionPolicy,
    ) {}

    private async requireTarget(username: string) {
        const target = await this.users.findActiveByUsername(username);
        if (!target) {
            throw AppError.notFound(
                "The requested user was not found.",
                "USER_NOT_FOUND",
            );
        }
        return target;
    }

    public async follow(actorId: string, username: string): Promise<void> {
        const target = await this.requireTarget(username);

        if (actorId === target.id) {
            throw AppError.badRequest(
                "You cannot follow yourself.",
                "CANNOT_FOLLOW_SELF",
            );
        }

        await this.policy.assertMayInteract(actorId, target.id);

        const result = await this.store.follow(actorId, target.id);
        if (result === "BLOCKED") {
            throw AppError.forbidden(
                "This interaction is not available because of a block relationship.",
                "INTERACTION_BLOCKED",
            );
        }
        if (result === "CREATED") {
            await this.notifications.publish({
                recipientId: target.id,
                actorId,
                type: "FOLLOW",
                dedupeKey: `follow:${actorId}:${target.id}`,
                data: { username: target.username },
            });
        }
    }

    public async unfollow(actorId: string, username: string): Promise<void> {
        const target = await this.requireTarget(username);
        await this.store.unfollow(actorId, target.id);
    }

    public async block(actorId: string, username: string): Promise<void> {
        const target = await this.requireTarget(username);
        if (actorId === target.id) {
            throw AppError.badRequest(
                "You cannot block yourself.",
                "CANNOT_BLOCK_SELF",
            );
        }
        await this.store.block(actorId, target.id);
    }

    public async unblock(actorId: string, username: string): Promise<void> {
        const target = await this.requireTarget(username);
        await this.store.unblock(actorId, target.id);
    }

    public async mute(actorId: string, username: string): Promise<void> {
        const target = await this.requireTarget(username);
        if (actorId === target.id) {
            throw AppError.badRequest(
                "You cannot mute yourself.",
                "CANNOT_MUTE_SELF",
            );
        }
        await this.policy.assertMayInteract(actorId, target.id);
        await this.store.mute(actorId, target.id);
    }

    public async unmute(actorId: string, username: string): Promise<void> {
        const target = await this.requireTarget(username);
        await this.store.unmute(actorId, target.id);
    }

    public async relationship(actorId: string, username: string) {
        const target = await this.requireTarget(username);
        const relationship = await this.store.relationship(actorId, target.id);

        return {
            following: relationship.following,
            blocked: relationship.blockedByMe,
            blockedByTarget: relationship.blockedMe,
            muted: relationship.mutedByMe,
        };
    }

    public async listFollowers(
        username: string,
        cursor: string | undefined,
        limit: number,
    ) {
        const target = await this.requireTarget(username);
        return this.store.listFollowers(target.id, cursor, limit);
    }

    public async listFollowing(
        username: string,
        cursor: string | undefined,
        limit: number,
    ) {
        const target = await this.requireTarget(username);
        return this.store.listFollowing(target.id, cursor, limit);
    }
}

const store = new SocialRepository();

const policy = new SocialPolicy(store);

export const socialServices = {
    policy,
    service: new SocialService(
        store,
        userServices.directory,
        notificationServices.publisher,
        policy,
    ),
};
