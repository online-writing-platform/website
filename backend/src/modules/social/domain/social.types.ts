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
