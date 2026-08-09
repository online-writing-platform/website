import AppError from "../../../errors/app-error.js";

import { countWords } from "../domain/story.policy.js";
import type {
    ChapterView,
    CreateChapterInput,
    UpdateChapterInput,
} from "../domain/story.types.js";
import type { StoryStore } from "./story.ports.js";

export class ChapterService {
    public constructor(private readonly store: StoryStore) {}

    public async create(
        authorId: string,
        storyId: string,
        input: CreateChapterInput,
    ): Promise<ChapterView> {
        const chapter = await this.store.createChapter(
            authorId,
            storyId,
            {
                title: input.title.trim(),
                content: input.content,
            },
            countWords(input.content),
        );

        if (!chapter) {
            throw AppError.notFound(
                "The story was not found.",
                "STORY_NOT_FOUND",
            );
        }

        return chapter;
    }

    public async update(
        authorId: string,
        storyId: string,
        chapterId: string,
        input: UpdateChapterInput,
    ): Promise<ChapterView> {
        const result = await this.store.updateChapter(
            authorId,
            storyId,
            chapterId,
            {
                ...input,
                ...(input.title !== undefined
                    ? { title: input.title.trim() }
                    : {}),
            },
            input.content === undefined
                ? undefined
                : countWords(input.content),
        );

        if (!result) {
            throw AppError.notFound(
                "The chapter was not found.",
                "CHAPTER_NOT_FOUND",
            );
        }

        if (result.kind === "CONFLICT") {
            throw AppError.conflict(
                "This chapter was updated by another editor session.",
                "CHAPTER_EDIT_CONFLICT",
                {
                    currentVersion: result.current.version,
                    updatedAt: result.current.updatedAt,
                },
            );
        }

        return result.chapter;
    }

    public async remove(
        authorId: string,
        storyId: string,
        chapterId: string,
    ): Promise<void> {
        const deleted = await this.store.softDeleteChapter(
            authorId,
            storyId,
            chapterId,
            new Date(),
        );

        if (!deleted) {
            throw AppError.notFound(
                "The chapter was not found.",
                "CHAPTER_NOT_FOUND",
            );
        }
    }

    public async publish(
        authorId: string,
        storyId: string,
        chapterId: string,
    ): Promise<ChapterView> {
        const chapter = await this.store.publishChapter(
            authorId,
            storyId,
            chapterId,
            new Date(),
        );

        if (!chapter) {
            throw AppError.notFound(
                "The chapter was not found.",
                "CHAPTER_NOT_FOUND",
            );
        }

        if (chapter === "EMPTY") {
            throw AppError.badRequest(
                "An empty chapter cannot be published.",
                "EMPTY_CHAPTER",
            );
        }

        return chapter;
    }

    public async unpublish(
        authorId: string,
        storyId: string,
        chapterId: string,
    ): Promise<ChapterView> {
        const chapter = await this.store.unpublishChapter(
            authorId,
            storyId,
            chapterId,
        );

        if (!chapter) {
            throw AppError.notFound(
                "The chapter was not found.",
                "CHAPTER_NOT_FOUND",
            );
        }

        return chapter;
    }

    public async getPublic(
        storySlug: string,
        chapterId: string,
        viewerId?: string,
    ): Promise<ChapterView> {
        const chapter = await this.store.getPublicChapter(
            storySlug,
            chapterId,
            viewerId,
        );

        if (!chapter) {
            throw AppError.notFound(
                "The chapter was not found or is not available to this account.",
                "CHAPTER_NOT_FOUND",
            );
        }

        return chapter;
    }

    public async getOwned(
        authorId: string,
        storyId: string,
        chapterId: string,
    ): Promise<ChapterView> {
        const chapter = await this.store.getOwnedChapter(
            authorId,
            storyId,
            chapterId,
        );

        if (!chapter) {
            throw AppError.notFound(
                "The chapter was not found.",
                "CHAPTER_NOT_FOUND",
            );
        }

        return chapter;
    }

    public async reorder(
        authorId: string,
        storyId: string,
        chapterIds: string[],
    ): Promise<ChapterView[]> {
        if (new Set(chapterIds).size !== chapterIds.length) {
            throw AppError.badRequest(
                "Chapter order contains duplicate chapter IDs.",
                "INVALID_CHAPTER_ORDER",
            );
        }

        const chapters = await this.store.reorderChapters(
            authorId,
            storyId,
            chapterIds,
        );
        if (!chapters) {
            throw AppError.badRequest(
                "Chapter order must contain every active chapter exactly once.",
                "INVALID_CHAPTER_ORDER",
            );
        }
        return chapters;
    }
}
