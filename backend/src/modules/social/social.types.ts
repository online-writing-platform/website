export interface SocialUserSummary {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
}

export interface FollowPage {
    users: SocialUserSummary[];
    pagination: {
        hasMore: boolean;
        nextCursor: string | null;
    };
}

export interface SocialStore {
    follow(followerId: string, followingId: string): Promise<"CREATED" | "EXISTS" | "BLOCKED">;
    unfollow(followerId: string, followingId: string): Promise<boolean>;
    isFollowing(followerId: string, followingId: string): Promise<boolean>;

    block(blockerId: string, blockedId: string): Promise<void>;
    unblock(blockerId: string, blockedId: string): Promise<void>;
    mute(muterId: string, mutedId: string): Promise<void>;
    unmute(muterId: string, mutedId: string): Promise<void>;

    isBlockedBetween(firstUserId: string, secondUserId: string): Promise<boolean>;
    relationship(
        actorId: string,
        targetId: string,
    ): Promise<{
        following: boolean;
        blockedByMe: boolean;
        blockedMe: boolean;
        mutedByMe: boolean;
    }>;

    listFollowers(
        userId: string,
        cursor: string | undefined,
        limit: number,
    ): Promise<FollowPage>;
    listFollowing(
        userId: string,
        cursor: string | undefined,
        limit: number,
    ): Promise<FollowPage>;
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
        dedupeKey?: string;
        data: Record<string, string | number | boolean | null>;
    }): Promise<void>;
}

export interface SocialInteractionPolicy {
    assertMayInteract(actorId: string, targetUserId: string): Promise<void>;
    isBlockedBetween(firstUserId: string, secondUserId: string): Promise<boolean>;
}
