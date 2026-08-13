export interface AnalyticsStore {
    recordRead(
        userId: string | null,
        visitorKey: string,
        storyId: string,
        chapterId: string,
        at: Date,
    ): Promise<void>;

    listReadingHistory(
        userId: string,
        cursor: string | undefined,
        limit: number,
    ): Promise<{
        items: Array<{
            lastReadAt: Date;
            chapter: { id: string; title: string };
            story: {
                id: string;
                slug: string;
                title: string;
                coverUrl: string | null;
                isMature: boolean;
                author: { username: string; displayName: string };
            };
        }>;
        pagination: { hasMore: boolean; nextCursor: string | null };
    }>;

    getStoryAnalytics(
        authorId: string,
        storyId: string,
    ): Promise<
        | {
              story: { id: string; title: string; slug: string };
              uniqueReaders: number;
              librarySaves: number;
              activeProgressReaders: number;
              chapters: Array<{
                  id: string;
                  title: string;
                  position: number;
                  uniqueReaders: number;
                  votes: number;
                  comments: number;
              }>;
          }
        | null
    >;
}

export interface AnalyticsStoryAccess {
    findReadableChapterById(
        chapterId: string,
        viewerId?: string,
    ): Promise<{
        storyId: string;
        authorId: string;
    } | null>;
}
