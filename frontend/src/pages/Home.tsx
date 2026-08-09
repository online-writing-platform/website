import { useEffect, useState } from "react";

import StoryShelf from "../components/StoryShelf";
import useAuth from "../hooks/useAuth";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";
import type { DiscoveryResponse } from "../types/story";

function Home() {
  const { status, request } = useAuth();
  const [data, setData] = useState<DiscoveryResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    const controller = new AbortController();

    const load =
      status === "authenticated"
        ? request<DiscoveryResponse>("/api/v1/discovery/home", {
            signal: controller.signal,
          })
        : apiRequest<DiscoveryResponse>("/api/v1/discovery/home", {
            signal: controller.signal,
          });

    void load
      .then((response) => {
        setError(null);
        setData(response.data);
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setError(getErrorMessage(loadError));
      });

    return () => controller.abort();
  }, [request, status]);

  return (
    <main className="app-main">
      <section aria-labelledby="home-heading">
        <h1 id="home-heading" className="page-heading">
          داستان‌هایی برای خواندن
        </h1>
        <p className="page-lead">
          پیشنهادها بر اساس دنبال‌کردن، ژانرها، برچسب‌های مطالعه‌شده، تعامل
          خوانندگان و تازگی داستان رتبه‌بندی می‌شوند.
        </p>
      </section>

      {error ? (
        <p className="status-message" data-kind="error" role="alert">
          {error}
        </p>
      ) : null}

      {!data && !error ? (
        <p className="status-message" aria-live="polite">
          در حال دریافت داستان‌ها...
        </p>
      ) : null}

      {data ? (
        <>
          <StoryShelf title="برای شما" stories={data.recommended} showReason />
          <StoryShelf title="تازه منتشرشده" stories={data.recent} />
          <StoryShelf title="محبوب" stories={data.popular} />
        </>
      ) : null}
    </main>
  );
}

export default Home;
