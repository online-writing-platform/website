import type { FollowPage } from "../domain/social.types.js";

export interface SocialStore {
    follow(followerId: string, followingId: string): Promise<"CREATED" | "EXISTS">;
    unfollow(followerId: string, followingId: string): Promise<boolean>;
    isFollowing(followerId: string, followingId: string): Promise<boolean>;
    listFollowers(userId: string, cursor: string | undefined, limit: number): Promise<FollowPage>;
    listFollowing(userId: string, cursor: string | undefined, limit: number): Promise<FollowPage>;
}

export interface SocialUserDirectory {
    findActiveByUsername(username: string): Promise<{
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
    } | null>;
}

export interface SocialNotificationPublisher {
    publish(input: {
        recipientId: string;
        actorId?: string;
        type: "FOLLOW";
        data: Record<string, string | number | boolean | null>;
    }): Promise<void>;
}
