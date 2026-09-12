import { useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  Inbox,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import NotificationListItem from "../features/notifications/components/NotificationListItem";
import useNotifications from "../features/notifications/hooks/useNotifications";
import type { NotificationFilter } from "../features/notifications/types";
import useAuth from "../hooks/useAuth";
import useInterfaceLocale from "../hooks/useInterfaceLocale";

import "./NotificationsPage.css";

const PAGE_SIZE = 50;

export default function NotificationsPage() {
  const { request } = useAuth();
  const { t } = useTranslation();
  const { language, direction, locale } = useInterfaceLocale();
  const copy = {
    eyebrow: t("notifications.page.eyebrow"),
    title: t("notifications.page.title"),
    description: t("notifications.page.description"),
    refresh: t("notifications.page.refresh"),
    refreshing: t("notifications.page.refreshing"),
    markAllRead: t("notifications.common.markAllRead"),
    markingAllRead: t("notifications.common.markingAllRead"),
    loaded: t("notifications.page.loaded"),
    unread: t("notifications.page.unread"),
    read: t("notifications.page.read"),
    filtersLabel: t("notifications.page.filtersLabel"),
    filterAll: t("notifications.page.filterAll"),
    filterUnread: t("notifications.page.filterUnread"),
    filterRead: t("notifications.page.filterRead"),
    newBadge: t("notifications.page.newBadge"),
    readStatus: t("notifications.page.readStatus"),
    markRead: t("notifications.page.markRead"),
    markingRead: t("notifications.page.markingRead"),
    loading: t("notifications.common.loading"),
    loadError: t("notifications.common.loadError"),
    updateError: t("notifications.common.updateError"),
    retry: t("notifications.common.retry"),
    emptyAll: t("notifications.page.emptyAll"),
    emptyUnread: t("notifications.page.emptyUnread"),
    emptyRead: t("notifications.page.emptyRead"),
    loadMore: t("notifications.page.loadMore"),
    loadingMore: t("notifications.page.loadingMore"),
  };
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const {
    items,
    hasMore,
    nextCursor,
    loadingInitial,
    refreshing,
    loadingMore,
    markingAllRead,
    markingIds,
    error,
    unreadCount,
    fetchFirstPage,
    loadMore,
    markRead,
    markAllRead,
  } = useNotifications({ request, pageSize: PAGE_SIZE });

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
    { value: "all", label: copy.filterAll, count: loadedCount },
    { value: "unread", label: copy.filterUnread, count: unreadCount },
    { value: "read", label: copy.filterRead, count: readCount },
  ];

  return (
    <main className="notifications-page" dir={direction} lang={language}>
      <section className="notifications-page__hero">
        <div className="notifications-page__heading">
          <span className="notifications-page__heading-icon">
            <Bell aria-hidden="true" />
            {unreadCount > 0 ? (
              <span aria-hidden="true">{unreadCount > 99 ? "99+" : unreadCount}</span>
            ) : null}
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
            <span>{markingAllRead ? copy.markingAllRead : copy.markAllRead}</span>
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

        {error ? (
          <div className="notifications-page__error" role="alert">
            <span>{error === "load" ? copy.loadError : copy.updateError}</span>
            {error === "load" ? (
              <button
                type="button"
                onClick={() => void fetchFirstPage(items.length > 0)}
              >
                {copy.retry}
              </button>
            ) : null}
          </div>
        ) : null}

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
            {visibleItems.map((item) => (
              <NotificationListItem
                key={item.id}
                item={item}
                locale={locale}
                isMarking={markingIds.has(item.id)}
                labels={copy}
                onMarkRead={(id) => void markRead(id)}
              />
            ))}
          </div>
        )}

        {hasMore && nextCursor && !loadingInitial ? (
          <footer className="notifications-page__load-more">
            <button
              type="button"
              disabled={loadingMore || refreshing}
              onClick={() => void loadMore()}
            >
              {loadingMore ? (
                <LoaderCircle className="is-spinning" aria-hidden="true" />
              ) : null}
              <span>{loadingMore ? copy.loadingMore : copy.loadMore}</span>
            </button>
          </footer>
        ) : null}
      </section>
    </main>
  );
}
