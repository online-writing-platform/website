import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, MessageCircle, ThumbsUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";

import CommentComposer from "../features/comments/components/CommentComposer";
import CommentThread from "../features/comments/components/CommentThread";
import { parseCommentDeepLink } from "../features/comments/deep-link";
import useChapterComments from "../features/comments/hooks/useChapterComments";
import useChapterVote from "../features/comments/hooks/useChapterVote";
import useAuth from "../hooks/useAuth";
import useInterfaceLocale from "../hooks/useInterfaceLocale";
import { getErrorMessage } from "../lib/error-message";

import "../features/comments/comments.css";

interface ReaderInteractionsProps {
  chapterId: string;
}

export default function ReaderInteractions({
  chapterId,
}: ReaderInteractionsProps) {
  const { t } = useTranslation();
  const { status, user, request } = useAuth();
  const { direction, language, locale } = useInterfaceLocale();
  const location = useLocation();
  const handledDeepLinkRef = useRef("");
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null);
  const [deepLinkAttempt, setDeepLinkAttempt] = useState(0);
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const {
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
  } = useChapterComments({ chapterId, status, request, pageSize: 20 });
  const {
    votes,
    voted,
    loading: voteLoading,
    busy: voteBusy,
    error: voteError,
    toggle: toggleVote,
  } = useChapterVote({ chapterId, status, request });

  useEffect(() => {
    const deepLink = parseCommentDeepLink(location.hash);
    const deepLinkKey = `${chapterId}:${location.hash}`;

    if (
      !deepLink ||
      loadingInitial ||
      handledDeepLinkRef.current === deepLinkKey
    ) {
      return;
    }

    handledDeepLinkRef.current = deepLinkKey;
    let active = true;
    let clearHighlightTimer: number | undefined;
    let scrollTimer: number | undefined;

    void revealComment(deepLink.commentId)
      .then((rootId) => {
        if (!active) return;

        if (rootId !== deepLink.commentId) {
          setExpandedThreadIds((current) => new Set(current).add(rootId));
        }
        setHighlightedId(deepLink.commentId);
        setDeepLinkError(null);

        scrollTimer = window.setTimeout(() => {
          const target = document.getElementById(
            `comment-${deepLink.commentId}`,
          );
          target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
          target?.focus({ preventScroll: true });
        }, 50);
        clearHighlightTimer = window.setTimeout(() => {
          setHighlightedId(null);
        }, 4000);
      })
      .catch((cause) => {
        if (active) setDeepLinkError(getErrorMessage(cause));
      });

    return () => {
      active = false;
      if (scrollTimer !== undefined) window.clearTimeout(scrollTimer);
      if (clearHighlightTimer !== undefined) {
        window.clearTimeout(clearHighlightTimer);
      }
    };
  }, [chapterId, deepLinkAttempt, loadingInitial, location.hash, revealComment]);

  const toggleReplies = useCallback(
    async (commentId: string): Promise<void> => {
      const expanded = expandedThreadIds.has(commentId);

      setExpandedThreadIds((current) => {
        const next = new Set(current);

        if (expanded) next.delete(commentId);
        else next.add(commentId);

        return next;
      });

      if (!expanded) await loadReplies(commentId);
    },
    [expandedThreadIds, loadReplies],
  );

  const visibleLoadError = deepLinkError ?? initialLoadError;

  return (
    <section
      className="chapter-discussion"
      aria-labelledby="discussion-title"
      dir={direction}
      lang={language}
    >
      <header className="chapter-discussion__header">
        <div>
          <span className="chapter-discussion__eyebrow">
            <MessageCircle aria-hidden="true" />
            {t("reader.interactions.eyebrow")}
          </span>
          <h2 id="discussion-title">{t("reader.interactions.title")}</h2>
          <p>{t("reader.interactions.description")}</p>
        </div>

        {status === "authenticated" ? (
          <button
            className={`chapter-discussion__vote${
              voted ? " chapter-discussion__vote--active" : ""
            }`}
            type="button"
            aria-pressed={voted}
            disabled={voteBusy || voteLoading}
            onClick={() => void toggleVote()}
          >
            {voteBusy || voteLoading ? (
              <LoaderCircle className="is-spinning" aria-hidden="true" />
            ) : (
              <ThumbsUp aria-hidden="true" />
            )}
            <span>
              {voted
                ? t("reader.interactions.removeVote")
                : t("reader.interactions.vote")}
            </span>
            <strong>{votes === null ? "—" : votes.toLocaleString(locale)}</strong>
          </button>
        ) : (
          <span className="chapter-discussion__vote-count">
            {voteLoading ? (
              <>
                <LoaderCircle className="is-spinning" aria-hidden="true" />
                {t("reader.interactions.loadingVotes")}
              </>
            ) : votes === null ? (
              <>
                <ThumbsUp aria-hidden="true" />
                {t("reader.interactions.voteCountUnavailable")}
              </>
            ) : (
              <>
                <ThumbsUp aria-hidden="true" />
                {t("reader.interactions.voteCount", {
                  count: votes,
                  value: votes.toLocaleString(locale),
                })}
              </>
            )}
          </span>
        )}
      </header>

      {voteError ? (
        <p className="chapter-discussion__error" role="alert">
          {voteError}
        </p>
      ) : null}

      {status === "authenticated" ? (
        <CommentComposer
          label={t("reader.interactions.yourComment")}
          placeholder={t("reader.interactions.commentPlaceholder")}
          submitLabel={t("reader.interactions.submit")}
          submittingLabel={t("reader.interactions.submitting")}
          error={mutationErrors["create:root"]}
          onClearError={() => clearMutationError("create:root")}
          onSubmit={(content) => createComment(content)}
        />
      ) : (
        <p className="chapter-discussion__login-message">
          {t("reader.interactions.loginPrefix")}{" "}
          <Link to="/login">{t("reader.interactions.loginLink")}</Link>
          {t("reader.interactions.loginSuffix")}
        </p>
      )}

      {visibleLoadError ? (
        <div className="chapter-discussion__error" role="alert">
          <p>{visibleLoadError}</p>
          <button
            className="button button--secondary"
            type="button"
            onClick={() => {
              if (deepLinkError) {
                handledDeepLinkRef.current = "";
                setDeepLinkError(null);
                setDeepLinkAttempt((value) => value + 1);
              } else {
                void loadFirstPage();
              }
            }}
          >
            {t("common.retry")}
          </button>
        </div>
      ) : null}

      <div className="chapter-discussion__list" aria-live="polite">
        {loadingInitial ? (
          <p className="chapter-discussion__status">
            <LoaderCircle className="is-spinning" aria-hidden="true" />
            {t("reader.interactions.loadingComments")}
          </p>
        ) : comments.length === 0 && !visibleLoadError ? (
          <div className="chapter-discussion__empty">
            <MessageCircle aria-hidden="true" />
            <h3>{t("reader.interactions.empty")}</h3>
            <p>{t("reader.interactions.emptyDescription")}</p>
          </div>
        ) : (
          comments.map((item) => (
            <CommentThread
              key={item.id}
              item={item}
              replies={replyPages[item.id]}
              expanded={expandedThreadIds.has(item.id)}
              highlightedId={highlightedId}
              locale={locale}
              direction={direction}
              currentUserId={user?.id ?? null}
              authenticated={status === "authenticated"}
              pendingKeys={pendingKeys}
              mutationErrors={mutationErrors}
              onToggle={() => toggleReplies(item.id)}
              onRetryReplies={() => loadReplies(item.id)}
              onClearMutationError={clearMutationError}
              onCreateReply={(content) => createComment(content, item.id)}
              onUpdate={updateComment}
              onDelete={removeComment}
              onLoadMoreReplies={() => loadReplies(item.id, true)}
            />
          ))
        )}
      </div>

      {hasMore && loadMoreError ? (
        <div className="chapter-discussion__error" role="alert">
          <p>{loadMoreError}</p>
          <button
            className="button button--secondary"
            type="button"
            onClick={() => void loadMoreComments()}
          >
            {t("common.retry")}
          </button>
        </div>
      ) : hasMore ? (
        <button
          className="chapter-discussion__load-more button button--secondary"
          type="button"
          disabled={loadingMore}
          onClick={() => void loadMoreComments()}
        >
          {loadingMore ? (
            <LoaderCircle className="is-spinning" aria-hidden="true" />
          ) : null}
          {loadingMore
            ? t("reader.interactions.loadingMore")
            : t("reader.interactions.loadMoreComments")}
        </button>
      ) : null}
    </section>
  );
}
