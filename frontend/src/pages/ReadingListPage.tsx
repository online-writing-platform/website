import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import StoryCard from "../components/StoryCard";
import useAuth from "../hooks/useAuth";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";
import type { Story } from "../types/story";

interface Response {
  data: {
    list: {
      id: string;
      name: string;
      description: string | null;
      isPublic: boolean;
      owner: { username: string; displayName: string };
    };
    items: Array<{ addedAt: string; story: Story }>;
  };
}

export default function ReadingListPage() {
  const { listId = "" } = useParams();
  const { status, request } = useAuth();
  const [data, setData] = useState<Response["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const path = `/api/v1/reading-lists/${listId}`;
    const promise = status === "authenticated" ? request<Response>(path) : apiRequest<Response>(path);
    void promise.then((response) => setData(response.data)).catch((cause) => setError(getErrorMessage(cause)));
  }, [listId, request, status]);

  if (error) return <main className="page-shell"><p className="status-message status-message--error">{error}</p></main>;
  if (!data) return <main className="page-shell"><p>در حال بارگذاری…</p></main>;

  return (
    <main className="page-shell">
      <header className="page-heading">
        <div>
          <p className="eyebrow">فهرست مطالعه</p>
          <h1>{data.list.name}</h1>
          <p>{data.list.description}</p>
          <Link className="text-link" to={`/users/${data.list.owner.username}`}>
            {data.list.owner.displayName}
          </Link>
        </div>
      </header>
      {data.items.length === 0 ? <p className="empty-state">این فهرست خالی است.</p> : (
        <div className="story-grid">{data.items.map((item) => <StoryCard key={item.story.id} story={item.story} />)}</div>
      )}
    </main>
  );
}
