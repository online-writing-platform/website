import type { TFunction } from "i18next";

import { createCommentDeepLink } from "../comments/deep-link";
import type { NotificationItem } from "./types";

function stringData(item: NotificationItem, key: string): string | null {
  const value = item.data[key];

  return typeof value === "string" && value.trim() ? value : null;
}

export function getNotificationLabel(
  item: NotificationItem,
  t: TFunction,
): string {
  const actor = item.actor?.displayName ?? t("notifications.items.system");
  const storyTitle = stringData(item, "storyTitle");
  const chapterTitle = stringData(item, "chapterTitle");

  switch (item.type) {
    case "FOLLOW":
      return t("notifications.items.follow", { actor });
    case "COMMENT":
      return t("notifications.items.comment", { actor });
    case "COMMENT_REPLY":
      return t("notifications.items.commentReply", { actor });
    case "CHAPTER_VOTE":
      return t("notifications.items.chapterVote", { actor });
    case "STORY_PUBLISHED":
      return storyTitle
        ? t("notifications.items.storyPublishedNamed", { storyTitle })
        : t("notifications.items.storyPublished");
    case "CHAPTER_PUBLISHED":
      return chapterTitle
        ? t("notifications.items.chapterPublishedNamed", { chapterTitle })
        : storyTitle
          ? t("notifications.items.storyChapterPublished", { storyTitle })
          : t("notifications.items.chapterPublished");
    case "MODERATION":
      return t("notifications.items.moderation");
    case "SECURITY":
      return t("notifications.items.security");
    default:
      return t("notifications.items.fallback");
  }
}

export function getNotificationTarget(item: NotificationItem): string {
  const storySlug = stringData(item, "storySlug");
  const chapterId = stringData(item, "chapterId");

  if (storySlug && chapterId) {
    const chapterPath = `/stories/${encodeURIComponent(
      storySlug,
    )}/chapters/${encodeURIComponent(chapterId)}`;
    const commentId = stringData(item, "commentId");

    if (
      commentId &&
      (item.type === "COMMENT" || item.type === "COMMENT_REPLY")
    ) {
      return `${chapterPath}${createCommentDeepLink(
        commentId,
        stringData(item, "parentId"),
      )}`;
    }

    return chapterPath;
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

export function getNotificationTone(type: string): string {
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

export function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export function formatNotificationDate(value: string, locale: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
