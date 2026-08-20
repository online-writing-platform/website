import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { GenreSection } from "../components/GenreSection";
import StoryShelf from "../components/StoryShelf";
import { HeroSection } from "@/components/HeroSection";

import useAuth from "../hooks/useAuth";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";
import {
  getActiveStoryLanguage,
  matchesStoryLanguage,
} from "../lib/story-language";
import type { DiscoveryResponse } from "../types/story";

import "./Home.css";

function Home() {
  const { i18n, t } = useTranslation();
  const { status, request } = useAuth();

  const [data, setData] = useState<DiscoveryResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const storyLanguage = getActiveStoryLanguage(i18n.resolvedLanguage);

  const localizedData = useMemo(() => {
    if (!data) {
      return null;
    }

    const onlyCurrentLanguage = <T extends { language: string }>(
      stories: T[],
    ) =>
      stories.filter((story) =>
        matchesStoryLanguage(story.language, storyLanguage),
      );

    return {
      recommended: onlyCurrentLanguage(data.recommended),
      recent: onlyCurrentLanguage(data.recent),
      popular: onlyCurrentLanguage(data.popular),
    };
  }, [data, storyLanguage]);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

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
        if (controller.signal.aborted) {
          return;
        }

        setError(getErrorMessage(loadError));
      });

    return () => controller.abort();
  }, [request, status]);

  const languageEmptyMessage = t("home.stories.emptyForLanguage", {
    language: t(`language.names.${storyLanguage}`),
  });

  return (
    <main className="app-main home-page">
      <HeroSection />

      {error ? (
        <p
          className="status-message home-stories-status"
          data-kind="error"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {!data && !error ? (
        <p className="status-message home-stories-status" aria-live="polite">
          {t("home.stories.loading")}
        </p>
      ) : null}

      {localizedData ? (
        <StoryShelf
          key={`popular-${storyLanguage}`}
          title={t("home.popular")}
          stories={localizedData.popular}
          emptyMessage={languageEmptyMessage}
        />
      ) : null}

      <GenreSection />

      {localizedData ? (
        <>
          <StoryShelf
            key={`recommended-${storyLanguage}`}
            title={t("home.recommended")}
            stories={localizedData.recommended}
            emptyMessage={languageEmptyMessage}
          />

          <StoryShelf
            key={`recent-${storyLanguage}`}
            title={t("home.latest")}
            stories={localizedData.recent}
            emptyMessage={languageEmptyMessage}
          />
        </>
      ) : null}
    </main>
  );
}

export default Home;
