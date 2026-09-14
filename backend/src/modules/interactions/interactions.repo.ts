import { prisma } from "../../db/index.js";
import env from "../../config/env.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { buildCursorPage } from "../../shared/pagination/page.js";
import { createCursorCodec } from "../../shared/http/cursor.js";
import { reconcileStoryCommentCount } from "../stories/story-comment-stats.js";
import { z } from "zod";

import type { InteractionStore } from "./interaction.types.js";
import type { CommentView } from "./interaction.types.js";

const cursorCodec = createCursorCodec(env.cursorSecret);
const commentCursorSchema = z.object({
    at: z.string().datetime(),
    id: z.string().uuid(),
});

function blockedUserFilter(viewerId: string): Prisma.UserWhereInput {
    return {
        blocksCreated: { none: { blockedId: viewerId } },
        blocksReceived: { none: { blockerId: viewerId } },
    };
}

function commentSelect(viewerId?: string) {
    return {
        id: true,
        chapterId: true,
        parentId: true,
        content: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: {
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                status: true,
            },
        },
        _count: {
            select: {
                replies: {
                    where: {
                        status: { not: "HIDDEN" as const },
                        ...(viewerId ? { user: blockedUserFilter(viewerId) } : {}),
                    },
                },
            },
        },
    } satisfies Prisma.CommentSelect;
}

interface CommentRow {
    id: string;
    chapterId: string;
    parentId: string | null;
    content: string;
    status: "ACTIVE" | "HIDDEN" | "DELETED";
    createdAt: Date;
    updatedAt: Date;
    user: {
        id: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        status: "ACTIVE" | "SUSPENDED" | "DELETED";
    };
    _count: { replies: number };
}

async function findCommentRow(commentId: string, viewerId?: string): Promise<CommentRow | null> {
    return prisma.comment.findUnique({
        where: { id: commentId },
        select: commentSelect(viewerId),
    });
}

function mapComment(row: CommentRow): CommentView {
    const deleted = row.status === "DELETED";
    return {
        id: row.id,
        chapterId: row.chapterId,
        parentId: row.parentId,
        content: deleted ? "[deleted]" : row.content,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        replyCount: row._count.replies,
        author:
            deleted || row.user.status !== "ACTIVE"
                ? null
                : {
                      id: row.user.id,
                      username: row.user.username,
                      displayName: row.user.displayName,
                      avatarUrl: row.user.avatarUrl,
                  },
    };
}

export class InteractionRepository implements InteractionStore {
    public async addVote(userId: string, chapterId: string): Promise<boolean> {
        const existing = await prisma.chapterVote.findUnique({
            where: { userId_chapterId: { userId, chapterId } },
            select: { userId: true },
        });
        if (existing) return false;
        try {
            await prisma.chapterVote.create({ data: { userId, chapterId }, select: { userId: true } });
            return true;
        } catch {
            const raced = await prisma.chapterVote.findUnique({
                where: { userId_chapterId: { userId, chapterId } },
                select: { userId: true },
            });
            if (raced) return false;
            throw new Error("Failed to record chapter vote.");
        }
    }

    public async removeVote(userId: string, chapterId: string): Promise<boolean> {
        const result = await prisma.chapterVote.deleteMany({ where: { userId, chapterId } });
        return result.count === 1;
    }

    public async hasVoted(userId: string, chapterId: string): Promise<boolean> {
        const vote = await prisma.chapterVote.findUnique({
            where: { userId_chapterId: { userId, chapterId } },
            select: { userId: true },
        });
        return vote !== null;
    }

    public countVotes(chapterId: string): Promise<number> {
        return prisma.chapterVote.count({ where: { chapterId } });
    }

    public findComment(commentId: string) {
        return prisma.comment.findUnique({
            where: { id: commentId },
            select: { id: true, chapterId: true, userId: true, parentId: true, status: true },
        });
    }

    public async getVisibleComment(
        chapterId: string,
        commentId: string,
        viewerId?: string,
    ): Promise<CommentView | null> {
        const row = await prisma.comment.findFirst({
            where: {
                id: commentId,
                chapterId,
                status: { not: "HIDDEN" },
                OR: [
                    { parentId: null },
                    {
                        parent: {
                            status: { not: "HIDDEN" },
                            ...(viewerId
                                ? { user: blockedUserFilter(viewerId) }
                                : {}),
                        },
                    },
                ],
                ...(viewerId ? { user: blockedUserFilter(viewerId) } : {}),
            },
            select: commentSelect(viewerId),
        });

        return row ? mapComment(row) : null;
    }

    public async createComment(
        userId: string,
        chapterId: string,
        parentId: string | undefined,
        content: string,
    ): Promise<CommentView> {
        const row = await prisma.$transaction(async (transaction) => {
            const chapter = await transaction.chapter.findUniqueOrThrow({
                where: { id: chapterId },
                select: { storyId: true },
            });
            const created = await transaction.comment.create({
                data: { userId, chapterId, ...(parentId ? { parentId } : {}), content },
                select: commentSelect(userId),
            });

            await reconcileStoryCommentCount(transaction, chapter.storyId);
            return created;
        });
        return mapComment(row);
    }

    public async updateOwnComment(userId: string, commentId: string, content: string) {
        const result = await prisma.comment.updateMany({
            where: { id: commentId, userId, status: "ACTIVE" },
            data: { content },
        });
        if (result.count !== 1) return null;
        const row = await findCommentRow(commentId, userId);
        return row ? mapComment(row) : null;
    }

    public async deleteOwnComment(userId: string, commentId: string): Promise<boolean> {
        return prisma.$transaction(async (transaction) => {
            const comment = await transaction.comment.findFirst({
                where: { id: commentId, userId, status: "ACTIVE" },
                select: { chapter: { select: { storyId: true } } },
            });
            if (!comment) return false;

            const result = await transaction.comment.updateMany({
                where: { id: commentId, userId, status: "ACTIVE" },
                data: { status: "DELETED", content: "[deleted]" },
            });
            if (result.count !== 1) return false;

            await reconcileStoryCommentCount(transaction, comment.chapter.storyId);
            return true;
        });
    }

    public async listComments(
        chapterId: string,
        cursor: string | undefined,
        limit: number,
        viewerId?: string,
    ) {
        const decodedCursor = cursor
            ? cursorCodec.decode(cursor, commentCursorSchema)
            : null;
        const rows: CommentRow[] = await prisma.comment.findMany({
            where: {
                chapterId,
                parentId: null,
                status: { not: "HIDDEN" },
                ...(viewerId
                    ? {
                          user: blockedUserFilter(viewerId),
                      }
                    : {}),
                ...(decodedCursor
                    ? {
                          OR: [
                              { createdAt: { lt: new Date(decodedCursor.at) } },
                              {
                                  createdAt: new Date(decodedCursor.at),
                                  id: { lt: decodedCursor.id },
                              },
                          ],
                      }
                    : {}),
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: limit + 1,
            select: commentSelect(viewerId),
        });
        const page = buildCursorPage(rows, limit, (row) =>
            cursorCodec.encode({ at: row.createdAt.toISOString(), id: row.id }),
        );
        return { comments: page.items.map(mapComment), pagination: page.pagination };
    }

    public async listReplies(
        chapterId: string,
        parentId: string,
        cursor: string | undefined,
        limit: number,
        viewerId?: string,
    ) {
        const decodedCursor = cursor
            ? cursorCodec.decode(cursor, commentCursorSchema)
            : null;
        const rows: CommentRow[] = await prisma.comment.findMany({
            where: {
                chapterId,
                parentId,
                status: { not: "HIDDEN" },
                ...(viewerId
                    ? {
                          user: blockedUserFilter(viewerId),
                      }
                    : {}),
                ...(decodedCursor
                    ? {
                          OR: [
                              { createdAt: { gt: new Date(decodedCursor.at) } },
                              {
                                  createdAt: new Date(decodedCursor.at),
                                  id: { gt: decodedCursor.id },
                              },
                          ],
                      }
                    : {}),
            },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            take: limit + 1,
            select: commentSelect(viewerId),
        });
        const page = buildCursorPage(rows, limit, (row) =>
            cursorCodec.encode({ at: row.createdAt.toISOString(), id: row.id }),
        );
        return { comments: page.items.map(mapComment), pagination: page.pagination };
    }
}
