import assert from "node:assert/strict";
import test from "node:test";

import AppError from "../../errors/app-error.js";
import { InteractionService } from "./interaction.service.js";
import type {
    InteractionNotificationPublisher,
    InteractionSocialPolicy,
    InteractionStore,
    InteractionStoryAccess,
} from "./interaction.types.js";

const chapterAccess: InteractionStoryAccess = {
    findReadableChapterById: () =>
        Promise.resolve({
            id: "chapter-1",
            storyId: "story-1",
            storySlug: "story",
            storyTitle: "Story",
            authorId: "author-1",
            title: "Chapter",
        }),
};

const notifications: InteractionNotificationPublisher = {
    publish: () => Promise.resolve(),
};

void test("blocked comment authors are hidden from reply collection access", async () => {
    let queriedReplies = false;
    const store = {
        findComment: () =>
            Promise.resolve({
                id: "comment-1",
                chapterId: "chapter-1",
                userId: "commenter-1",
                parentId: null,
                status: "ACTIVE" as const,
            }),
        listReplies: () => {
            queriedReplies = true;
            return Promise.resolve({
                comments: [],
                pagination: { nextCursor: null },
            });
        },
    } as unknown as InteractionStore;
    const socialPolicy: InteractionSocialPolicy = {
        assertMayInteract: () => Promise.resolve(),
        isBlockedBetween: () => Promise.resolve(true),
    };
    const service = new InteractionService(
        store,
        chapterAccess,
        notifications,
        socialPolicy,
    );

    await assert.rejects(
        service.listReplies(
            "chapter-1",
            "comment-1",
            undefined,
            20,
            "viewer-1",
        ),
        (error: unknown) =>
            error instanceof AppError &&
            error.statusCode === 404 &&
            error.code === "COMMENT_NOT_FOUND",
    );
    assert.equal(queriedReplies, false);
});
