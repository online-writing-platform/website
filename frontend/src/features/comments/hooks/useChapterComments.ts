import { useCallback, useEffect, useRef, useState } from "react";

import type { AuthStatus } from "../../../context/AuthContext";
import { apiRequest } from "../../../lib/api";
import { getErrorMessage } from "../../../lib/error-message";
import {
  createChapterComment,
  deleteChapterComment,
  getChapterComments,
  getComment,
  getCommentReplies,
  type CommentRequester,
  updateChapterComment,
} from "../api";
import type { ChapterComment, ReplyPage } from "../types";

const EMPTY_REPLY_PAGE: ReplyPage = {
  items: [],
  hasMore: false,
  nextCursor: null,
  loaded: false,
  loadingInitial: false,
  loadingMore: false,
  initialError: null,
  loadMoreError: null,
};

function mergeComments(
  current: ChapterComment[],
  incoming: ChapterComment[],
  direction: "asc" | "desc",
): ChapterComment[] {
  const byId = new Map(current.map((item) => [item.id, item]));

  for (const item of incoming) {
    byId.set(item.id, item);
  }

  return [...byId.values()].sort((first, second) => {
    const dateDifference =
      new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
    const stableDifference = dateDifference || first.id.localeCompare(second.id);

    return direction === "asc" ? stableDifference : -stableDifference;
  });
}

function replaceComment(
  items: ChapterComment[],
  replacement: ChapterComment,
): ChapterComment[] {
  return items.map((item) =>
    item.id === replacement.id ? replacement : item,
  );
}

interface UseChapterCommentsOptions {
  chapterId: string;
  status: AuthStatus;
  request: CommentRequester;
  pageSize?: number;
}

export default function useChapterComments({
  chapterId,
  status,
  request,
  pageSize = 20,
}: UseChapterCommentsOptions) {
  const requestSequenceRef = useRef(0);
  const [comments, setComments] = useState<ChapterComment[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [replyPages, setReplyPages] = useState<Record<string, ReplyPage>>({});
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [mutationErrors, setMutationErrors] = useState<Record<string, string>>(
    {},
  );
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(() => new Set());

  const readRequest: CommentRequester =
    status === "authenticated" ? request : apiRequest;

  const setPending = useCallback((key: string, pending: boolean): void => {
    setPendingKeys((current) => {
      const next = new Set(current);

      if (pending) next.add(key);
      else next.delete(key);

      return next;
    });
  }, []);

  const clearMutationError = useCallback((key: string): void => {
    setMutationErrors((current) => {
      if (!(key in current)) return current;

      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const setMutationFailure = useCallback((key: string, cause: unknown): void => {
    setMutationErrors((current) => ({
      ...current,
      [key]: getErrorMessage(cause),
    }));
  }, []);

  const loadFirstPage = useCallback(async (): Promise<void> => {
    const sequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = sequence;
    setLoadingInitial(true);
    setInitialLoadError(null);
    setLoadMoreError(null);

    try {
      const response = await getChapterComments(readRequest, chapterId, {
        limit: pageSize,
      });

      if (sequence !== requestSequenceRef.current) return;

      setComments(response.data.comments);
      setHasMore(response.data.pagination.hasMore);
      setNextCursor(response.data.pagination.nextCursor);
      setReplyPages({});
    } catch (cause) {
      if (sequence === requestSequenceRef.current) {
        setComments([]);
        setHasMore(false);
        setNextCursor(null);
        setInitialLoadError(getErrorMessage(cause));
      }
    } finally {
      if (sequence === requestSequenceRef.current) {
        setLoadingInitial(false);
      }
    }
  }, [chapterId, pageSize, readRequest]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFirstPage();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      requestSequenceRef.current += 1;
    };
  }, [loadFirstPage]);

  const loadMoreComments = useCallback(async (): Promise<void> => {
    if (!hasMore || !nextCursor || loadingMore) return;

    setLoadingMore(true);
    setLoadMoreError(null);

    try {
      const response = await getChapterComments(readRequest, chapterId, {
        limit: pageSize,
        cursor: nextCursor,
      });
      setComments((current) =>
        mergeComments(current, response.data.comments, "desc"),
      );
      setHasMore(response.data.pagination.hasMore);
      setNextCursor(response.data.pagination.nextCursor);
    } catch (cause) {
      setLoadMoreError(getErrorMessage(cause));
    } finally {
      setLoadingMore(false);
    }
  }, [chapterId, hasMore, loadingMore, nextCursor, pageSize, readRequest]);

  const loadReplies = useCallback(
    async (parentId: string, append = false): Promise<void> => {
      const currentPage = replyPages[parentId] ?? EMPTY_REPLY_PAGE;

      if (
        currentPage.loadingInitial ||
        currentPage.loadingMore ||
        (!append && currentPage.loaded) ||
        (append && (!currentPage.hasMore || !currentPage.nextCursor))
      ) {
        return;
      }

      setReplyPages((current) => ({
        ...current,
        [parentId]: {
          ...(current[parentId] ?? EMPTY_REPLY_PAGE),
          loadingInitial: !append,
          loadingMore: append,
          initialError: append
            ? (current[parentId] ?? EMPTY_REPLY_PAGE).initialError
            : null,
          loadMoreError: append
            ? null
            : (current[parentId] ?? EMPTY_REPLY_PAGE).loadMoreError,
        },
      }));

      try {
        const response = await getCommentReplies(readRequest, chapterId, parentId, {
          limit: pageSize,
          cursor: append ? currentPage.nextCursor : null,
        });

        setReplyPages((current) => {
          const previous = current[parentId] ?? EMPTY_REPLY_PAGE;

          return {
            ...current,
            [parentId]: {
              items: mergeComments(
                append ? previous.items : [],
                response.data.comments,
                "asc",
              ),
              hasMore: response.data.pagination.hasMore,
              nextCursor: response.data.pagination.nextCursor,
              loaded: true,
              loadingInitial: false,
              loadingMore: false,
              initialError: null,
              loadMoreError: null,
            },
          };
        });
      } catch (cause) {
        setReplyPages((current) => {
          const previous = current[parentId] ?? EMPTY_REPLY_PAGE;
          const message = getErrorMessage(cause);

          return {
            ...current,
            [parentId]: {
              ...previous,
              loaded: append ? previous.loaded : false,
              loadingInitial: false,
              loadingMore: false,
              initialError: append ? previous.initialError : message,
              loadMoreError: append ? message : previous.loadMoreError,
            },
          };
        });
      }
    },
    [chapterId, pageSize, readRequest, replyPages],
  );

  const createComment = useCallback(
    async (content: string, parentId?: string): Promise<boolean> => {
      if (status !== "authenticated") return false;

      const key = parentId ? `reply:${parentId}` : "create:root";
      if (pendingKeys.has(key)) return false;

      setPending(key, true);
      clearMutationError(key);

      try {
        const response = await createChapterComment(
          request,
          chapterId,
          content,
          parentId,
        );
        const created = response.data.comment;

        if (parentId) {
          setReplyPages((current) => {
            const page = current[parentId] ?? EMPTY_REPLY_PAGE;

            return {
              ...current,
              [parentId]: {
                ...page,
                items: mergeComments(page.items, [created], "asc"),
                loaded: true,
                initialError: null,
                loadMoreError: null,
              },
            };
          });
          setComments((current) =>
            current.map((item) =>
              item.id === parentId
                ? { ...item, replyCount: item.replyCount + 1 }
                : item,
            ),
          );
        } else {
          setComments((current) => mergeComments(current, [created], "desc"));
        }

        return true;
      } catch (cause) {
        setMutationFailure(key, cause);
        return false;
      } finally {
        setPending(key, false);
      }
    },
    [
      chapterId,
      clearMutationError,
      pendingKeys,
      request,
      setMutationFailure,
      setPending,
      status,
    ],
  );

  const updateComment = useCallback(
    async (commentId: string, content: string): Promise<boolean> => {
      const key = `update:${commentId}`;
      if (status !== "authenticated" || pendingKeys.has(key)) return false;

      setPending(key, true);
      clearMutationError(key);

      try {
        const response = await updateChapterComment(request, commentId, content);
        const updated = response.data.comment;
        setComments((current) => replaceComment(current, updated));
        setReplyPages((current) =>
          Object.fromEntries(
            Object.entries(current).map(([parentId, page]) => [
              parentId,
              { ...page, items: replaceComment(page.items, updated) },
            ]),
          ),
        );
        return true;
      } catch (cause) {
        setMutationFailure(key, cause);
        return false;
      } finally {
        setPending(key, false);
      }
    },
    [
      clearMutationError,
      pendingKeys,
      request,
      setMutationFailure,
      setPending,
      status,
    ],
  );

  const removeComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      const key = `delete:${commentId}`;
      if (status !== "authenticated" || pendingKeys.has(key)) return false;

      setPending(key, true);
      clearMutationError(key);

      try {
        await deleteChapterComment(request, commentId);
        const markDeleted = (item: ChapterComment): ChapterComment =>
          item.id === commentId
            ? {
                ...item,
                content: "",
                status: "DELETED",
                author: null,
                updatedAt: new Date().toISOString(),
              }
            : item;

        setComments((current) => current.map(markDeleted));
        setReplyPages((current) =>
          Object.fromEntries(
            Object.entries(current).map(([parentId, page]) => [
              parentId,
              { ...page, items: page.items.map(markDeleted) },
            ]),
          ),
        );
        return true;
      } catch (cause) {
        setMutationFailure(key, cause);
        return false;
      } finally {
        setPending(key, false);
      }
    },
    [
      clearMutationError,
      pendingKeys,
      request,
      setMutationFailure,
      setPending,
      status,
    ],
  );

  const revealComment = useCallback(
    async (commentId: string): Promise<string> => {
      const targetResponse = await getComment(readRequest, chapterId, commentId);
      const target = targetResponse.data.comment;

      if (!target.parentId) {
        setComments((current) => mergeComments(current, [target], "desc"));
        return target.id;
      }

      const resolvedParentId = target.parentId;
      const [rootResponse, pageResponse] = await Promise.all([
        getComment(readRequest, chapterId, resolvedParentId),
        getCommentReplies(readRequest, chapterId, resolvedParentId, {
          limit: pageSize,
        }),
      ]);
      setComments((current) =>
        mergeComments(current, [rootResponse.data.comment], "desc"),
      );
      setReplyPages((current) => ({
        ...current,
        [resolvedParentId]: {
          items: mergeComments(
            pageResponse.data.comments,
            [target],
            "asc",
          ),
          hasMore: pageResponse.data.pagination.hasMore,
          nextCursor: pageResponse.data.pagination.nextCursor,
          loaded: true,
          loadingInitial: false,
          loadingMore: false,
          initialError: null,
          loadMoreError: null,
        },
      }));

      return resolvedParentId;
    },
    [chapterId, pageSize, readRequest],
  );

  return {
    comments,
    hasMore,
    replyPages,
    loadingInitial,
    loadingMore,
    initialLoadError,
    loadMoreError,
    mutationErrors,
    pendingKeys,
    clearMutationError,
    loadFirstPage,
    loadMoreComments,
    loadReplies,
    createComment,
    updateComment,
    removeComment,
    revealComment,
  };
}
