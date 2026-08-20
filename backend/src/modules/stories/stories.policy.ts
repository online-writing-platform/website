import AppError from "../../errors/app-error.js";
import { type StoryStatusValue } from "./stories.types.js";
import { createHash } from "node:crypto";

export function isAtLeastAge(
    birthDate: Date,
    requiredAge: number,
    now: Date,
): boolean {
    let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
    const monthDelta = now.getUTCMonth() - birthDate.getUTCMonth();

    if (
        monthDelta < 0 ||
        (monthDelta === 0 && now.getUTCDate() < birthDate.getUTCDate())
    ) {
        age -= 1;
    }

    return age >= requiredAge;
}

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

export interface DraftRevisionDecision {
    currentHash: string;
    incomingHash: string;
    lastRevisionAt: Date | null;
    now: Date;
    minimumIntervalMs: number;
    force?: boolean;
}

export function chapterContentHash(title: string, content: string): string {
    return createHash("sha256")
        .update(title, "utf8")
        .update("\u0000", "utf8")
        .update(content, "utf8")
        .digest("hex");
}

export function shouldCreateDraftRevision(
    input: DraftRevisionDecision,
): boolean {
    if (input.force === true) return true;
    if (input.currentHash === input.incomingHash) return false;
    if (input.lastRevisionAt === null) return true;

    return (
        input.now.getTime() - input.lastRevisionAt.getTime() >=
        input.minimumIntervalMs
    );
}
