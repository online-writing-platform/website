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

function commentView(overrides: Partial<{
    id: string;
    chapterId: string;
    parentId: string | null;
    content: string;
}> = {}) {
    return {
        id: overrides.id ?? "comment-2",
        chapterId: overrides.chapterId ?? "chapter-1",
        parentId: overrides.parentId ?? null,
        content: overrides.content ?? "A comment",
        status: "ACTIVE" as const,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        replyCount: 0,
        author: {
            id: "actor-1",
            username: "actor",
            displayName: "Actor",
            avatarUrl: null,
        },
    };
}

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

void test("creates a one-level reply and notifies the parent author", async () => {
    const policyTargets: string[] = [];
    const published: Parameters<InteractionNotificationPublisher["publish"]>[0][] = [];
    let createInput: { parentId?: string; content?: string } = {};
    const store = {
        findComment: () => Promise.resolve({
            id: "parent-1",
            chapterId: "chapter-1",
            userId: "parent-author-1",
            parentId: null,
            status: "ACTIVE" as const,
        }),
        createComment: (
            _userId: string,
            _chapterId: string,
            parentId: string | undefined,
            content: string,
        ) => {
            createInput = { parentId, content };
            return Promise.resolve(commentView({ parentId, content }));
        },
    } as unknown as InteractionStore;
    const socialPolicy: InteractionSocialPolicy = {
        assertMayInteract: (_actorId, targetId) => {
            policyTargets.push(targetId);
            return Promise.resolve();
        },
        isBlockedBetween: () => Promise.resolve(false),
    };
    const publisher: InteractionNotificationPublisher = {
        publish: (input) => {
            published.push(input);
            return Promise.resolve();
        },
    };
    const service = new InteractionService(
        store,
        chapterAccess,
        publisher,
        socialPolicy,
    );

    const reply = await service.createComment(
        "actor-1",
        "chapter-1",
        "  A reply  ",
        "parent-1",
    );

    assert.equal(reply.parentId, "parent-1");
    assert.deepEqual(createInput, {
        parentId: "parent-1",
        content: "A reply",
    });
    assert.deepEqual(policyTargets, ["author-1", "parent-author-1"]);
    assert.equal(published.length, 1);
    assert.deepEqual(published[0], {
        recipientId: "parent-author-1",
        actorId: "actor-1",
        type: "COMMENT_REPLY",
        dedupeKey: "comment-reply:comment-2",
        data: {
            commentId: "comment-2",
            parentId: "parent-1",
            chapterId: "chapter-1",
            storyId: "story-1",
            storySlug: "story",
        },
    });
});

void test("rejects a reply to another reply before writing", async () => {
    let created = false;
    const store = {
        findComment: () => Promise.resolve({
            id: "reply-1",
            chapterId: "chapter-1",
            userId: "commenter-1",
            parentId: "parent-1",
            status: "ACTIVE" as const,
        }),
        createComment: () => {
            created = true;
            return Promise.resolve(commentView());
        },
    } as unknown as InteractionStore;
    const socialPolicy: InteractionSocialPolicy = {
        assertMayInteract: () => Promise.resolve(),
        isBlockedBetween: () => Promise.resolve(false),
    };
    const service = new InteractionService(
        store,
        chapterAccess,
        notifications,
        socialPolicy,
    );

    await assert.rejects(
        service.createComment("actor-1", "chapter-1", "reply", "reply-1"),
        (error: unknown) =>
            error instanceof AppError &&
            error.statusCode === 400 &&
            error.code === "COMMENT_NESTING_LIMIT_REACHED",
    );
    assert.equal(created, false);
});

void test("does not expose replies belonging to a hidden parent", async () => {
    let queriedReplies = false;
    const store = {
        findComment: () => Promise.resolve({
            id: "comment-1",
            chapterId: "chapter-1",
            userId: "commenter-1",
            parentId: null,
            status: "HIDDEN" as const,
        }),
        listReplies: () => {
            queriedReplies = true;
            return Promise.resolve({
                comments: [],
                pagination: { hasMore: false, nextCursor: null },
            });
        },
    } as unknown as InteractionStore;
    const socialPolicy: InteractionSocialPolicy = {
        assertMayInteract: () => Promise.resolve(),
        isBlockedBetween: () => Promise.resolve(false),
    };
    const service = new InteractionService(
        store,
        chapterAccess,
        notifications,
        socialPolicy,
    );

    await assert.rejects(
        service.listReplies("chapter-1", "comment-1", undefined, 20),
        (error: unknown) =>
            error instanceof AppError &&
            error.statusCode === 404 &&
            error.code === "COMMENT_NOT_FOUND",
    );
    assert.equal(queriedReplies, false);
});

void test("returns a directly addressed visible comment", async () => {
    const expected = commentView({ id: "comment-1" });
    const store = {
        getVisibleComment: () => Promise.resolve(expected),
    } as unknown as InteractionStore;
    const socialPolicy: InteractionSocialPolicy = {
        assertMayInteract: () => Promise.resolve(),
        isBlockedBetween: () => Promise.resolve(false),
    };
    const service = new InteractionService(
        store,
        chapterAccess,
        notifications,
        socialPolicy,
    );

    assert.equal(
        await service.getComment("chapter-1", "comment-1", "viewer-1"),
        expected,
    );
});

void test("edits only an owned active comment after checking chapter access", async () => {
    let savedContent = "";
    const updated = commentView({ id: "comment-1", content: "Edited" });
    const store = {
        findComment: () => Promise.resolve({
            id: "comment-1",
            chapterId: "chapter-1",
            userId: "actor-1",
            parentId: null,
            status: "ACTIVE" as const,
        }),
        updateOwnComment: (
            _userId: string,
            _commentId: string,
            content: string,
        ) => {
            savedContent = content;
            return Promise.resolve(updated);
        },
    } as unknown as InteractionStore;
    const socialPolicy: InteractionSocialPolicy = {
        assertMayInteract: () => Promise.resolve(),
        isBlockedBetween: () => Promise.resolve(false),
    };
    const service = new InteractionService(
        store,
        chapterAccess,
        notifications,
        socialPolicy,
    );

    assert.equal(
        await service.updateComment("actor-1", "comment-1", "  Edited  "),
        updated,
    );
    assert.equal(savedContent, "Edited");
});

void test("rejects deleting a comment that is not owned and active", async () => {
    const store = {
        deleteOwnComment: () => Promise.resolve(false),
    } as unknown as InteractionStore;
    const socialPolicy: InteractionSocialPolicy = {
        assertMayInteract: () => Promise.resolve(),
        isBlockedBetween: () => Promise.resolve(false),
    };
    const service = new InteractionService(
        store,
        chapterAccess,
        notifications,
        socialPolicy,
    );

    await assert.rejects(
        service.deleteComment("actor-1", "comment-1"),
        (error: unknown) =>
            error instanceof AppError &&
            error.statusCode === 404 &&
            error.code === "COMMENT_NOT_FOUND",
    );
});
