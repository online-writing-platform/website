import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SearchBox from "../components/SearchBar";
import StoryCard from "../components/StoryCard";
import useAuth from "../hooks/useAuth";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";
import type { Story } from "../types/story";

type SearchType = "all" | "stories" | "users" | "tags";

interface SearchResponse {
  data: {
    stories?: Story[];
    users?: Array<{
      id: string;
      username: string;
      displayName: string;
      bio: string | null;
      avatarUrl: string | null;
    }>;
    tags?: Array<{ slug: string; name: string; storyCount: number }>;
    pagination: { page: number; limit: number; hasMore: boolean };
  };
}

export default function SearchPage() {
  const { status, request } = useAuth();
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const type = (params.get("type") as SearchType | null) ?? "all";
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);

  const [result, setResult] = useState<SearchResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchTimer = window.setTimeout(() => {
      if (query.trim().length < 2) {
        setResult(null);
        setError(null);
        return;
      }

      const path = `/api/v1/search?q=${encodeURIComponent(query.trim())}&type=${type}&page=${page}&limit=12`;

      const promise =
        status === "authenticated"
          ? request<SearchResponse>(path)
          : apiRequest<SearchResponse>(path);

      void promise
        .then((response) => {
          setResult(response.data);
          setError(null);
        })
        .catch((cause) => setError(getErrorMessage(cause)));
    }, 0);

    return () => window.clearTimeout(searchTimer);
  }, [page, query, request, status, type]);

  function typeLink(value: SearchType): string {
    return `/search?q=${encodeURIComponent(query)}&type=${value}`;
  }

  return (
    <main className="page-shell">
      <header className="page-heading">
        <div>
          <p className="eyebrow">کشف محتوا</p>
          <h1>جست‌وجو</h1>
        </div>
      </header>
      <SearchBox query={query} type={type} />
      {query && (
        <nav className="segmented-nav" aria-label="نوع نتیجه">
          {(["all", "stories", "users", "tags"] as const).map((value) => (
            <Link
              key={value}
              aria-current={type === value ? "page" : undefined}
              to={typeLink(value)}
            >
              {
                {
                  all: "همه",
                  stories: "داستان‌ها",
                  users: "کاربران",
                  tags: "برچسب‌ها",
                }[value]
              }
            </Link>
          ))}
        </nav>
      )}

      {error && <p className="status-message status-message--error">{error}</p>}
      {!query && (
        <p className="empty-state">حداقل دو نویسه برای جست‌وجو وارد کنید.</p>
      )}

      {result?.stories && (
        <section className="section-block">
          <h2>داستان‌ها</h2>
          {result.stories.length ? (
            <div className="story-grid">
              {result.stories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <p className="empty-state">نتیجه‌ای پیدا نشد.</p>
          )}
        </section>
      )}

      {result?.users && (
        <section className="section-block">
          <h2>کاربران</h2>
          <ul className="profile-result-list">
            {result.users.map((item) => (
              <li className="surface" key={item.id}>
                <Link to={`/users/${item.username}`}>
                  <strong>{item.displayName}</strong>
                  <span>@{item.username}</span>
                </Link>
                {item.bio && <p>{item.bio}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {result?.tags && (
        <section className="section-block">
          <h2>برچسب‌ها</h2>
          <div className="tag-list">
            {result.tags.map((tag) => (
              <Link
                key={tag.slug}
                to={`/search?q=${encodeURIComponent(tag.name)}&type=stories`}
              >
                #{tag.name} · {tag.storyCount.toLocaleString("fa-IR")}
              </Link>
            ))}
          </div>
        </section>
      )}

      {result && query && type !== "all" && (
        <nav className="pagination" aria-label="صفحه‌های نتایج">
          {page > 1 && (
            <Link
              className="button button--secondary"
              to={`/search?q=${encodeURIComponent(query)}&type=${type}&page=${page - 1}`}
            >
              قبلی
            </Link>
          )}
          <span>صفحه {page.toLocaleString("fa-IR")}</span>
          {result.pagination.hasMore && (
            <Link
              className="button button--secondary"
              to={`/search?q=${encodeURIComponent(query)}&type=${type}&page=${page + 1}`}
            >
              بعدی
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
