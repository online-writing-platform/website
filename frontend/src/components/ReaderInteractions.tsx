import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import useAuth from "../hooks/useAuth";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";

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
    pagination: { hasMore: boolean; nextCursor: string | null };
  };
}

interface VoteResponse {
  data: { votes: number; voted?: boolean };
}

interface ReaderInteractionsProps {
  chapterId: string;
}

export default function ReaderInteractions({ chapterId }: ReaderInteractionsProps) {
  const { status, request } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [votes, setVotes] = useState(0);
  const [voted, setVoted] = useState(false);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
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
    if (status !== "authenticated" || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await request<VoteResponse>(
        `/api/v1/chapters/${chapterId}/vote`,
        { method: voted ? "DELETE" : "POST" },
      );
      setVotes(response.data.votes);
      setVoted(Boolean(response.data.voted));
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const content = comment.trim();
    if (!content || busy) return;

    setBusy(true);
    setError(null);
    try {
      await request(`/api/v1/chapters/${chapterId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
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
            {voted ? "برداشتن رأی" : "رأی"} · {votes.toLocaleString("fa-IR")}
          </button>
        ) : (
          <span>{votes.toLocaleString("fa-IR")} رأی</span>
        )}
      </div>

      <h2 id="discussion-title">گفت‌وگو درباره این فصل</h2>

      {error && <p className="status-message status-message--error" role="alert">{error}</p>}

      {status === "authenticated" ? (
        <form className="comment-form" onSubmit={(event) => void submitComment(event)}>
          <label htmlFor="chapter-comment">نظر شما</label>
          <textarea
            id="chapter-comment"
            value={comment}
            maxLength={2000}
            rows={4}
            onChange={(event) => setComment(event.target.value)}
          />
          <button className="button" type="submit" disabled={busy || !comment.trim()}>
            ارسال نظر
          </button>
        </form>
      ) : (
        <p>
          برای رأی دادن یا نوشتن نظر <Link to="/login">وارد شوید</Link>.
        </p>
      )}

      <div className="comment-list">
        {comments.length === 0 ? (
          <p className="empty-state">هنوز نظری ثبت نشده است.</p>
        ) : (
          comments.map((item) => (
            <article className="comment" key={item.id}>
              <header>
                {item.author ? (
                  <Link to={`/users/${item.author.username}`}>
                    <strong>{item.author.displayName}</strong>
                    <span>@{item.author.username}</span>
                  </Link>
                ) : (
                  <strong>کاربر حذف‌شده</strong>
                )}
                <time dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleDateString("fa-IR")}
                </time>
              </header>
              <p>{item.status === "ACTIVE" ? item.content : "این نظر در دسترس نیست."}</p>
              {item.replyCount > 0 && (
                <small>{item.replyCount.toLocaleString("fa-IR")} پاسخ</small>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
