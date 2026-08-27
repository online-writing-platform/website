import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import useAuth from "../hooks/useAuth";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";
import { getStoryTextAttributes } from "../lib/story-language";

interface CommentAuthor {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Comment {
  id: string;
  parentId: string | null;
  content: string;
  status: "ACTIVE" | "HIDDEN" | "DELETED";
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  author: CommentAuthor | null;
}

interface CommentPageResponse {
  data: {
    comments: Comment[];

    pagination: {
      hasMore: boolean;
      nextCursor: string | null;
    };
  };
}

interface VoteResponse {
  data: {
    votes: number;
    voted?: boolean;
  };
}

interface ReaderInteractionsProps {
  chapterId: string;
  contentLanguage?: string;
}

export default function ReaderInteractions({
  chapterId,
  contentLanguage,
}: ReaderInteractionsProps) {
  const { t, i18n } = useTranslation();
  const { status, request } = useAuth();

  const [comments, setComments] = useState<Comment[]>([]);
  const [votes, setVotes] = useState(0);
  const [voted, setVoted] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const interfaceLocale = i18n.resolvedLanguage?.startsWith("en")
    ? "en-US"
    : "fa-IR";

  const commentTextAttributes = getStoryTextAttributes(contentLanguage);

  const load = useCallback(async (): Promise<void> => {
    const loadPublic = <T,>(path: string) =>
      status === "authenticated" ? request<T>(path) : apiRequest<T>(path);

    const [voteResult, commentResult] = await Promise.all([
      loadPublic<VoteResponse>(`/api/v1/chapters/${chapterId}/votes`),

      loadPublic<CommentPageResponse>(
        `/api/v1/chapters/${chapterId}/comments?limit=30`,
      ),
    ]);

    setVotes(voteResult.data.votes);
    setComments(commentResult.data.comments);

    if (status === "authenticated") {
      const state = await request<VoteResponse>(
        `/api/v1/chapters/${chapterId}/vote`,
      );

      setVoted(Boolean(state.data.voted));
      setVotes(state.data.votes);
    } else {
      setVoted(false);
    }
  }, [chapterId, request, status]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void load().catch((cause) => setError(getErrorMessage(cause)));
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
    };
  }, [load]);

  async function toggleVote(): Promise<void> {
    if (status !== "authenticated" || busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await request<VoteResponse>(
        `/api/v1/chapters/${chapterId}/vote`,
        {
          method: voted ? "DELETE" : "POST",
        },
      );

      setVotes(response.data.votes);
      setVoted(Boolean(response.data.voted));
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function submitComment(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const content = comment.trim();

    if (!content || busy) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await request(`/api/v1/chapters/${chapterId}/comments`, {
        method: "POST",
        body: JSON.stringify({
          content,
        }),
      });

      setComment("");
      await load();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="reader-interactions" aria-labelledby="discussion-title">
      <div className="reader-interactions__summary">
        {status === "authenticated" ? (
          <button
            className="button button--secondary"
            type="button"
            aria-pressed={voted}
            disabled={busy}
            onClick={() => void toggleVote()}
          >
            {voted
              ? t("reader.interactions.removeVote")
              : t("reader.interactions.vote")}
            {" · "}
            {votes.toLocaleString(interfaceLocale)}
          </button>
        ) : (
          <span>
            {t("reader.interactions.voteCount", {
              value: votes.toLocaleString(interfaceLocale),
              count: votes,
            })}
          </span>
        )}
      </div>

      <h2 id="discussion-title">{t("reader.interactions.title")}</h2>

      {error ? (
        <p className="status-message status-message--error" role="alert">
          {error}
        </p>
      ) : null}

      {status === "authenticated" ? (
        <form
          className="comment-form"
          onSubmit={(event) => void submitComment(event)}
        >
          <label htmlFor="chapter-comment">
            {t("reader.interactions.yourComment")}
          </label>

          <textarea
            id="chapter-comment"
            value={comment}
            maxLength={2000}
            rows={4}
            {...commentTextAttributes}
            onChange={(event) => setComment(event.target.value)}
          />

          <button
            className="button"
            type="submit"
            disabled={busy || !comment.trim()}
          >
            {busy
              ? t("reader.interactions.submitting")
              : t("reader.interactions.submit")}
          </button>
        </form>
      ) : (
        <p>
          {t("reader.interactions.loginPrefix")}{" "}
          <Link to="/login">{t("reader.interactions.loginLink")}</Link>
          {t("reader.interactions.loginSuffix")}
        </p>
      )}

      <div className="comment-list">
        {comments.length === 0 ? (
          <p className="empty-state">{t("reader.interactions.empty")}</p>
        ) : (
          comments.map((item) => (
            <article className="comment" key={item.id}>
              <header>
                {item.author ? (
                  <Link
                    to={`/users/${encodeURIComponent(item.author.username)}`}
                  >
                    <strong>{item.author.displayName}</strong>

                    <span>@{item.author.username}</span>
                  </Link>
                ) : (
                  <strong>{t("reader.interactions.deletedUser")}</strong>
                )}

                <time dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleDateString(interfaceLocale)}
                </time>
              </header>

              <p {...commentTextAttributes}>
                {item.status === "ACTIVE"
                  ? item.content
                  : t("reader.interactions.unavailableComment")}
              </p>

              {item.replyCount > 0 ? (
                <small>
                  {t("reader.interactions.replyCount", {
                    count: item.replyCount,
                    value: item.replyCount.toLocaleString(interfaceLocale),
                  })}
                </small>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
