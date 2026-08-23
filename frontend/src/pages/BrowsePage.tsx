import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, SlidersHorizontal } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import StoryCard from "../components/StoryCard";
import "./BrowsePage.css";
import useAuth from "../hooks/useAuth";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";

type BrowseSort = "relevance" | "mostRead" | "mostVoted" | "newest";

interface Genre {
  slug: string;
  name: string;
}

interface BrowseStory {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverUrl: string | null;
  language: string;
  status: "ONGOING" | "COMPLETED" | "HIATUS";
  isMature: boolean;
  publishedAt: string;

  author: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };

  genre: Genre | null;
  libraryCount: number;
  voteCount: number;
  commentCount: number;
  qualifiedViews: number;
  chapterCount: number;
}

interface BrowseResponse {
  data: {
    stories: BrowseStory[];

    pagination: {
      page: number;
      limit: number;
      hasMore: boolean;
    };
  };
}

interface GenresResponse {
  data: {
    genres: Genre[];
  };
}

interface BrowsePageProps {
  kind?: "genre" | "tag";
}

function isBrowseSort(value: string | null): value is BrowseSort {
  return (
    value === "relevance" ||
    value === "mostRead" ||
    value === "mostVoted" ||
    value === "newest"
  );
}

export default function BrowsePage({ kind }: BrowsePageProps) {
  const { i18n, t } = useTranslation();
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { status, request } = useAuth();

  const [genres, setGenres] = useState<Genre[]>([]);

  const [browseResult, setBrowseResult] = useState<{
    path: string;
    stories: BrowseStory[];
    error: string | null;
  } | null>(null);

  const query = (searchParams.get("q") ?? "").trim();

  const selectedGenre =
    kind === "genre" ? slug : (searchParams.get("genre") ?? "all");

  const selectedTag = kind === "tag" ? slug : (searchParams.get("tag") ?? "");

  const selectedLanguage = searchParams.get("language") ?? "all";

  const sortParam = searchParams.get("sort");

  let selectedSort: BrowseSort = query ? "relevance" : "mostRead";

  if (
    isBrowseSort(sortParam) &&
    (query.length > 0 || sortParam !== "relevance")
  ) {
    selectedSort = sortParam;
  }

  const locale = i18n.resolvedLanguage?.startsWith("en") ? "en-US" : "fa-IR";

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    [locale],
  );

  const browsePath = useMemo(() => {
    if (query.length === 1) {
      return null;
    }

    const params = new URLSearchParams({
      type: "stories",
      sort: selectedSort,
      page: "1",
      limit: "20",
    });

    if (query) {
      params.set("q", query);
    }

    if (selectedGenre !== "all") {
      params.set("genre", selectedGenre);
    }

    if (selectedTag) {
      params.set("tag", selectedTag);
    }

    if (selectedLanguage !== "all") {
      params.set("language", selectedLanguage);
    }

    return `/api/v1/search?${params.toString()}`;
  }, [query, selectedGenre, selectedLanguage, selectedSort, selectedTag]);

  const currentResult = browseResult?.path === browsePath ? browseResult : null;

  const stories = currentResult?.stories ?? [];
  const error = currentResult?.error ?? null;

  const loading = browsePath !== null && currentResult === null;

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    const controller = new AbortController();

    const load =
      status === "authenticated"
        ? request<GenresResponse>("/api/v1/stories/genres", {
            signal: controller.signal,
          })
        : apiRequest<GenresResponse>("/api/v1/stories/genres", {
            signal: controller.signal,
          });

    void load
      .then((response) => {
        setGenres(response.data.genres);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setGenres([]);
        }
      });

    return () => controller.abort();
  }, [request, status]);

  useEffect(() => {
    if (status === "loading" || !browsePath) {
      return;
    }

    const controller = new AbortController();

    const load =
      status === "authenticated"
        ? request<BrowseResponse>(browsePath, {
            signal: controller.signal,
          })
        : apiRequest<BrowseResponse>(browsePath, {
            signal: controller.signal,
          });

    void load
      .then((response) => {
        setBrowseResult({
          path: browsePath,
          stories: response.data.stories,
          error: null,
        });
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setBrowseResult({
          path: browsePath,
          stories: [],
          error: getErrorMessage(cause),
        });
      });

    return () => controller.abort();
  }, [browsePath, request, status]);

  function updateFilter(name: "genre" | "language" | "sort", value: string) {
    const nextParams = new URLSearchParams(searchParams);

    if (!query && nextParams.get("sort") === "relevance") {
      nextParams.delete("sort");
    }

    const defaultSort = query ? "relevance" : "mostRead";

    if ((name === "genre" || name === "language") && value === "all") {
      nextParams.delete(name);
    } else if (name === "sort" && value === defaultSort) {
      nextParams.delete(name);
    } else {
      nextParams.set(name, value);
    }

    if (kind) {
      if (kind === "tag" && slug) {
        nextParams.set("tag", slug);
      }

      navigate(
        `/browse${nextParams.size > 0 ? `?${nextParams.toString()}` : ""}`,
      );

      return;
    }

    setSearchParams(nextParams);
  }

  function handleSelectChange(
    name: "genre" | "language" | "sort",
    event: ChangeEvent<HTMLSelectElement>,
  ) {
    updateFilter(name, event.target.value);
  }

  function translatedGenre(genre: Genre): string {
    return t(`genres.items.${genre.slug}`, {
      defaultValue: genre.name,
    });
  }

  return (
    <main className="browse-page">
      <h1>{t("browse.title")}</h1>

      <div className="browse-filters">
        <label className="browse-select browse-select--with-icon">
          <span className="sr-only">{t("browse.filters.genre")}</span>

          <SlidersHorizontal aria-hidden="true" />

          <select
            value={selectedGenre}
            onChange={(event) => handleSelectChange("genre", event)}
          >
            <option value="all">{t("browse.filters.all")}</option>

            {genres.map((genre) => (
              <option key={genre.slug} value={genre.slug}>
                {translatedGenre(genre)}
              </option>
            ))}
          </select>
        </label>

        <label className="browse-select">
          <span className="sr-only">{t("browse.filters.language")}</span>

          <select
            value={selectedLanguage}
            onChange={(event) => handleSelectChange("language", event)}
          >
            <option value="all">{t("browse.filters.all")}</option>
            <option value="en">{t("browse.languages.en")}</option>
            <option value="fa">{t("browse.languages.fa")}</option>
            <option value="bilingual">{t("browse.languages.bilingual")}</option>
          </select>
        </label>

        <label className="browse-select">
          <span className="sr-only">{t("browse.filters.sort")}</span>

          <select
            value={selectedSort}
            onChange={(event) => handleSelectChange("sort", event)}
          >
            {query ? (
              <option value="relevance">{t("browse.sort.relevance")}</option>
            ) : null}

            <option value="mostRead">{t("browse.sort.mostRead")}</option>
            <option value="mostVoted">{t("browse.sort.mostVoted")}</option>
            <option value="newest">{t("browse.sort.newest")}</option>
          </select>
        </label>
      </div>

      <div className="browse-genres" aria-label={t("browse.genreList")}>
        <button
          type="button"
          className={selectedGenre === "all" ? "is-active" : undefined}
          aria-pressed={selectedGenre === "all"}
          onClick={() => updateFilter("genre", "all")}
        >
          {t("browse.filters.all")}
        </button>

        {genres.map((genre) => {
          const isActive = selectedGenre === genre.slug;

          return (
            <button
              key={genre.slug}
              type="button"
              className={isActive ? "is-active" : undefined}
              data-genre={genre.slug}
              aria-pressed={isActive}
              onClick={() => updateFilter("genre", genre.slug)}
            >
              {translatedGenre(genre)}
            </button>
          );
        })}
      </div>

      <p className="browse-result-count" aria-live="polite">
        {t("browse.resultCount", {
          count: query.length === 1 ? 0 : stories.length,
        })}
      </p>

      {query.length === 1 ? (
        <div className="browse-empty">
          <Search aria-hidden="true" />
          <p>{t("browse.searchMinimum")}</p>
        </div>
      ) : loading ? (
        <p className="browse-state" aria-live="polite">
          {t("browse.loading")}
        </p>
      ) : error ? (
        <p className="status-message" data-kind="error" role="alert">
          {error}
        </p>
      ) : stories.length > 0 ? (
        <div className="browse-story-grid">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      ) : (
        <div className="browse-empty">
          <Search aria-hidden="true" />
          <p>{t("browse.empty")}</p>
        </div>
      )}
    </main>
  );
}
