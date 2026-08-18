export type NotificationTypeValue =
    | "FOLLOW"
    | "COMMENT"
    | "COMMENT_REPLY"
    | "CHAPTER_VOTE"
    | "STORY_PUBLISHED"
    | "CHAPTER_PUBLISHED"
    | "MODERATION"
    | "SECURITY";

export type NotificationDataValue = string | number | boolean | null;

export type NotificationData = Record<string, NotificationDataValue>;

export interface CreateNotificationInput {
    recipientId: string;

    actorId?: string;

    type: NotificationTypeValue;

    dedupeKey?: string;

    data: NotificationData;
}

export interface NotificationRecord {
    id: string;

    type: NotificationTypeValue;

    data: unknown;

    readAt: Date | null;

    createdAt: Date;

    actor: {
        username: string;

        displayName: string;

        avatarUrl: string | null;
    } | null;
}

export interface NotificationStore {
    create(input: CreateNotificationInput): Promise<void>;

    shouldDeliver(input: CreateNotificationInput): Promise<boolean>;

    list(
        recipientId: string,
        cursor: string | undefined,
        limit: number,
    ): Promise<{
        items: NotificationRecord[];

        hasMore: boolean;

        nextCursor: string | null;
    }>;

    markRead(
        recipientId: string,
        notificationId: string,
        readAt: Date,
    ): Promise<boolean>;

    markAllRead(recipientId: string, readAt: Date): Promise<number>;
}

export interface NotificationLogger {
    error(
        error: unknown,
        context: Record<string, unknown>,
        message: string,
    ): void;
}
