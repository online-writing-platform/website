export type CommentStatus = "ACTIVE" | "HIDDEN" | "DELETED";

export interface CommentAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface ChapterComment {
  id: string;
  chapterId: string;
  parentId: string | null;
  content: string;
  status: CommentStatus;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  author: CommentAuthor | null;
}

export interface CommentPage {
  items: ChapterComment[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ReplyPage extends CommentPage {
  loaded: boolean;
  loadingInitial: boolean;
  loadingMore: boolean;
  error: string | null;
}

export interface CommentPageResponse {
  data: {
    comments: ChapterComment[];
    pagination: {
      hasMore: boolean;
      nextCursor: string | null;
    };
  };
}

export interface CommentResponse {
  data: {
    comment: ChapterComment;
  };
}

export interface CommentDeepLink {
  commentId: string;
  parentId: string | null;
}
