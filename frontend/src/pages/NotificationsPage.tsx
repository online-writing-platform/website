import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import {
  Bell,
  BookOpen,
  Check,
  CheckCheck,
  Inbox,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  RefreshCw,
  Reply,
  ShieldAlert,
  ThumbsUp,
  UserPlus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import useAuth from "../hooks/useAuth";

import "./NotificationsPage.css";

type InterfaceLanguage = "fa" | "en";
type NotificationFilter = "all" | "unread" | "read";
type NotificationError = "load" | "update" | null;

type NotificationType =
  | "FOLLOW"
  | "COMMENT"
  | "COMMENT_REPLY"
  | "CHAPTER_VOTE"
  | "STORY_PUBLISHED"
  | "CHAPTER_PUBLISHED"
  | "MODERATION"
  | "SECURITY";

interface NotificationItem {
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

interface NotificationsResponse {
  data: {
    items: NotificationItem[];
    hasMore: boolean;
    nextCursor: string | null;
  };
}

interface NotificationIconProps {
  size?: number | string;
  "aria-hidden"?: boolean | "true" | "false";
}

const COPY = {
  fa: {
    eyebrow: "حساب کاربری",
    title: "همه اعلان‌ها",
    description:
      "رویدادهای تازه داستان‌ها، فصل‌ها و تعامل‌های حساب شما در این بخش نمایش داده می‌شوند.",
    refresh: "به‌روزرسانی",
    refreshing: "در حال به‌روزرسانی...",
    markAllRead: "خواندن همه",
    markingAllRead: "در حال ثبت...",
    loaded: "بارگذاری‌شده",
    unread: "خوانده‌نشده",
    read: "خوانده‌شده",
    filtersLabel: "فیلتر اعلان‌ها",
    filterAll: "همه",
    filterUnread: "خوانده‌نشده‌ها",
    filterRead: "خوانده‌شده‌ها",
    newBadge: "جدید",
    readStatus: "خوانده‌شده",
    markRead: "خوانده شد",
    markingRead: "در حال ثبت...",
    loading: "در حال دریافت اعلان‌ها...",
    loadError: "دریافت اعلان‌ها ناموفق بود.",
    updateError: "ثبت وضعیت اعلان ناموفق بود.",
    retry: "تلاش دوباره",
    emptyAll: "هنوز اعلانی برای شما ثبت نشده است.",
    emptyUnread: "همه اعلان‌ها را خوانده‌اید.",
    emptyRead: "هنوز اعلان خوانده‌شده‌ای ندارید.",
    loadMore: "نمایش اعلان‌های بیشتر",
    loadingMore: "در حال بارگذاری...",
    system: "سامانه",
    newNotification: "اعلان جدید",
  },
  en: {
    eyebrow: "Account",
    title: "All notifications",
    description:
      "Updates about stories, chapters, and account interactions appear here.",
    refresh: "Refresh",
    refreshing: "Refreshing...",
    markAllRead: "Mark all as read",
    markingAllRead: "Marking...",
    loaded: "Loaded",
    unread: "Unread",
    read: "Read",
    filtersLabel: "Notification filters",
    filterAll: "All",
    filterUnread: "Unread",
    filterRead: "Read",
    newBadge: "New",
    readStatus: "Read",
    markRead: "Mark as read",
    markingRead: "Marking...",
    loading: "Loading notifications...",
    loadError: "Notifications could not be loaded.",
    updateError: "The notification status could not be updated.",
    retry: "Try again",
    emptyAll: "You do not have any notifications yet.",
    emptyUnread: "You have read all your notifications.",
    emptyRead: "You do not have any read notifications yet.",
    loadMore: "Load more notifications",
    loadingMore: "Loading...",
    system: "System",
    newNotification: "New notification",
  },
} as const;

const PAGE_SIZE = 50;

const NOTIFICATION_ICONS: Partial<
  Record<NotificationType, ComponentType<NotificationIconProps>>
> = {
  FOLLOW: UserPlus,
  COMMENT: MessageCircle,
  COMMENT_REPLY: Reply,
  CHAPTER_VOTE: ThumbsUp,
  STORY_PUBLISHED: BookOpen,
  CHAPTER_PUBLISHED: BookOpen,
  MODERATION: ShieldAlert,
  SECURITY: LockKeyhole,
};

function stringData(item: NotificationItem, key: string): string | null {
  const value = item.data[key];

  return typeof value === "string" && value.trim() ? value : null;
}

function notificationLabel(
  item: NotificationItem,
  language: InterfaceLanguage,
): string {
  const copy = COPY[language];
  const actor = item.actor?.displayName ?? copy.system;
  const storyTitle = stringData(item, "storyTitle");
  const chapterTitle = stringData(item, "chapterTitle");

  if (language === "en") {
    switch (item.type) {
      case "FOLLOW":
        return `${actor} followed you.`;

      case "COMMENT":
        return `${actor} commented on your chapter.`;

      case "COMMENT_REPLY":
        return `${actor} replied to your comment.`;

      case "CHAPTER_VOTE":
        return `${actor} voted for your chapter.`;

      case "STORY_PUBLISHED":
        return storyTitle
          ? `The story “${storyTitle}” was published.`
          : "A new story was published.";

      case "CHAPTER_PUBLISHED":
        return chapterTitle
          ? `The chapter “${chapterTitle}” was published.`
          : storyTitle
            ? `A new chapter of “${storyTitle}” was published.`
            : "A new chapter was published.";

      case "MODERATION":
        return "A moderation event was recorded for your account or content.";

      case "SECURITY":
        return "A security event was recorded for your account.";

      default:
        return copy.newNotification;
    }
  }

  switch (item.type) {
    case "FOLLOW":
      return `${actor} شما را دنبال کرد.`;

    case "COMMENT":
      return `${actor} برای فصل شما نظر نوشت.`;

    case "COMMENT_REPLY":
      return `${actor} به نظر شما پاسخ داد.`;

    case "CHAPTER_VOTE":
      return `${actor} به فصل شما رأی داد.`;

    case "STORY_PUBLISHED":
      return storyTitle
        ? `داستان «${storyTitle}» منتشر شد.`
        : "داستان تازه‌ای منتشر شد.";

    case "CHAPTER_PUBLISHED":
      return chapterTitle
        ? `فصل «${chapterTitle}» منتشر شد.`
        : storyTitle
          ? `فصل تازه‌ای از «${storyTitle}» منتشر شد.`
          : "فصل تازه‌ای منتشر شد.";

    case "MODERATION":
      return "یک رویداد مدیریتی برای حساب یا محتوای شما ثبت شد.";

    case "SECURITY":
      return "یک رویداد امنیتی برای حساب شما ثبت شد.";

    default:
      return copy.newNotification;
  }
}

function notificationTarget(item: NotificationItem): string {
  const storySlug = stringData(item, "storySlug");
  const chapterId = stringData(item, "chapterId");

  if (storySlug && chapterId) {
    return `/stories/${encodeURIComponent(
      storySlug,
    )}/chapters/${encodeURIComponent(chapterId)}`;
  }

  if (item.type === "SECURITY") {
    return "/settings";
  }

  if (
    item.actor &&
    (item.type === "FOLLOW" ||
      item.type === "STORY_PUBLISHED" ||
      item.type === "CHAPTER_PUBLISHED")
  ) {
    return `/users/${encodeURIComponent(item.actor.username)}`;
  }

  return "/notifications";
}

function notificationTone(type: string): string {
  switch (type) {
    case "FOLLOW":
      return "social";

    case "COMMENT":
    case "COMMENT_REPLY":
      return "comment";

    case "CHAPTER_VOTE":
      return "vote";

    case "STORY_PUBLISHED":
    case "CHAPTER_PUBLISHED":
      return "publication";

    case "MODERATION":
    case "SECURITY":
      return "security";

    default:
      return "default";
  }
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

function formatDate(value: string, locale: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function NotificationAvatar({ item }: { item: NotificationItem }) {
  const Icon = NOTIFICATION_ICONS[item.type as NotificationType] ?? Bell;

  const tone = notificationTone(item.type);

  return (
    <span
      className={`notifications-page__avatar notifications-page__avatar--${tone}`}
      aria-hidden="true"
    >
      {item.actor?.avatarUrl ? (
        <img src={item.actor.avatarUrl} alt="" />
      ) : item.actor ? (
        initials(item.actor.displayName)
      ) : (
        <Icon />
      )}
    </span>
  );
}

export default function NotificationsPage() {
  const { request } = useAuth();
  const { i18n } = useTranslation();

  const language: InterfaceLanguage = i18n.resolvedLanguage
    ?.toLowerCase()
    .startsWith("en")
    ? "en"
    : "fa";

  const copy = COPY[language];
  const direction = language === "fa" ? "rtl" : "ltr";
  const locale = language === "fa" ? "fa-IR" : "en-US";

  const firstPageRequestRef = useRef(0);

  const [items, setItems] = useState<NotificationItem[]>([]);

  const [filter, setFilter] = useState<NotificationFilter>("all");

  const [hasMore, setHasMore] = useState(false);

  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [loadingInitial, setLoadingInitial] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [loadingMore, setLoadingMore] = useState(false);

  const [markingAllRead, setMarkingAllRead] = useState(false);

  const [markingIds, setMarkingIds] = useState<Set<string>>(() => new Set());

  const [error, setError] = useState<NotificationError>(null);

  const unreadCount = useMemo(
    () => items.filter((item) => item.readAt === null).length,
    [items],
  );

  const readCount = items.length - unreadCount;

  const visibleItems = useMemo(() => {
    if (filter === "unread") {
      return items.filter((item) => item.readAt === null);
    }

    if (filter === "read") {
      return items.filter((item) => item.readAt !== null);
    }

    return items;
  }, [filter, items]);

  const fetchFirstPage = useCallback(
    async (isRefresh: boolean): Promise<void> => {
      const requestSequence = firstPageRequestRef.current + 1;

      firstPageRequestRef.current = requestSequence;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoadingInitial(true);
      }

      setError(null);

      try {
        const response = await request<NotificationsResponse>(
          `/api/v1/notifications?limit=${PAGE_SIZE}`,
        );

        if (requestSequence !== firstPageRequestRef.current) {
          return;
        }

        setItems(response.data.items);
        setHasMore(response.data.hasMore);
        setNextCursor(response.data.nextCursor);
      } catch {
        if (requestSequence === firstPageRequestRef.current) {
          setError("load");
        }
      } finally {
        if (requestSequence === firstPageRequestRef.current) {
          setLoadingInitial(false);
          setRefreshing(false);
        }
      }
    },
    [request],
  );

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void fetchFirstPage(false);
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
      firstPageRequestRef.current += 1;
    };
  }, [fetchFirstPage]);

  const loadMore = async (): Promise<void> => {
    if (!hasMore || !nextCursor || loadingMore || refreshing) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const response = await request<NotificationsResponse>(
        `/api/v1/notifications?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(
          nextCursor,
        )}`,
      );

      setItems((current) => {
        const existingIds = new Set(current.map((item) => item.id));

        const newItems = response.data.items.filter(
          (item) => !existingIds.has(item.id),
        );

        return [...current, ...newItems];
      });

      setHasMore(response.data.hasMore);
      setNextCursor(response.data.nextCursor);
    } catch {
      setError("load");
    } finally {
      setLoadingMore(false);
    }
  };

  const markRead = async (notificationId: string): Promise<void> => {
    const notification = items.find((item) => item.id === notificationId);

    if (
      !notification ||
      notification.readAt ||
      markingIds.has(notificationId)
    ) {
      return;
    }

    setMarkingIds((current) => {
      const next = new Set(current);
      next.add(notificationId);
      return next;
    });

    setError(null);

    try {
      await request(`/api/v1/notifications/${notificationId}/read`, {
        method: "POST",
      });

      setItems((current) =>
        current.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                readAt: new Date().toISOString(),
              }
            : item,
        ),
      );
    } catch {
      setError("update");
    } finally {
      setMarkingIds((current) => {
        const next = new Set(current);
        next.delete(notificationId);
        return next;
      });
    }
  };

  const markAllRead = async (): Promise<void> => {
    if (unreadCount === 0 || markingAllRead) {
      return;
    }

    setMarkingAllRead(true);
    setError(null);

    try {
      await request("/api/v1/notifications/read-all", {
        method: "POST",
      });

      const readAt = new Date().toISOString();

      setItems((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt ?? readAt,
        })),
      );
    } catch {
      setError("update");
    } finally {
      setMarkingAllRead(false);
    }
  };

  const emptyMessage =
    filter === "unread"
      ? copy.emptyUnread
      : filter === "read"
        ? copy.emptyRead
        : copy.emptyAll;

  const loadedCount = `${items.length}${hasMore ? "+" : ""}`;

  const filters: Array<{
    value: NotificationFilter;
    label: string;
    count: string | number;
  }> = [
    {
      value: "all",
      label: copy.filterAll,
      count: loadedCount,
    },
    {
      value: "unread",
      label: copy.filterUnread,
      count: unreadCount,
    },
    {
      value: "read",
      label: copy.filterRead,
      count: readCount,
    },
  ];

  return (
    <main className="notifications-page" dir={direction} lang={language}>
      <section className="notifications-page__hero">
        <div className="notifications-page__heading">
          <span className="notifications-page__heading-icon">
            <Bell aria-hidden="true" />

            {unreadCount > 0 && (
              <span aria-hidden="true">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </span>

          <div>
            <p>{copy.eyebrow}</p>

            <h1>{copy.title}</h1>

            <span>{copy.description}</span>
          </div>
        </div>

        <div className="notifications-page__hero-actions">
          <button
            type="button"
            className="notifications-page__button notifications-page__button--secondary"
            disabled={refreshing || loadingInitial || loadingMore}
            onClick={() => void fetchFirstPage(true)}
          >
            <RefreshCw
              className={refreshing ? "is-spinning" : undefined}
              aria-hidden="true"
            />

            <span>{refreshing ? copy.refreshing : copy.refresh}</span>
          </button>

          <button
            type="button"
            className="notifications-page__button notifications-page__button--primary"
            disabled={unreadCount === 0 || markingAllRead}
            onClick={() => void markAllRead()}
          >
            {markingAllRead ? (
              <LoaderCircle className="is-spinning" aria-hidden="true" />
            ) : (
              <CheckCheck aria-hidden="true" />
            )}

            <span>
              {markingAllRead ? copy.markingAllRead : copy.markAllRead}
            </span>
          </button>
        </div>
      </section>

      <section className="notifications-page__summary" aria-label={copy.title}>
        <article>
          <span>{copy.loaded}</span>
          <strong>{loadedCount}</strong>
        </article>

        <article className="notifications-page__summary--unread">
          <span>{copy.unread}</span>
          <strong>{unreadCount}</strong>
        </article>

        <article className="notifications-page__summary--read">
          <span>{copy.read}</span>
          <strong>{readCount}</strong>
        </article>
      </section>

      <section className="notifications-page__panel">
        <header className="notifications-page__toolbar">
          <div
            className="notifications-page__filters"
            role="group"
            aria-label={copy.filtersLabel}
          >
            {filters.map((item) => (
              <button
                type="button"
                key={item.value}
                className={filter === item.value ? "is-active" : undefined}
                aria-pressed={filter === item.value}
                onClick={() => setFilter(item.value)}
              >
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </button>
            ))}
          </div>
        </header>

        {error && (
          <div className="notifications-page__error" role="alert">
            <span>{error === "load" ? copy.loadError : copy.updateError}</span>

            {error === "load" && (
              <button
                type="button"
                onClick={() => void fetchFirstPage(items.length > 0)}
              >
                {copy.retry}
              </button>
            )}
          </div>
        )}

        {loadingInitial && items.length === 0 ? (
          <div
            className="notifications-page__loading"
            role="status"
            aria-label={copy.loading}
          >
            {[1, 2, 3, 4].map((item) => (
              <div className="notifications-page__skeleton" key={item}>
                <span />

                <div>
                  <span />
                  <span />
                </div>
              </div>
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="notifications-page__empty">
            <span>
              <Inbox aria-hidden="true" />
            </span>

            <h2>{emptyMessage}</h2>
          </div>
        ) : (
          <div className="notifications-page__list" aria-live="polite">
            {visibleItems.map((item) => {
              const isUnread = item.readAt === null;

              const isMarking = markingIds.has(item.id);

              const formattedDate = formatDate(item.createdAt, locale);

              return (
                <article
                  className={`notifications-page__item${
                    isUnread ? " notifications-page__item--unread" : ""
                  }`}
                  key={item.id}
                >
                  <Link
                    className="notifications-page__item-main"
                    to={notificationTarget(item)}
                    onClick={() => void markRead(item.id)}
                  >
                    <NotificationAvatar item={item} />

                    <span className="notifications-page__item-content">
                      <span className="notifications-page__item-title">
                        <strong>{notificationLabel(item, language)}</strong>

                        {isUnread && <small>{copy.newBadge}</small>}
                      </span>

                      <span className="notifications-page__item-meta">
                        {item.actor && <span>@{item.actor.username}</span>}

                        {item.actor && formattedDate && (
                          <span aria-hidden="true">•</span>
                        )}

                        {formattedDate && (
                          <time dateTime={item.createdAt}>{formattedDate}</time>
                        )}
                      </span>
                    </span>
                  </Link>

                  {isUnread ? (
                    <button
                      type="button"
                      className="notifications-page__read-button"
                      disabled={isMarking}
                      onClick={() => void markRead(item.id)}
                    >
                      {isMarking ? (
                        <LoaderCircle
                          className="is-spinning"
                          aria-hidden="true"
                        />
                      ) : (
                        <Check aria-hidden="true" />
                      )}

                      <span>
                        {isMarking ? copy.markingRead : copy.markRead}
                      </span>
                    </button>
                  ) : (
                    <span className="notifications-page__read-status">
                      <Check aria-hidden="true" />

                      <span>{copy.readStatus}</span>
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {hasMore && nextCursor && !loadingInitial && (
          <footer className="notifications-page__load-more">
            <button
              type="button"
              disabled={loadingMore || refreshing}
              onClick={() => void loadMore()}
            >
              {loadingMore && (
                <LoaderCircle className="is-spinning" aria-hidden="true" />
              )}

              <span>{loadingMore ? copy.loadingMore : copy.loadMore}</span>
            </button>
          </footer>
        )}
      </section>
    </main>
  );
}
