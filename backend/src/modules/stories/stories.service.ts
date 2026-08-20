import AppError from "../../errors/app-error.js";
import { createTagSlug, createUniqueSlugCandidate, normalizeTagName } from "../../shared/text/slug.js";
import { normalizeUsername } from "../../utils/normalize.js";
import { ChapterService } from "./chapters.service.js";
import { RevisionService } from "./revision.service.js";
import { SchedulingService } from "./scheduling.service.js";
import { StoriesRepository } from "./stories.repo.js";
import { StoryCatalogRepository } from "./story-catalog.repo.js";
import { ChaptersRepository } from "./chapters.repo.js";
import { StoryAccessRepository } from "./access.repo.js";
import { type CreateStoryInput, type StoryDetail, type StoryPage, type UpdateStoryInput } from "./stories.types.js";
import { assertPublishedStoryStatus } from "./stories.policy.js";

function normalizeTags(tags: string[] | undefined): Array<{ name: string; slug: string }> {
    if (!tags) return [];

    const bySlug = new Map<string, { name: string; slug: string }>();
    for (const rawTag of tags) {
        const name = normalizeTagName(rawTag);
        if (name.length === 0) continue;
        const slug = createTagSlug(name);
        bySlug.set(slug, { name, slug });
    }
    return [...bySlug.values()];
}

export class StoryService {
    public constructor(
        private readonly store: StoriesRepository,
        private readonly catalog: StoryCatalogRepository,
    ) {}

    public async create(authorId: string, input: CreateStoryInput): Promise<StoryDetail> {
        if (input.genreSlug && !(await this.catalog.genreExists(input.genreSlug))) {
            throw AppError.badRequest("The selected genre is invalid.", "INVALID_GENRE");
        }

        return this.store.createStory(
            authorId,
            createUniqueSlugCandidate(input.title),
            {
                ...input,
                title: input.title.trim(),
                description: input.description.trim(),
            },
            normalizeTags(input.tags),
        );
    }

    public async update(
        authorId: string,
        storyId: string,
        input: UpdateStoryInput,
    ): Promise<StoryDetail> {
        const current = await this.store.findOwnedStory(authorId, storyId);
        if (!current) {
            throw AppError.notFound("The story was not found.", "STORY_NOT_FOUND");
        }

        if (input.status) {
            assertPublishedStoryStatus(current.publishedAt, input.status);
        }

        if (input.visibility === "UNLISTED" && current.publishedAt === null) {
            throw AppError.badRequest(
                "A story must be published before it can be unlisted.",
                "STORY_NOT_PUBLISHED",
            );
        }

        if (
            input.genreSlug !== undefined &&
            input.genreSlug !== null &&
            !(await this.catalog.genreExists(input.genreSlug))
        ) {
            throw AppError.badRequest("The selected genre is invalid.", "INVALID_GENRE");
        }

        const normalizedInput: UpdateStoryInput = {
            ...input,
            ...(input.title !== undefined ? { title: input.title.trim() } : {}),
            ...(input.description !== undefined
                ? { description: input.description.trim() }
                : {}),
        };

        const story = await this.store.updateStory(
            authorId,
            storyId,
            normalizedInput,
            input.tags === undefined ? undefined : normalizeTags(input.tags),
        );

        if (!story) {
            throw AppError.notFound("The story was not found.", "STORY_NOT_FOUND");
        }
        return story;
    }

    public async remove(authorId: string, storyId: string): Promise<void> {
        const deleted = await this.store.softDeleteStory(authorId, storyId, new Date());
        if (!deleted) {
            throw AppError.notFound("The story was not found.", "STORY_NOT_FOUND");
        }
    }

    public async publish(authorId: string, storyId: string): Promise<void> {
        const result = await this.store.publishStory(authorId, storyId, new Date());
        if (result === "NOT_FOUND") {
            throw AppError.notFound("The story was not found.", "STORY_NOT_FOUND");
        }
        if (result === "NO_PUBLISHED_CHAPTER") {
            throw AppError.badRequest(
                "At least one published chapter is required before publishing a story.",
                "PUBLISHED_CHAPTER_REQUIRED",
            );
        }
    }

    public async unpublish(authorId: string, storyId: string): Promise<void> {
        const updated = await this.store.unpublishStory(authorId, storyId);
        if (!updated) {
            throw AppError.notFound("The story was not found.", "STORY_NOT_FOUND");
        }
    }

    public async getPublic(slug: string, viewerId?: string): Promise<StoryDetail> {
        const story = await this.store.getPublicStory(slug, viewerId);
        if (!story) {
            throw AppError.notFound("The story was not found.", "STORY_NOT_FOUND");
        }
        return story;
    }

    public async getOwned(authorId: string, storyId: string): Promise<StoryDetail> {
        const story = await this.store.getOwnedStory(authorId, storyId);
        if (!story) {
            throw AppError.notFound("The story was not found.", "STORY_NOT_FOUND");
        }
        return story;
    }

    public listPublic(
        cursor: string | undefined,
        limit: number,
        filters: { genre?: string; tag?: string; language?: string; author?: string },
        viewerId?: string,
    ): Promise<StoryPage> {
        return this.catalog.listPublicStories(
            cursor,
            limit,
            {
                ...filters,
                ...(filters.author ? { author: normalizeUsername(filters.author) } : {}),
            },
            viewerId,
        );
    }

    public listMine(
        authorId: string,
        cursor: string | undefined,
        limit: number,
    ): Promise<StoryPage> {
        return this.catalog.listOwnedStories(authorId, cursor, limit);
    }

    public listGenres(): Promise<Array<{ slug: string; name: string }>> {
        return this.catalog.listGenres();
    }
}

const storiesRepository = new StoriesRepository();
const storyCatalogRepository = new StoryCatalogRepository();
const chaptersRepository = new ChaptersRepository();
const accessRepository = new StoryAccessRepository();

export const storiesServices = {
    stories: new StoryService(storiesRepository, storyCatalogRepository),
    chapters: new ChapterService(chaptersRepository),
    access: accessRepository,
    revisions: new RevisionService(),
    scheduling: new SchedulingService(),
};
