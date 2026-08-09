export interface DiscoverySignals {
    followedAuthorIds: Set<string>;
    preferredGenres: Map<string, number>;
    preferredTags: Map<string, number>;
    blockedUserIds: Set<string>;
    includeMature: boolean;
}

export interface DiscoveryCandidate {
    id: string;
    slug: string;
    title: string;
    description: string;
    coverUrl: string | null;
    language: string;
    isMature: boolean;
    publishedAt: Date;
    updatedAt: Date;
    author: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
    };
    genre: { slug: string; name: string } | null;
    tags: Array<{ slug: string; name: string }>;
    libraryCount: number;
    voteCount: number;
    commentCount: number;
}

export interface DiscoveryStore {
    getSignals(userId?: string): Promise<DiscoverySignals>;
    listCandidates(
        signals: DiscoverySignals,
        limit: number,
    ): Promise<DiscoveryCandidate[]>;
}
