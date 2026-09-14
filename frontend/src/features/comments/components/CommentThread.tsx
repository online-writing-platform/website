import { ChevronDown, ChevronUp, LoaderCircle, MessagesSquare } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { ChapterComment, ReplyPage } from "../types";
import CommentComposer from "./CommentComposer";
import CommentItem from "./CommentItem";

interface CommentThreadProps {
  item: ChapterComment;
  replies: ReplyPage | undefined;
  expanded: boolean;
  highlightedId: string | null;
  locale: string;
  direction: "rtl" | "ltr";
  currentUserId: string | null;
  authenticated: boolean;
  pendingKeys: Set<string>;
  mutationErrors: Record<string, string>;
  onToggle(): Promise<void>;
  onRetryReplies(): Promise<void>;
  onClearMutationError(key: string): void;
  onCreateReply(content: string): Promise<boolean>;
  onUpdate(commentId: string, content: string): Promise<boolean>;
  onDelete(commentId: string): Promise<boolean>;
  onLoadMoreReplies(): Promise<void>;
}

export default function CommentThread({
  item,
  replies,
  expanded,
  highlightedId,
  locale,
  direction,
  currentUserId,
  authenticated,
  pendingKeys,
  mutationErrors,
  onToggle,
  onRetryReplies,
  onClearMutationError,
  onCreateReply,
  onUpdate,
  onDelete,
  onLoadMoreReplies,
}: CommentThreadProps) {
  const { t } = useTranslation();
  const [replying, setReplying] = useState(false);
  const replyRegionId = `comment-replies-${item.id}`;

  function openReplyComposer(): void {
    setReplying(true);
    if (!expanded) void onToggle();
  }

  async function submitReply(content: string): Promise<boolean> {
    const succeeded = await onCreateReply(content);

    if (succeeded) setReplying(false);
    return succeeded;
  }

  return (
    <div className="comment-thread">
      <CommentItem
        item={item}
        locale={locale}
        direction={direction}
        currentUserId={currentUserId}
        authenticated={authenticated}
        highlighted={highlightedId === item.id}
        updating={pendingKeys.has(`update:${item.id}`)}
        deleting={pendingKeys.has(`delete:${item.id}`)}
        updateError={mutationErrors[`update:${item.id}`]}
        deleteError={mutationErrors[`delete:${item.id}`]}
        onReply={
          item.status === "ACTIVE" ? openReplyComposer : undefined
        }
        onClearUpdateError={() =>
          onClearMutationError(`update:${item.id}`)
        }
        onClearDeleteError={() =>
          onClearMutationError(`delete:${item.id}`)
        }
        onUpdate={onUpdate}
        onDelete={onDelete}
      />

      {item.replyCount > 0 || expanded ? (
        <button
          className="comment-thread__toggle"
          type="button"
          aria-expanded={expanded}
          aria-controls={replyRegionId}
          onClick={() => void onToggle()}
        >
          <MessagesSquare aria-hidden="true" />
          {expanded
            ? t("reader.interactions.hideReplies")
            : t("reader.interactions.showReplies", {
                count: item.replyCount,
                value: item.replyCount.toLocaleString(locale),
              })}
          {expanded ? (
            <ChevronUp aria-hidden="true" />
          ) : (
            <ChevronDown aria-hidden="true" />
          )}
        </button>
      ) : null}

      {expanded ? (
        <section
          id={replyRegionId}
          className="comment-thread__replies"
          aria-label={t("reader.interactions.repliesLabel")}
        >
          {replying ? (
            <CommentComposer
              compact
              autoFocus
              label={t("reader.interactions.yourReply")}
              placeholder={t("reader.interactions.replyPlaceholder")}
              submitLabel={t("reader.interactions.submitReply")}
              submittingLabel={t("reader.interactions.submittingReply")}
              cancelLabel={t("common.cancel")}
              error={mutationErrors[`reply:${item.id}`]}
              onClearError={() =>
                onClearMutationError(`reply:${item.id}`)
              }
              onCancel={() => setReplying(false)}
              onSubmit={submitReply}
            />
          ) : null}

          {replies?.loadingInitial ? (
            <p className="comment-thread__status" aria-live="polite">
              <LoaderCircle className="is-spinning" aria-hidden="true" />
              {t("reader.interactions.loadingReplies")}
            </p>
          ) : replies?.initialError ? (
            <div className="comment-thread__error" role="alert">
              <p>{replies.initialError}</p>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => void onRetryReplies()}
              >
                {t("common.retry")}
              </button>
            </div>
          ) : replies?.loaded && replies.items.length === 0 && !replying ? (
            <p className="comment-thread__status">
              {t("reader.interactions.noReplies")}
            </p>
          ) : (
            replies?.items.map((reply) => (
              <CommentItem
                key={reply.id}
                item={reply}
                isReply
                locale={locale}
                direction={direction}
                currentUserId={currentUserId}
                authenticated={authenticated}
                highlighted={highlightedId === reply.id}
                updating={pendingKeys.has(`update:${reply.id}`)}
                deleting={pendingKeys.has(`delete:${reply.id}`)}
                updateError={mutationErrors[`update:${reply.id}`]}
                deleteError={mutationErrors[`delete:${reply.id}`]}
                onClearUpdateError={() =>
                  onClearMutationError(`update:${reply.id}`)
                }
                onClearDeleteError={() =>
                  onClearMutationError(`delete:${reply.id}`)
                }
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))
          )}

          {replies?.loadMoreError ? (
            <div className="comment-thread__error" role="alert">
              <p>{replies.loadMoreError}</p>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => void onLoadMoreReplies()}
              >
                {t("common.retry")}
              </button>
            </div>
          ) : null}

          {replies?.hasMore && !replies.loadMoreError ? (
            <button
              className="comment-thread__load-more button button--secondary"
              type="button"
              disabled={replies.loadingMore}
              onClick={() => void onLoadMoreReplies()}
            >
              {replies.loadingMore ? (
                <LoaderCircle className="is-spinning" aria-hidden="true" />
              ) : null}
              {replies.loadingMore
                ? t("reader.interactions.loadingMore")
                : t("reader.interactions.loadMoreReplies")}
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
