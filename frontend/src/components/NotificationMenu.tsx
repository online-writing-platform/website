import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import useNotifications from "../features/notifications/hooks/useNotifications";
import {
  formatNotificationDate,
  getInitials,
  getNotificationLabel,
  getNotificationTarget,
} from "../features/notifications/presentation";
import useAuth from "../hooks/useAuth";
import useInterfaceLocale from "../hooks/useInterfaceLocale";

import "./NotificationMenu.css";

const HEADER_NOTIFICATION_LIMIT = 50;
const VISIBLE_NOTIFICATION_LIMIT = 8;

export default function NotificationMenu() {
  const { request } = useAuth();
  const { t } = useTranslation();
  const { language, direction, locale } = useInterfaceLocale();
  const copy = {
    title: t("notifications.menu.title"),
    open: t("notifications.menu.open"),
    close: t("notifications.menu.close"),
    unreadCount: (count: number) =>
      t("notifications.common.unreadCount", { count }),
    markAllRead: t("notifications.common.markAllRead"),
    markingAllRead: t("notifications.common.markingAllRead"),
    loading: t("notifications.common.loading"),
    empty: t("notifications.menu.empty"),
    loadError: t("notifications.common.loadError"),
    updateError: t("notifications.common.updateError"),
    retry: t("notifications.common.retry"),
    viewAll: t("notifications.menu.viewAll"),
  };
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);

  const {
    items,
    loadingInitial,
    refreshing,
    markingAllRead,
    error,
    unreadCount,
    fetchFirstPage,
    markRead,
    markAllRead,
  } = useNotifications({
    request,
    pageSize: HEADER_NOTIFICATION_LIMIT,
  });

  const visibleItems = useMemo(
    () => items.slice(0, VISIBLE_NOTIFICATION_LIMIT),
    [items],
  );
  const loading = loadingInitial || refreshing;

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
    void fetchFirstPage(true);
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
        {unreadCount > 0 ? (
          <span className="notification-menu__badge" aria-hidden="true">
            {badgeText}
          </span>
        ) : null}
      </button>

      {open ? (
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
              {unreadCount > 0 ? <span>{copy.unreadCount(unreadCount)}</span> : null}
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
              <span>{markingAllRead ? copy.markingAllRead : copy.markAllRead}</span>
            </button>
          </header>

          {error ? (
            <div className="notification-menu__error" role="alert">
              <span>{error === "load" ? copy.loadError : copy.updateError}</span>
              <button type="button" onClick={() => void fetchFirstPage(true)}>
                {copy.retry}
              </button>
            </div>
          ) : null}

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
                const date = formatNotificationDate(item.createdAt, locale);

                return (
                  <li key={item.id}>
                    <Link
                      className={`notification-menu__row${
                        item.readAt ? "" : " notification-menu__row--unread"
                      }`}
                      to={getNotificationTarget(item)}
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
                          getInitials(item.actor.displayName)
                        ) : (
                          <Bell />
                        )}
                      </span>

                      <span className="notification-menu__content">
                        <strong>{getNotificationLabel(item, t)}</strong>
                        <span className="notification-menu__meta">
                          {item.actor ? <span>@{item.actor.username}</span> : null}
                          {item.actor && date ? <span aria-hidden="true">•</span> : null}
                          {date ? (
                            <time dateTime={item.createdAt}>{date}</time>
                          ) : null}
                        </span>
                      </span>

                      {!item.readAt ? (
                        <span
                          className="notification-menu__unread-dot"
                          aria-label={copy.unreadCount(1)}
                        />
                      ) : null}
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
      ) : null}
    </div>
  );
}
