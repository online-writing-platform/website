import AppError from "../../errors/app-error.js";
import { storiesServices } from "../stories/stories.service.js";
import { AnalyticsRepository } from "./analytics.repo.js";
import { type AnalyticsStore, type AnalyticsStoryAccess } from "./analytics.types.js";

export class AnalyticsService {
    public constructor(
        private readonly store: AnalyticsStore,
        private readonly stories: AnalyticsStoryAccess,
    ) {}

    public async recordRead(
        userId: string | undefined,
        visitorKey: string,
        storyId: string,
        chapterId: string,
    ): Promise<void> {
        const chapter = await this.stories.findReadableChapterById(
            chapterId,
            userId,
        );
        if (!chapter || chapter.storyId !== storyId) {
            throw AppError.notFound(
                "The chapter was not found.",
                "CHAPTER_NOT_FOUND",
            );
        }

        if (userId && chapter.authorId === userId) {
            return;
        }

        await this.store.recordRead(
            userId ?? null,
            visitorKey,
            storyId,
            chapterId,
            new Date(),
        );
    }

    public listReadingHistory(
        userId: string,
        cursor: string | undefined,
        limit: number,
    ) {
        return this.store.listReadingHistory(userId, cursor, limit);
    }

    public async story(authorId: string, storyId: string) {
        const analytics = await this.store.getStoryAnalytics(
            authorId,
            storyId,
        );
        if (!analytics) {
            throw AppError.notFound(
                "The story was not found.",
                "STORY_NOT_FOUND",
            );
        }
        return analytics;
    }
}

const store = new AnalyticsRepository();

export const analyticsServices = {
    service: new AnalyticsService(store, storiesServices.access),
};
