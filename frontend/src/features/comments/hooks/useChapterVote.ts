import { useCallback, useEffect, useRef, useState } from "react";

import type { AuthStatus } from "../../../context/AuthContext";
import { apiRequest } from "../../../lib/api";
import { getErrorMessage } from "../../../lib/error-message";
import type { CommentRequester } from "../api";

interface VoteResponse {
  data: {
    votes: number;
    voted?: boolean;
  };
}

interface UseChapterVoteOptions {
  chapterId: string;
  status: AuthStatus;
  request: CommentRequester;
}

export default function useChapterVote({
  chapterId,
  status,
  request,
}: UseChapterVoteOptions) {
  const requestSequenceRef = useRef(0);
  const [votes, setVotes] = useState<number | null>(null);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = sequence;
    const timer = window.setTimeout(() => {
      setError(null);
      setLoading(true);
      setVotes(null);
      setVoted(false);
      const encodedChapterId = encodeURIComponent(chapterId);
      const responsePromise =
        status === "authenticated"
          ? request<VoteResponse>(
              `/api/v1/chapters/${encodedChapterId}/vote`,
            )
          : apiRequest<VoteResponse>(
              `/api/v1/chapters/${encodedChapterId}/votes`,
            );

      void responsePromise
        .then((response) => {
          if (sequence !== requestSequenceRef.current) return;
          setVotes(response.data.votes);
          setVoted(
            status === "authenticated" && Boolean(response.data.voted),
          );
        })
        .catch((cause) => {
          if (sequence === requestSequenceRef.current) {
            setError(getErrorMessage(cause));
          }
        })
        .finally(() => {
          if (sequence === requestSequenceRef.current) {
            setLoading(false);
          }
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      requestSequenceRef.current += 1;
    };
  }, [chapterId, request, status]);

  const toggle = useCallback(async (): Promise<void> => {
    if (status !== "authenticated" || busy || loading) return;

    setBusy(true);
    setError(null);

    try {
      const response = await request<VoteResponse>(
        `/api/v1/chapters/${encodeURIComponent(chapterId)}/vote`,
        { method: voted ? "DELETE" : "POST" },
      );
      setVotes(response.data.votes);
      setVoted(Boolean(response.data.voted));
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }, [busy, chapterId, loading, request, status, voted]);

  return { votes, voted, loading, busy, error, toggle };
}
