import { useCallback, useEffect, useState } from "react";

import { Link } from "react-router-dom";

import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";

interface Notification {
    id: string;

    type: string;

    data: Record<string, unknown>;

    readAt: string | null;

    createdAt: string;

    actor: {
        username: string;

        displayName: string;

        avatarUrl: string | null;
    } | null;
}

interface NotificationsResponse {
    data: {
        items: Notification[];

        hasMore: boolean;

        nextCursor: string | null;
    };
}

function stringData(item: Notification, key: string): string | null {
    const value = item.data[key];

    return typeof value === "string" ? value : null;
}

function label(item: Notification): string {
    const actor = item.actor?.displayName ?? "سامانه";

    switch (item.type) {
        case "FOLLOW":
            return `${actor} شما را دنبال کرد.`;

        case "COMMENT":
            return `${actor} برای فصل شما نظر نوشت.`;

        case "COMMENT_REPLY":
            return `${actor} به نظر شما پاسخ داد.`;

        case "CHAPTER_VOTE":
            return `${actor} به فصل شما رأی داد.`;

        case "STORY_PUBLISHED": {
            const storyTitle = stringData(item, "storyTitle");

            return storyTitle
                ? `داستان «${storyTitle}» منتشر شد.`
                : "داستان تازه‌ای منتشر شد.";
        }

        case "CHAPTER_PUBLISHED":
            return "فصل تازه‌ای منتشر شد.";

        case "MODERATION":
            return "یک رویداد مدیریتی برای حساب یا محتوای شما ثبت شد.";

        case "SECURITY":
            return "یک رویداد امنیتی برای حساب شما ثبت شد.";

        default:
            return "اعلان جدید";
    }
}

export default function NotificationsPage() {
    const { request } = useAuth();

    const [items, setItems] = useState<Notification[]>([]);

    const [hasMore, setHasMore] = useState(false);

    const [nextCursor, setNextCursor] = useState<string | null>(null);

    const [loadingMore, setLoadingMore] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async (): Promise<void> => {
        const response = await request<NotificationsResponse>(
            "/api/v1/notifications?limit=50",
        );

        setItems(response.data.items);

        setHasMore(response.data.hasMore);

        setNextCursor(response.data.nextCursor);
    }, [request]);

    useEffect(() => {
        const loadTimer = window.setTimeout(() => {
            void load().catch((cause: unknown) =>
                setError(getErrorMessage(cause)),
            );
        }, 0);

        return () => {
            window.clearTimeout(loadTimer);
        };
    }, [load]);

    async function loadMore(): Promise<void> {
        if (!hasMore || !nextCursor || loadingMore) {
            return;
        }

        const cursor = nextCursor;

        setLoadingMore(true);

        setError(null);

        try {
            const response = await request<NotificationsResponse>(
                `/api/v1/notifications?limit=50&cursor=${encodeURIComponent(
                    cursor,
                )}`,
            );

            setItems((current) => [...current, ...response.data.items]);

            setHasMore(response.data.hasMore);

            setNextCursor(response.data.nextCursor);
        } catch (cause: unknown) {
            setError(getErrorMessage(cause));
        } finally {
            setLoadingMore(false);
        }
    }

    async function markAllRead(): Promise<void> {
        try {
            await request("/api/v1/notifications/read-all", {
                method: "POST",
            });

            setItems((current) =>
                current.map((item) => ({
                    ...item,

                    readAt: item.readAt ?? new Date().toISOString(),
                })),
            );
        } catch (cause: unknown) {
            setError(getErrorMessage(cause));
        }
    }

    async function markRead(id: string): Promise<void> {
        try {
            await request(`/api/v1/notifications/${id}/read`, {
                method: "POST",
            });

            setItems((current) =>
                current.map((item) =>
                    item.id === id
                        ? {
                              ...item,

                              readAt: item.readAt ?? new Date().toISOString(),
                          }
                        : item,
                ),
            );
        } catch (cause: unknown) {
            setError(getErrorMessage(cause));
        }
    }

    return (
        <main className="page-shell">
            <header className="page-heading">
                <div>
                    <p className="eyebrow">حساب کاربری</p>

                    <h1>اعلان‌ها</h1>
                </div>

                <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => void markAllRead()}
                >
                    همه خوانده شد
                </button>
            </header>

            {error && (
                <p
                    className="status-message status-message--error"
                    role="alert"
                >
                    {error}
                </p>
            )}

            <div className="notification-list">
                {items.length === 0 ? (
                    <p className="empty-state">اعلان جدیدی ندارید.</p>
                ) : (
                    items.map((item) => (
                        <article
                            className={`notification ${
                                item.readAt ? "" : "notification--unread"
                            }`}
                            key={item.id}
                        >
                            <div>
                                <strong>{label(item)}</strong>

                                <time dateTime={item.createdAt}>
                                    {new Date(item.createdAt).toLocaleString(
                                        "fa-IR",
                                    )}
                                </time>

                                {item.actor && (
                                    <Link
                                        className="text-link"
                                        to={`/users/${item.actor.username}`}
                                    >
                                        @{item.actor.username}
                                    </Link>
                                )}
                            </div>

                            {!item.readAt && (
                                <button
                                    className="button button--quiet"
                                    type="button"
                                    onClick={() => void markRead(item.id)}
                                >
                                    خوانده شد
                                </button>
                            )}
                        </article>
                    ))
                )}
            </div>

            {hasMore && nextCursor && (
                <button
                    className="button button--secondary"
                    type="button"
                    disabled={loadingMore}
                    onClick={() => void loadMore()}
                >
                    نمایش اعلان‌های بیشتر
                </button>
            )}
        </main>
    );
}
