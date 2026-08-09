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
