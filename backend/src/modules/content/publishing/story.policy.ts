import AppError from "../../../errors/app-error.js";

import type { StoryStatusValue } from "../catalog/content.types.js";

export function assertPublishedStoryStatus(
    currentPublishedAt: Date | null,
    nextStatus: Exclude<StoryStatusValue, "DRAFT">,
): void {
    if (currentPublishedAt === null) {
        throw AppError.badRequest(
            `Story status cannot be changed to ${nextStatus} before the story is published.`,
            "STORY_NOT_PUBLISHED",
        );
    }
}

export function countWords(content: string): number {
    const trimmed = content.trim();

    if (trimmed.length === 0) {
        return 0;
    }

    return trimmed.split(/\s+/u).length;
}
