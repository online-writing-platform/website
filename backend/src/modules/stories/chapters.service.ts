import AppError from "../../errors/app-error.js";

import {
    MAX_CHAPTER_TEXT_LENGTH,
    prepareChapterContent,
} from "./chapter-content.js";

import { countWords } from "./stories.policy.js";
import type {
    ChapterView,
    CreateChapterInput,
    UpdateChapterInput,
} from "./stories.types.js";
import type { ChaptersRepository } from "./chapters.repo.js";

export class ChapterService {
    public constructor(private readonly store: ChaptersRepository) {}

    public async create(
        authorId: string,
        storyId: string,
        input: CreateChapterInput,
    ): Promise<ChapterView> {
        const preparedContent = prepareChapterContent(input.content);

        if (preparedContent.plainText.length > MAX_CHAPTER_TEXT_LENGTH) {
            throw AppError.tooLarge(
                "Chapter text cannot exceed 100,000 characters.",
                "CHAPTER_CONTENT_TOO_LONG",
                { maxTextLength: MAX_CHAPTER_TEXT_LENGTH },
            );
        }

        const chapter = await this.store.createChapter(
            authorId,
            storyId,
            {
                title: input.title.trim(),
                content: preparedContent.content,
            },
            countWords(preparedContent.plainText),
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
        const preparedContent =
            input.content === undefined
                ? undefined
                : prepareChapterContent(input.content);

        if (
            preparedContent &&
            preparedContent.plainText.length > MAX_CHAPTER_TEXT_LENGTH
        ) {
            throw AppError.tooLarge(
                "Chapter text cannot exceed 100,000 characters.",
                "CHAPTER_CONTENT_TOO_LONG",
                { maxTextLength: MAX_CHAPTER_TEXT_LENGTH },
            );
        }

        const result = await this.store.updateChapter(
            authorId,
            storyId,
            chapterId,
            {
                ...input,
                ...(preparedContent
                    ? { content: preparedContent.content }
                    : {}),
                ...(input.title !== undefined
                    ? { title: input.title.trim() }
                    : {}),
            },
            preparedContent === undefined
                ? undefined
                : countWords(preparedContent.plainText),
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
        expectedOrderingVersion: number,
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
            expectedOrderingVersion,
        );
        if (!chapters) {
            throw AppError.conflict(
                "Chapter order must contain every active chapter exactly once.",
                "ORDERING_CONFLICT",
            );
        }
        return chapters;
    }
}
