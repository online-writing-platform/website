import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { AuthContextValue } from "../../../context/AuthContext";
import {
  getNotifications,
  markEveryNotificationRead,
  markNotificationRead,
} from "../api";
import type { NotificationError, NotificationItem } from "../types";

interface UseNotificationsOptions {
  request: AuthContextValue["request"] | undefined;
  pageSize?: number;
}

export default function useNotifications({
  request,
  pageSize = 50,
}: UseNotificationsOptions) {
  const requestSequenceRef = useRef(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
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

  const fetchFirstPage = useCallback(
    async (isRefresh = false): Promise<void> => {
      if (typeof request !== "function") {
        setLoadingInitial(false);
        return;
      }

      const sequence = requestSequenceRef.current + 1;
      requestSequenceRef.current = sequence;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoadingInitial(true);
      }

      setError(null);

      try {
        const response = await getNotifications(request, { limit: pageSize });

        if (sequence !== requestSequenceRef.current) {
          return;
        }

        setItems(response.data.items);
        setHasMore(response.data.hasMore);
        setNextCursor(response.data.nextCursor);
      } catch {
        if (sequence === requestSequenceRef.current) {
          setError("load");
        }
      } finally {
        if (sequence === requestSequenceRef.current) {
          setLoadingInitial(false);
          setRefreshing(false);
        }
      }
    },
    [pageSize, request],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchFirstPage(false);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      requestSequenceRef.current += 1;
    };
  }, [fetchFirstPage]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (
      typeof request !== "function" ||
      !hasMore ||
      !nextCursor ||
      loadingMore ||
      refreshing
    ) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const response = await getNotifications(request, {
        limit: pageSize,
        cursor: nextCursor,
      });

      setItems((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        const additions = response.data.items.filter(
          (item) => !existingIds.has(item.id),
        );

        return [...current, ...additions];
      });
      setHasMore(response.data.hasMore);
      setNextCursor(response.data.nextCursor);
    } catch {
      setError("load");
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextCursor, pageSize, refreshing, request]);

  const markRead = useCallback(
    async (notificationId: string): Promise<void> => {
      if (typeof request !== "function") {
        return;
      }

      const notification = items.find((item) => item.id === notificationId);

      if (!notification || notification.readAt || markingIds.has(notificationId)) {
        return;
      }

      setMarkingIds((current) => new Set(current).add(notificationId));
      setError(null);

      try {
        await markNotificationRead(request, notificationId);
        const readAt = new Date().toISOString();

        setItems((current) =>
          current.map((item) =>
            item.id === notificationId ? { ...item, readAt } : item,
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
    },
    [items, markingIds, request],
  );

  const markAllRead = useCallback(async (): Promise<void> => {
    if (
      typeof request !== "function" ||
      unreadCount === 0 ||
      markingAllRead
    ) {
      return;
    }

    setMarkingAllRead(true);
    setError(null);

    try {
      await markEveryNotificationRead(request);
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
  }, [markingAllRead, request, unreadCount]);

  return {
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
  };
}
