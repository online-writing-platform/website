export type NotificationFilter = "all" | "unread" | "read";

export type NotificationError = "load" | "update" | null;

export type NotificationType =
  | "FOLLOW"
  | "COMMENT"
  | "COMMENT_REPLY"
  | "CHAPTER_VOTE"
  | "STORY_PUBLISHED"
  | "CHAPTER_PUBLISHED"
  | "MODERATION"
  | "SECURITY";

export interface NotificationItem {
  id: string;
  type: NotificationType | string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
  actor: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
}

export interface NotificationsResponse {
  data: {
    items: NotificationItem[];
    hasMore: boolean;
    nextCursor: string | null;
  };
}
