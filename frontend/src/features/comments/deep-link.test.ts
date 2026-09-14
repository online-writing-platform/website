import { describe, expect, it } from "vitest";

import { getNotificationTarget } from "../notifications/presentation";
import { createCommentDeepLink, parseCommentDeepLink } from "./deep-link";

describe("comment deep links", () => {
  it("round-trips a reply and its parent", () => {
    const hash = createCommentDeepLink("reply-1", "parent-1");

    expect(parseCommentDeepLink(hash)).toEqual({
      commentId: "reply-1",
      parentId: "parent-1",
    });
  });

  it("targets the exact reply from a notification", () => {
    expect(
      getNotificationTarget({
        id: "notification-1",
        type: "COMMENT_REPLY",
        readAt: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        actor: null,
        data: {
          storySlug: "a story",
          chapterId: "chapter-1",
          commentId: "reply-1",
          parentId: "parent-1",
        },
      }),
    ).toBe(
      "/stories/a%20story/chapters/chapter-1#comment=reply-1&parent=parent-1",
    );
  });
});
