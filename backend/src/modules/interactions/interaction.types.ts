import { type SocialInteractionPolicy } from "../social/social.types.js";

export interface InteractionUserSummary {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
}

export interface CommentView {
    id: string;
    chapterId: string;
    parentId: string | null;
    content: string;
    status: "ACTIVE" | "HIDDEN" | "DELETED";
    createdAt: Date;
    updatedAt: Date;
    replyCount: number;
    author: InteractionUserSummary | null;
}

export interface CommentPage {
    comments: CommentView[];
    pagination: {
        hasMore: boolean;
        nextCursor: string | null;
    };
}

export interface InteractionStore {
    addVote(userId: string, chapterId: string): Promise<boolean>;
    removeVote(userId: string, chapterId: string): Promise<boolean>;
    hasVoted(userId: string, chapterId: string): Promise<boolean>;
    countVotes(chapterId: string): Promise<number>;

    findComment(commentId: string): Promise<{
        id: string;
        chapterId: string;
        userId: string;
        parentId: string | null;
        status: "ACTIVE" | "HIDDEN" | "DELETED";
    } | null>;
    createComment(
        userId: string,
        chapterId: string,
        parentId: string | undefined,
        content: string,
    ): Promise<CommentView>;
    updateOwnComment(
        userId: string,
        commentId: string,
        content: string,
    ): Promise<CommentView | null>;
    deleteOwnComment(userId: string, commentId: string): Promise<boolean>;
    listComments(
        chapterId: string,
        cursor: string | undefined,
        limit: number,
        viewerId?: string,
    ): Promise<CommentPage>;
    listReplies(
        chapterId: string,
        parentId: string,
        cursor: string | undefined,
        limit: number,
        viewerId?: string,
    ): Promise<CommentPage>;
}

export interface InteractionStoryAccess {
    findReadableChapterById(
        chapterId: string,
        viewerId?: string,
    ): Promise<{
        id: string;
        storyId: string;
        storySlug: string;
        storyTitle: string;
        authorId: string;
        title: string;
    } | null>;
}

export interface InteractionNotificationPublisher {
    publish(input: {
        recipientId: string;
        actorId?: string;
        type: "COMMENT" | "COMMENT_REPLY" | "CHAPTER_VOTE";
        dedupeKey?: string;
        data: Record<string, string | number | boolean | null>;
    }): Promise<void>;
}

export type InteractionSocialPolicy = SocialInteractionPolicy;
