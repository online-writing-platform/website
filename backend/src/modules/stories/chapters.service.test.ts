import assert from "node:assert/strict";
import test from "node:test";

import AppError from "../../errors/app-error.js";
import type { ChaptersRepository } from "./chapters.repo.js";
import { ChapterService } from "./chapters.service.js";

function chapter(version = 3) {
    return {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Chapter",
        position: 1,
        content: "text",
        version,
        status: "DRAFT" as const,
        moderationState: "VISIBLE" as const,
        wordCount: 1,
        publishedAt: null,
        createdAt: new Date("2026-08-09T00:00:00Z"),
        updatedAt: new Date("2026-08-09T01:00:00Z"),
    };
}

function storeWithUpdate(
    updateResult: Awaited<ReturnType<ChaptersRepository["updateChapter"]>>,
): ChaptersRepository {
    return {
        updateChapter: () => Promise.resolve(updateResult),
    } as unknown as ChaptersRepository;
}

void test("chapter update returns the incremented server version", async () => {
    const service = new ChapterService(
        storeWithUpdate({ kind: "UPDATED", chapter: chapter(4) }),
    );

    const result = await service.update(
        "author",
        "story",
        "chapter",
        { content: "new", expectedVersion: 3 },
    );

    assert.equal(result.version, 4);
});

void test("chapter update exposes a 409 conflict instead of overwriting a newer edit", async () => {
    const service = new ChapterService(
        storeWithUpdate({ kind: "CONFLICT", current: chapter(4) }),
    );

    await assert.rejects(
        () =>
            service.update(
                "author",
                "story",
                "chapter",
                { content: "stale", expectedVersion: 3 },
            ),
        (error: unknown) => {
            if (!(error instanceof AppError)) return false;
            assert.equal(error.statusCode, 409);
            assert.equal(error.code, "CHAPTER_EDIT_CONFLICT");
            assert.deepEqual(error.details, {
                currentVersion: 4,
                updatedAt: new Date("2026-08-09T01:00:00Z"),
            });
            return true;
        },
    );
});
