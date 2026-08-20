import { prisma } from "../../db/index.js";
import { buildCursorPage } from "../../shared/pagination/page.js";

import type { InteractionStore } from "./interaction.types.js";
import type { CommentView } from "./interaction.types.js";

const commentSelect = {
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
    _count: { select: { replies: { where: { status: { not: "DELETED" } } } } },
} as const;

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

async function findCommentRow(commentId: string): Promise<CommentRow | null> {
    return prisma.comment.findUnique({ where: { id: commentId }, select: commentSelect });
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

    public async createComment(
        userId: string,
        chapterId: string,
        parentId: string | undefined,
        content: string,
    ): Promise<CommentView> {
        const row = await prisma.comment.create({
            data: { userId, chapterId, ...(parentId ? { parentId } : {}), content },
            select: commentSelect,
        });
        return mapComment(row);
    }

    public async updateOwnComment(userId: string, commentId: string, content: string) {
        const result = await prisma.comment.updateMany({
            where: { id: commentId, userId, status: "ACTIVE" },
            data: { content },
        });
        if (result.count !== 1) return null;
        const row = await findCommentRow(commentId);
        return row ? mapComment(row) : null;
    }

    public async deleteOwnComment(userId: string, commentId: string): Promise<boolean> {
        const result = await prisma.comment.updateMany({
            where: { id: commentId, userId, status: "ACTIVE" },
            data: { status: "DELETED", content: "[deleted]" },
        });
        return result.count === 1;
    }

    public async listComments(
        chapterId: string,
        cursor: string | undefined,
        limit: number,
        viewerId?: string,
    ) {
        const rows: CommentRow[] = await prisma.comment.findMany({
            where: {
                chapterId,
                parentId: null,
                status: { not: "HIDDEN" },
                ...(viewerId
                    ? {
                          user: {
                              blocksCreated: { none: { blockedId: viewerId } },
                              blocksReceived: { none: { blockerId: viewerId } },
                          },
                      }
                    : {}),
            },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            select: commentSelect,
        });
        const page = buildCursorPage(rows, limit, (row) => row.id);
        return { comments: page.items.map(mapComment), pagination: page.pagination };
    }

    public async listReplies(
        chapterId: string,
        parentId: string,
        cursor: string | undefined,
        limit: number,
        viewerId?: string,
    ) {
        const rows: CommentRow[] = await prisma.comment.findMany({
            where: {
                chapterId,
                parentId,
                status: { not: "HIDDEN" },
                ...(viewerId
                    ? {
                          user: {
                              blocksCreated: { none: { blockedId: viewerId } },
                              blocksReceived: { none: { blockerId: viewerId } },
                          },
                      }
                    : {}),
            },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            select: commentSelect,
        });
        const page = buildCursorPage(rows, limit, (row) => row.id);
        return { comments: page.items.map(mapComment), pagination: page.pagination };
    }
}
