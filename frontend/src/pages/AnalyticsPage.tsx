import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";
import type { GetStoriesResponse } from "../types/story";

interface Analytics {
  story: { id: string; title: string; slug: string };
  uniqueReaders: number;
  librarySaves: number;
  activeProgressReaders: number;
  chapters: Array<{
    id: string;
    title: string;
    position: number;
    uniqueReaders: number;
    votes: number;
    comments: number;
  }>;
}
interface AnalyticsResponse {
  data: { analytics: Analytics };
}

export default function AnalyticsPage() {
  const { request } = useAuth();
  const [params, setParams] = useSearchParams();
  const [stories, setStories] = useState<GetStoriesResponse["data"]["stories"]>(
    [],
  );
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedStoryId = params.get("story");

  useEffect(() => {
    void request<GetStoriesResponse>("/api/v1/stories/mine?limit=50")
      .then((response) => {
        setStories(response.data.stories);
        if (!selectedStoryId && response.data.stories[0]) {
          setParams({ story: response.data.stories[0].id }, { replace: true });
        }
      })
      .catch((cause) => setError(getErrorMessage(cause)));
  }, [request, selectedStoryId, setParams]);

  useEffect(() => {
    if (!selectedStoryId) return;
    void request<AnalyticsResponse>(
      `/api/v1/analytics/stories/${selectedStoryId}`,
    )
      .then((response) => {
        setAnalytics(response.data.analytics);
        setError(null);
      })
      .catch((cause) => setError(getErrorMessage(cause)));
  }, [request, selectedStoryId]);

  return (
    <main className="page-shell">
      <header className="page-heading">
        <div>
          <p className="eyebrow">فضای نویسنده</p>
          <h1>آمار داستان</h1>
        </div>
      </header>

      {error && <p className="status-message status-message--error">{error}</p>}

      <label className="standalone-field">
        داستان
        <select
          value={selectedStoryId ?? ""}
          onChange={(event) => setParams({ story: event.target.value })}
        >
          <option value="" disabled>
            انتخاب داستان
          </option>
          {stories.map((story) => (
            <option key={story.id} value={story.id}>
              {story.title}
            </option>
          ))}
        </select>
      </label>

      {analytics ? (
        <>
          <section className="metrics-grid">
            <article className="metric surface">
              <span>خواننده یکتا</span>
              <strong>{analytics.uniqueReaders.toLocaleString("fa-IR")}</strong>
            </article>
            <article className="metric surface">
              <span>ذخیره در کتابخانه</span>
              <strong>{analytics.librarySaves.toLocaleString("fa-IR")}</strong>
            </article>
            <article className="metric surface">
              <span>خواننده با پیشرفت فعال</span>
              <strong>
                {analytics.activeProgressReaders.toLocaleString("fa-IR")}
              </strong>
            </article>
          </section>
          <section className="surface">
            <div className="section-heading">
              <h2>فصل‌ها</h2>
              <Link
                className="text-link"
                to={`/stories/${analytics.story.slug}`}
              >
                صفحه داستان
              </Link>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>فصل</th>
                    <th>خواننده یکتا</th>
                    <th>رأی</th>
                    <th>نظر</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.chapters.map((chapter) => (
                    <tr key={chapter.id}>
                      <td>
                        {chapter.position}. {chapter.title}
                      </td>
                      <td>{chapter.uniqueReaders.toLocaleString("fa-IR")}</td>
                      <td>{chapter.votes.toLocaleString("fa-IR")}</td>
                      <td>{chapter.comments.toLocaleString("fa-IR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        !error && (
          <p className="empty-state">برای دیدن آمار یک داستان انتخاب کنید.</p>
        )
      )}
    </main>
  );
}
