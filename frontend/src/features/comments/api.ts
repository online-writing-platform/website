import type { AuthContextValue } from "../../context/AuthContext";
import type { CommentPageResponse, CommentResponse } from "./types";

export type CommentRequester = AuthContextValue["request"];

function encodeId(value: string): string {
  return encodeURIComponent(value);
}

function paginationQuery(limit: number, cursor?: string | null): string {
  const search = new URLSearchParams({ limit: String(limit) });

  if (cursor) {
    search.set("cursor", cursor);
  }

  return search.toString();
}

export function getChapterComments(
  request: CommentRequester,
  chapterId: string,
  options: { limit: number; cursor?: string | null },
): Promise<CommentPageResponse> {
  return request<CommentPageResponse>(
    `/api/v1/chapters/${encodeId(chapterId)}/comments?${paginationQuery(
      options.limit,
      options.cursor,
    )}`,
  );
}

export function getComment(
  request: CommentRequester,
  chapterId: string,
  commentId: string,
): Promise<CommentResponse> {
  return request<CommentResponse>(
    `/api/v1/chapters/${encodeId(chapterId)}/comments/${encodeId(commentId)}`,
  );
}

export function getCommentReplies(
  request: CommentRequester,
  chapterId: string,
  parentId: string,
  options: { limit: number; cursor?: string | null },
): Promise<CommentPageResponse> {
  return request<CommentPageResponse>(
    `/api/v1/chapters/${encodeId(chapterId)}/comments/${encodeId(
      parentId,
    )}/replies?${paginationQuery(options.limit, options.cursor)}`,
  );
}

export function createChapterComment(
  request: CommentRequester,
  chapterId: string,
  content: string,
  parentId?: string,
): Promise<CommentResponse> {
  return request<CommentResponse>(
    `/api/v1/chapters/${encodeId(chapterId)}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ content, ...(parentId ? { parentId } : {}) }),
    },
  );
}

export function updateChapterComment(
  request: CommentRequester,
  commentId: string,
  content: string,
): Promise<CommentResponse> {
  return request<CommentResponse>(`/api/v1/comments/${encodeId(commentId)}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
}

export async function deleteChapterComment(
  request: CommentRequester,
  commentId: string,
): Promise<void> {
  await request(`/api/v1/comments/${encodeId(commentId)}`, {
    method: "DELETE",
  });
}
