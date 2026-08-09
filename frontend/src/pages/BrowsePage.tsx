import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import StoryCard from "../components/StoryCard";
import useAuth from "../hooks/useAuth";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";
import type { Story } from "../types/story";

interface StoriesResponse {
  data: {
    stories: Story[];
    pagination: { hasMore: boolean; nextCursor: string | null };
  };
}

export default function BrowsePage({
  kind,
}: {
  kind: "genre" | "tag";
}) {
  const { slug = "" } = useParams();
  const { status, request } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const path = `/api/v1/stories?${kind}=${encodeURIComponent(slug)}&limit=30`;
    const pending =
      status === "authenticated"
        ? request<StoriesResponse>(path)
        : apiRequest<StoriesResponse>(path);

    void pending
      .then((response) => {
        if (active) {
          setStories(response.data.stories);
          setError(null);
        }
      })
      .catch((cause) => {
        if (active) setError(getErrorMessage(cause));
      });

    return () => {
      active = false;
    };
  }, [kind, request, slug, status]);

  return (
    <main className="page-shell">
      <header className="page-heading">
        <div>
          <p className="eyebrow">{kind === "genre" ? "ژانر" : "برچسب"}</p>
          <h1>{slug}</h1>
        </div>
      </header>
      {error ? (
        <p className="status-message status-message--error" role="alert">{error}</p>
      ) : stories.length === 0 ? (
        <p className="empty-state">داستان عمومی‌ای با این فیلتر وجود ندارد.</p>
      ) : (
        <div className="story-grid">
          {stories.map((story) => <StoryCard key={story.id} story={story} />)}
        </div>
      )}
    </main>
  );
}
