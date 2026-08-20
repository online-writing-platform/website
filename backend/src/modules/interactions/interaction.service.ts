import AppError from "../../errors/app-error.js";
import { notificationServices } from "../notifications/notification.service.js";
import { socialServices } from "../social/social.service.js";
import { storiesServices } from "../stories/stories.service.js";
import { type InteractionNotificationPublisher, type InteractionSocialPolicy, type InteractionStore, type InteractionStoryAccess } from "./interaction.types.js";
import { InteractionRepository } from "./interactions.repo.js";

export class InteractionService {
    public constructor(
        private readonly store: InteractionStore,
        private readonly stories: InteractionStoryAccess,
        private readonly notifications: InteractionNotificationPublisher,
        private readonly socialPolicy: InteractionSocialPolicy,
    ) {}

    private async requireChapter(chapterId: string, viewerId?: string) {
        const chapter = await this.stories.findReadableChapterById(
            chapterId,
            viewerId,
        );
        if (!chapter) {
            throw AppError.notFound(
                "The chapter was not found.",
                "CHAPTER_NOT_FOUND",
            );
        }
        return chapter;
    }

    public async addVote(
        userId: string,
        chapterId: string,
    ): Promise<{ votes: number; voted: true }> {
        const chapter = await this.requireChapter(chapterId, userId);
        await this.socialPolicy.assertMayInteract(userId, chapter.authorId);

        const created = await this.store.addVote(userId, chapterId);
        if (created) {
            await this.notifications.publish({
                recipientId: chapter.authorId,
                actorId: userId,
                type: "CHAPTER_VOTE",
                dedupeKey: `vote:${userId}:${chapterId}`,
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

    public async removeVote(
        userId: string,
        chapterId: string,
    ): Promise<{ votes: number; voted: false }> {
        const chapter = await this.requireChapter(chapterId, userId);
        await this.socialPolicy.assertMayInteract(userId, chapter.authorId);
        await this.store.removeVote(userId, chapterId);
        return { votes: await this.store.countVotes(chapterId), voted: false };
    }

    public async voteState(userId: string, chapterId: string) {
        const chapter = await this.requireChapter(chapterId, userId);
        await this.socialPolicy.assertMayInteract(userId, chapter.authorId);
        const [votes, voted] = await Promise.all([
            this.store.countVotes(chapterId),
            this.store.hasVoted(userId, chapterId),
        ]);
        return { votes, voted };
    }

    public async publicVoteCount(chapterId: string, viewerId?: string) {
        await this.requireChapter(chapterId, viewerId);
        return { votes: await this.store.countVotes(chapterId) };
    }

    public async createComment(
        userId: string,
        chapterId: string,
        contentInput: string,
        parentId?: string,
    ) {
        const chapter = await this.requireChapter(chapterId, userId);
        await this.socialPolicy.assertMayInteract(userId, chapter.authorId);

        const content = contentInput.trim();

        let parent: Awaited<ReturnType<InteractionStore["findComment"]>> = null;
        if (parentId) {
            parent = await this.store.findComment(parentId);
            if (
                !parent ||
                parent.chapterId !== chapterId ||
                parent.status !== "ACTIVE"
            ) {
                throw AppError.badRequest(
                    "The parent comment is invalid.",
                    "INVALID_PARENT_COMMENT",
                );
            }
            if (parent.parentId !== null) {
                throw AppError.badRequest(
                    "Replies can only be created under a top-level comment.",
                    "COMMENT_NESTING_LIMIT_REACHED",
                );
            }
            await this.socialPolicy.assertMayInteract(userId, parent.userId);
        }

        const comment = await this.store.createComment(
            userId,
            chapterId,
            parentId,
            content,
        );

        if (parent) {
            await this.notifications.publish({
                recipientId: parent.userId,
                actorId: userId,
                type: "COMMENT_REPLY",
                dedupeKey: `comment-reply:${comment.id}`,
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
                dedupeKey: `comment:${comment.id}`,
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

    public async updateComment(
        userId: string,
        commentId: string,
        content: string,
    ) {
        const updated = await this.store.updateOwnComment(
            userId,
            commentId,
            content.trim(),
        );
        if (!updated) {
            throw AppError.notFound(
                "The comment was not found.",
                "COMMENT_NOT_FOUND",
            );
        }
        return updated;
    }

    public async deleteComment(
        userId: string,
        commentId: string,
    ): Promise<void> {
        const deleted = await this.store.deleteOwnComment(userId, commentId);
        if (!deleted) {
            throw AppError.notFound(
                "The comment was not found.",
                "COMMENT_NOT_FOUND",
            );
        }
    }

    public async listComments(
        chapterId: string,
        cursor: string | undefined,
        limit: number,
        viewerId?: string,
    ) {
        await this.requireChapter(chapterId, viewerId);
        return this.store.listComments(chapterId, cursor, limit, viewerId);
    }

    public async listReplies(
        chapterId: string,
        parentId: string,
        cursor: string | undefined,
        limit: number,
        viewerId?: string,
    ) {
        await this.requireChapter(chapterId, viewerId);
        const parent = await this.store.findComment(parentId);
        if (!parent || parent.chapterId !== chapterId || parent.parentId !== null) {
            throw AppError.notFound(
                "The comment was not found.",
                "COMMENT_NOT_FOUND",
            );
        }
        if (
            viewerId &&
            (await this.socialPolicy.isBlockedBetween(viewerId, parent.userId))
        ) {
            throw AppError.notFound(
                "The comment was not found.",
                "COMMENT_NOT_FOUND",
            );
        }
        return this.store.listReplies(
            chapterId,
            parentId,
            cursor,
            limit,
            viewerId,
        );
    }
}

const store = new InteractionRepository();

export const interactionServices = {
    service: new InteractionService(
        store,
        storiesServices.access,
        notificationServices.publisher,
        socialServices.policy,
    ),
};
