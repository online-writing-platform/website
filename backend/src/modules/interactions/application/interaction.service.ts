import AppError from "../../../errors/app-error.js";

import type {
    InteractionNotificationPublisher,
    InteractionStore,
    InteractionStoryAccess,
} from "./interaction.ports.js";

export class InteractionService {
    public constructor(
        private readonly store: InteractionStore,
        private readonly stories: InteractionStoryAccess,
        private readonly notifications: InteractionNotificationPublisher,
    ) {}

    private async requireChapter(chapterId: string) {
        const chapter = await this.stories.findReadableChapterById(chapterId);
        if (!chapter) {
            throw AppError.notFound("The chapter was not found.", "CHAPTER_NOT_FOUND");
        }
        return chapter;
    }

    public async addVote(userId: string, chapterId: string): Promise<{ votes: number; voted: true }> {
        const chapter = await this.requireChapter(chapterId);
        const created = await this.store.addVote(userId, chapterId);
        if (created) {
            await this.notifications.publish({
                recipientId: chapter.authorId,
                actorId: userId,
                type: "CHAPTER_VOTE",
                data: {
                    chapterId,
                    chapterTitle: chapter.title,
                    storyId: chapter.storyId,
                    storySlug: chapter.storySlug,
                },
            });
        }
        return { votes: await this.store.countVotes(chapterId), voted: true };
    }

    public async removeVote(userId: string, chapterId: string): Promise<{ votes: number; voted: false }> {
        await this.requireChapter(chapterId);
        await this.store.removeVote(userId, chapterId);
        return { votes: await this.store.countVotes(chapterId), voted: false };
    }

    public async voteState(userId: string, chapterId: string) {
        await this.requireChapter(chapterId);
        const [votes, voted] = await Promise.all([
            this.store.countVotes(chapterId),
            this.store.hasVoted(userId, chapterId),
        ]);
        return { votes, voted };
    }

    public async publicVoteCount(chapterId: string) {
        await this.requireChapter(chapterId);
        return { votes: await this.store.countVotes(chapterId) };
    }

    public async createComment(
        userId: string,
        chapterId: string,
        contentInput: string,
        parentId?: string,
    ) {
        const chapter = await this.requireChapter(chapterId);
        const content = contentInput.trim();

        let parent: Awaited<ReturnType<InteractionStore["findComment"]>> = null;
        if (parentId) {
            parent = await this.store.findComment(parentId);
            if (!parent || parent.chapterId !== chapterId || parent.status !== "ACTIVE") {
                throw AppError.badRequest("The parent comment is invalid.", "INVALID_PARENT_COMMENT");
            }
            if (parent.parentId !== null) {
                throw AppError.badRequest(
                    "Replies can only be created under a top-level comment.",
                    "COMMENT_NESTING_LIMIT_REACHED",
                );
            }
        }

        const comment = await this.store.createComment(userId, chapterId, parentId, content);

        if (parent) {
            await this.notifications.publish({
                recipientId: parent.userId,
                actorId: userId,
                type: "COMMENT_REPLY",
                data: {
                    commentId: comment.id,
                    parentId: parent.id,
                    chapterId,
                    storyId: chapter.storyId,
                    storySlug: chapter.storySlug,
                },
            });
        } else {
            await this.notifications.publish({
                recipientId: chapter.authorId,
                actorId: userId,
                type: "COMMENT",
                data: {
                    commentId: comment.id,
                    chapterId,
                    storyId: chapter.storyId,
                    storySlug: chapter.storySlug,
                },
            });
        }

        return comment;
    }

    public async updateComment(userId: string, commentId: string, content: string) {
        const updated = await this.store.updateOwnComment(userId, commentId, content.trim());
        if (!updated) {
            throw AppError.notFound("The comment was not found.", "COMMENT_NOT_FOUND");
        }
        return updated;
    }

    public async deleteComment(userId: string, commentId: string): Promise<void> {
        const deleted = await this.store.deleteOwnComment(userId, commentId);
        if (!deleted) {
            throw AppError.notFound("The comment was not found.", "COMMENT_NOT_FOUND");
        }
    }

    public async listComments(chapterId: string, cursor: string | undefined, limit: number) {
        await this.requireChapter(chapterId);
        return this.store.listComments(chapterId, cursor, limit);
    }

    public async listReplies(
        chapterId: string,
        parentId: string,
        cursor: string | undefined,
        limit: number,
    ) {
        await this.requireChapter(chapterId);
        const parent = await this.store.findComment(parentId);
        if (!parent || parent.chapterId !== chapterId || parent.parentId !== null) {
            throw AppError.notFound("The comment was not found.", "COMMENT_NOT_FOUND");
        }
        return this.store.listReplies(chapterId, parentId, cursor, limit);
    }
}
