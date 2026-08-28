import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import useAuth from "../hooks/useAuth";

import "./NotificationMenu.css";

type InterfaceLanguage = "fa" | "en";

type NotificationType =
  | "FOLLOW"
  | "COMMENT"
  | "COMMENT_REPLY"
  | "CHAPTER_VOTE"
  | "STORY_PUBLISHED"
  | "CHAPTER_PUBLISHED"
  | "MODERATION"
  | "SECURITY";

interface HeaderNotification {
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
    items: HeaderNotification[];
    hasMore: boolean;
    nextCursor: string | null;
  };
}

const COPY = {
  fa: {
    title: "اعلان‌ها",
    open: "باز کردن اعلان‌ها",
    close: "بستن اعلان‌ها",
    unreadCount: (count: number) => `${count} اعلان خوانده‌نشده`,
    markAllRead: "خواندن همه",
    markingAllRead: "در حال ثبت...",
    loading: "در حال دریافت اعلان‌ها...",
    empty: "اعلان جدیدی ندارید.",
    loadError: "دریافت اعلان‌ها ناموفق بود.",
    updateError: "ثبت وضعیت اعلان ناموفق بود.",
    retry: "تلاش دوباره",
    viewAll: "مشاهده همه اعلان‌ها",
    system: "سامانه",
    newNotification: "اعلان جدید",
  },
  en: {
    title: "Notifications",
    open: "Open notifications",
    close: "Close notifications",
    unreadCount: (count: number) =>
      `${count} unread notification${count === 1 ? "" : "s"}`,
    markAllRead: "Mark all as read",
    markingAllRead: "Marking...",
    loading: "Loading notifications...",
    empty: "You have no new notifications.",
    loadError: "Notifications could not be loaded.",
    updateError: "The notification status could not be updated.",
    retry: "Try again",
    viewAll: "View all notifications",
    system: "System",
    newNotification: "New notification",
  },
} as const;

const HEADER_NOTIFICATION_LIMIT = 50;
const VISIBLE_NOTIFICATION_LIMIT = 8;

function stringData(item: HeaderNotification, key: string): string | null {
  const value = item.data[key];

  return typeof value === "string" && value.trim() ? value : null;
}

function notificationLabel(
  item: HeaderNotification,
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

function notificationTarget(item: HeaderNotification): string {
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

export default function NotificationMenu() {
  const { i18n } = useTranslation();
  const { request } = useAuth();

  const language: InterfaceLanguage = i18n.resolvedLanguage
    ?.toLowerCase()
    .startsWith("en")
    ? "en"
    : "fa";

  const copy = COPY[language];
  const locale = language === "fa" ? "fa-IR" : "en-US";
  const direction = language === "fa" ? "rtl" : "ltr";

  const rootRef = useRef<HTMLDivElement>(null);
  const requestSequenceRef = useRef(0);
  const panelId = useId();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<HeaderNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => items.filter((item) => item.readAt === null).length,
    [items],
  );

  const visibleItems = useMemo(
    () => items.slice(0, VISIBLE_NOTIFICATION_LIMIT),
    [items],
  );

  const loadNotifications = useCallback(async (): Promise<void> => {
    if (typeof request !== "function") {
      return;
    }

    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;

    setLoading(true);
    setError(null);

    try {
      const response = await request<NotificationsResponse>(
        `/api/v1/notifications?limit=${HEADER_NOTIFICATION_LIMIT}`,
      );

      if (requestSequence === requestSequenceRef.current) {
        setItems(response.data.items);
      }
    } catch {
      if (requestSequence === requestSequenceRef.current) {
        setError(copy.loadError);
      }
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        setLoading(false);
      }
    }
  }, [copy.loadError, request]);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => {
      window.clearTimeout(initialLoadTimer);
      requestSequenceRef.current += 1;
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;

      if (
        target instanceof Node &&
        rootRef.current &&
        !rootRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const toggleMenu = () => {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    void loadNotifications();
  };

  const markRead = async (notificationId: string): Promise<void> => {
    const notification = items.find((item) => item.id === notificationId);

    if (!notification || notification.readAt) {
      return;
    }

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
      setError(copy.updateError);
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
      setError(copy.updateError);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const badgeText = unreadCount > 9 ? "9+" : String(unreadCount);
  const triggerLabel = open ? copy.close : copy.open;

  return (
    <div
      className="notification-menu"
      ref={rootRef}
      dir={direction}
      lang={language}
    >
      <button
        type="button"
        className="notification-menu__trigger"
        aria-label={
          unreadCount > 0
            ? `${triggerLabel}${
                language === "fa" ? "؛" : ","
              } ${copy.unreadCount(unreadCount)}`
            : triggerLabel
        }
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={toggleMenu}
      >
        <Bell aria-hidden="true" />

        {unreadCount > 0 && (
          <span className="notification-menu__badge" aria-hidden="true">
            {badgeText}
          </span>
        )}
      </button>

      {open && (
        <section
          id={panelId}
          className="notification-menu__panel"
          role="dialog"
          aria-modal="false"
          aria-label={copy.title}
          aria-busy={loading}
        >
          <header className="notification-menu__header">
            <div>
              <h2>{copy.title}</h2>

              {unreadCount > 0 && <span>{copy.unreadCount(unreadCount)}</span>}
            </div>

            <button
              type="button"
              className="notification-menu__mark-all"
              disabled={unreadCount === 0 || markingAllRead}
              onClick={() => void markAllRead()}
            >
              {markingAllRead ? (
                <LoaderCircle
                  className="notification-menu__spinner"
                  aria-hidden="true"
                />
              ) : (
                <CheckCheck aria-hidden="true" />
              )}

              <span>
                {markingAllRead ? copy.markingAllRead : copy.markAllRead}
              </span>
            </button>
          </header>

          {error && (
            <div className="notification-menu__error" role="alert">
              <span>{error}</span>

              <button type="button" onClick={() => void loadNotifications()}>
                {copy.retry}
              </button>
            </div>
          )}

          {loading && items.length === 0 ? (
            <div className="notification-menu__state" role="status">
              <LoaderCircle
                className="notification-menu__spinner"
                aria-hidden="true"
              />

              <span>{copy.loading}</span>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="notification-menu__state">
              <Bell aria-hidden="true" />
              <span>{copy.empty}</span>
            </div>
          ) : (
            <ul className="notification-menu__list">
              {visibleItems.map((item) => {
                const date = formatDate(item.createdAt, locale);

                return (
                  <li key={item.id}>
                    <Link
                      className={`notification-menu__row${
                        item.readAt ? "" : " notification-menu__row--unread"
                      }`}
                      to={notificationTarget(item)}
                      onClick={() => {
                        setOpen(false);
                        void markRead(item.id);
                      }}
                    >
                      <span
                        className="notification-menu__avatar"
                        aria-hidden="true"
                      >
                        {item.actor?.avatarUrl ? (
                          <img src={item.actor.avatarUrl} alt="" />
                        ) : item.actor ? (
                          initials(item.actor.displayName)
                        ) : (
                          <Bell />
                        )}
                      </span>

                      <span className="notification-menu__content">
                        <strong>{notificationLabel(item, language)}</strong>

                        <span className="notification-menu__meta">
                          {item.actor && <span>@{item.actor.username}</span>}

                          {item.actor && date && (
                            <span aria-hidden="true">•</span>
                          )}

                          {date && (
                            <time dateTime={item.createdAt}>{date}</time>
                          )}
                        </span>
                      </span>

                      {!item.readAt && (
                        <span
                          className="notification-menu__unread-dot"
                          aria-label={copy.unreadCount(1)}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <footer className="notification-menu__footer">
            <Link to="/notifications" onClick={() => setOpen(false)}>
              {copy.viewAll}
            </Link>
          </footer>
        </section>
      )}
    </div>
  );
}
