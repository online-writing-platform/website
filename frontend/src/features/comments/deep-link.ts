import type { CommentDeepLink } from "./types";

export function parseCommentDeepLink(hash: string): CommentDeepLink | null {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  const search = new URLSearchParams(value);
  const commentId = search.get("comment")?.trim();

  if (!commentId) return null;

  return {
    commentId,
    parentId: search.get("parent")?.trim() || null,
  };
}

export function createCommentDeepLink(
  commentId: string,
  parentId?: string | null,
): string {
  const search = new URLSearchParams({ comment: commentId });

  if (parentId) {
    search.set("parent", parentId);
  }

  return `#${search.toString()}`;
}
