import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Compass,
  Hash,
  LayoutGrid,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  Tags,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import StoryCard from "../components/StoryCard";
import useAuth from "../hooks/useAuth";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";

import "./BrowsePage.css";

type BrowseSort = "relevance" | "mostRead" | "mostVoted" | "newest";
type BrowseResultType = "all" | "stories" | "users" | "tags";

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

interface BrowseUser {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
}

interface BrowseTag {
  slug: string;
  name: string;
  storyCount: number;
}

interface BrowseResponse {
  data: {
    stories?: BrowseStory[];
    users?: BrowseUser[];
    tags?: BrowseTag[];

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

const RESULT_TYPES: BrowseResultType[] = ["all", "stories", "users", "tags"];

const COPY = {
  fa: {
    language: "fa",

    eyebrow: "کشف و جست‌وجو",
    title: "مرور محتوا",
    description:
      "داستان‌ها، نویسندگان و برچسب‌ها را از یک صفحه پیدا و فیلتر کنید.",

    search: {
      label: "عبارت جست‌وجو",
      placeholder: "نام داستان، نویسنده یا برچسب",
      submit: "جست‌وجو",
      clear: "پاک‌کردن جست‌وجو",
    },

    filtersTitle: "فیلتر نتایج",
    resultType: "نوع نتیجه",

    types: {
      all: "همه",
      stories: "داستان‌ها",
      users: "نویسندگان",
      tags: "برچسب‌ها",
    },

    filters: {
      genre: "ژانر",
      language: "زبان",
      sort: "مرتب‌سازی",
      allGenres: "همه ژانرها",
      allLanguages: "همه زبان‌ها",
    },

    languages: {
      en: "انگلیسی",
      fa: "فارسی",
      bilingual: "دوزبانه",
    },

    sort: {
      relevance: "مرتبط‌ترین",
      mostRead: "پربازدیدترین",
      mostVoted: "پرامتیازترین",
      newest: "جدیدترین",
    },

    genreList: "فیلتر سریع ژانرها",

    activeTag: (tag: string) => "برچسب فعال: " + tag,
    clearTag: "حذف فیلتر برچسب",

    loading: "در حال دریافت نتایج…",

    minimumTitle: "عبارت جست‌وجو را کامل کنید",
    minimum:
      "برای جست‌وجوی همه نتایج، نویسندگان یا برچسب‌ها حداقل دو نویسه وارد کنید.",

    emptyTitle: "نتیجه‌ای پیدا نشد",
    empty: "عبارت یا فیلترهای دیگری را امتحان کنید.",

    resultCount: (value: number) =>
      value.toLocaleString("fa-IR") + " نتیجه در این صفحه",

    sections: {
      stories: "داستان‌ها",
      users: "نویسندگان",
      tags: "برچسب‌ها",
    },

    sectionCount: (value: number) => value.toLocaleString("fa-IR") + " مورد",

    userProfile: (name: string) => "مشاهده پروفایل " + name,

    tagStoryCount: (value: number) => value.toLocaleString("fa-IR") + " داستان",

    browseTag: (name: string) => "نمایش داستان‌های برچسب " + name,

    pagination: "صفحه‌های نتایج",

    page: (value: number) => "صفحه " + value.toLocaleString("fa-IR"),

    previous: "قبلی",
    next: "بعدی",
  },

  en: {
    language: "en",

    eyebrow: "Discover and search",
    title: "Browse content",
    description:
      "Find and filter stories, writers, and tags from one unified page.",

    search: {
      label: "Search query",
      placeholder: "Story title, writer, or tag",
      submit: "Search",
      clear: "Clear search",
    },

    filtersTitle: "Filter results",
    resultType: "Result type",

    types: {
      all: "All",
      stories: "Stories",
      users: "Writers",
      tags: "Tags",
    },

    filters: {
      genre: "Genre",
      language: "Language",
      sort: "Sort",
      allGenres: "All genres",
      allLanguages: "All languages",
    },

    languages: {
      en: "English",
      fa: "Persian",
      bilingual: "Bilingual",
    },

    sort: {
      relevance: "Relevance",
      mostRead: "Most read",
      mostVoted: "Most voted",
      newest: "Newest",
    },

    genreList: "Quick genre filters",

    activeTag: (tag: string) => "Active tag: " + tag,
    clearTag: "Clear tag filter",

    loading: "Loading results…",

    minimumTitle: "Complete your search query",
    minimum:
      "Enter at least two characters to search all results, writers, or tags.",

    emptyTitle: "No results found",
    empty: "Try a different query or change the active filters.",

    resultCount: (value: number) =>
      value.toLocaleString("en-US") + " results on this page",

    sections: {
      stories: "Stories",
      users: "Writers",
      tags: "Tags",
    },

    sectionCount: (value: number) => value.toLocaleString("en-US") + " items",

    userProfile: (name: string) => "View " + name + " profile",

    tagStoryCount: (value: number) =>
      value.toLocaleString("en-US") + " stories",

    browseTag: (name: string) => "Browse stories tagged " + name,

    pagination: "Result pages",

    page: (value: number) => "Page " + value.toLocaleString("en-US"),

    previous: "Previous",
    next: "Next",
  },
} as const;

interface BrowseSearchFormProps {
  initialQuery: string;
  copy: (typeof COPY)["fa"] | (typeof COPY)["en"];
  onSearch: (query: string) => void;
}

function BrowseSearchForm({
  initialQuery,
  copy,
  onSearch,
}: BrowseSearchFormProps) {
  const [value, setValue] = useState(initialQuery);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSearch(value.trim());
  }

  function clear(): void {
    setValue("");
    onSearch("");
  }

  return (
    <form className="browse-search" role="search" onSubmit={submit}>
      <label className="sr-only" htmlFor="browse-search-query">
        {copy.search.label}
      </label>

      <div className="browse-search__field">
        <Search aria-hidden="true" />

        <input
          id="browse-search-query"
          type="search"
          dir="auto"
          minLength={2}
          maxLength={100}
          placeholder={copy.search.placeholder}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />

        {value ? (
          <button
            type="button"
            aria-label={copy.search.clear}
            title={copy.search.clear}
            onClick={clear}
          >
            <X aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <button className="button button--primary" type="submit">
        <Search aria-hidden="true" />
        <span>{copy.search.submit}</span>
      </button>
    </form>
  );
}

function isBrowseSort(value: string | null): value is BrowseSort {
  return (
    value === "relevance" ||
    value === "mostRead" ||
    value === "mostVoted" ||
    value === "newest"
  );
}

function normalizeResultType(value: string | null): BrowseResultType {
  return RESULT_TYPES.includes(value as BrowseResultType)
    ? (value as BrowseResultType)
    : "stories";
}

function userInitial(user: BrowseUser): string {
  return (
    user.displayName.trim().slice(0, 1) ||
    user.username.trim().slice(0, 1) ||
    "?"
  ).toLocaleUpperCase();
}

export default function BrowsePage({ kind }: BrowsePageProps) {
  const { i18n, t } = useTranslation();
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { status, request } = useAuth();

  const isEnglish = i18n.resolvedLanguage?.startsWith("en") ?? false;

  const copy = isEnglish ? COPY.en : COPY.fa;
  const direction = isEnglish ? "ltr" : "rtl";

  const [genres, setGenres] = useState<Genre[]>([]);

  const [browseResult, setBrowseResult] = useState<{
    path: string;
    data: BrowseResponse["data"] | null;
    error: string | null;
  } | null>(null);

  const query = (searchParams.get("q") ?? "").trim();

  const resultType = kind
    ? "stories"
    : normalizeResultType(searchParams.get("type"));

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const selectedGenre =
    kind === "genre" ? slug : (searchParams.get("genre") ?? "all");

  const selectedTag = kind === "tag" ? slug : (searchParams.get("tag") ?? "");

  const selectedLanguage = searchParams.get("language") ?? "all";

  const sortParam = searchParams.get("sort");

  let selectedSort: BrowseSort = query ? "relevance" : "mostRead";

  if (isBrowseSort(sortParam) && (query || sortParam !== "relevance")) {
    selectedSort = sortParam;
  }

  const queryIsTooShort = query.length === 1;

  const resultTypeNeedsQuery = resultType !== "stories" && query.length < 2;

  const requestIsAllowed = !queryIsTooShort && !resultTypeNeedsQuery;

  const browsePath = useMemo(() => {
    if (!requestIsAllowed) {
      return null;
    }

    const params = new URLSearchParams({
      type: resultType,
    });

    if (resultType === "stories") {
      params.set("sort", selectedSort);
    }

    params.set("page", String(page));
    params.set("limit", "20");

    if (query) {
      params.set("q", query);
    }

    if (resultType === "stories") {
      if (selectedGenre !== "all") {
        params.set("genre", selectedGenre);
      }

      if (selectedTag) {
        params.set("tag", selectedTag);
      }

      if (selectedLanguage !== "all") {
        params.set("language", selectedLanguage);
      }
    }

    return "/api/v1/search?" + params.toString();
  }, [
    page,
    query,
    requestIsAllowed,
    resultType,
    selectedGenre,
    selectedLanguage,
    selectedSort,
    selectedTag,
  ]);

  const currentResult = browseResult?.path === browsePath ? browseResult : null;

  const result = currentResult?.data ?? null;
  const error = currentResult?.error ?? null;

  const loading = browsePath !== null && currentResult === null;

  const stories = result?.stories ?? [];
  const users = result?.users ?? [];
  const tags = result?.tags ?? [];

  const visibleResultCount = stories.length + users.length + tags.length;

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
        if (!controller.signal.aborted) {
          setGenres(response.data.genres);
        }
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
        if (!controller.signal.aborted) {
          setBrowseResult({
            path: browsePath,
            data: response.data,
            error: null,
          });
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setBrowseResult({
            path: browsePath,
            data: null,
            error: getErrorMessage(cause),
          });
        }
      });

    return () => controller.abort();
  }, [browsePath, request, status]);

  function paramsWithRouteFilter(): URLSearchParams {
    const nextParams = new URLSearchParams(searchParams);

    if (kind === "genre" && slug) {
      nextParams.set("genre", slug);
    }

    if (kind === "tag" && slug) {
      nextParams.set("tag", slug);
    }

    return nextParams;
  }

  function commitParams(nextParams: URLSearchParams): void {
    nextParams.delete("page");

    if (kind) {
      navigate(
        "/browse" + (nextParams.size > 0 ? "?" + nextParams.toString() : ""),
      );

      return;
    }

    setSearchParams(nextParams);
  }

  function updateSearch(nextQuery: string): void {
    const nextParams = paramsWithRouteFilter();

    if (nextQuery) {
      nextParams.set("q", nextQuery);
    } else {
      nextParams.delete("q");

      if (nextParams.get("sort") === "relevance") {
        nextParams.delete("sort");
      }
    }

    commitParams(nextParams);
  }

  function updateStoryFilter(
    name: "genre" | "language" | "sort",
    value: string,
  ): void {
    const nextParams = paramsWithRouteFilter();

    nextParams.delete("type");

    const defaultSort = query ? "relevance" : "mostRead";

    if ((name === "genre" || name === "language") && value === "all") {
      nextParams.delete(name);
    } else if (name === "sort" && value === defaultSort) {
      nextParams.delete(name);
    } else {
      nextParams.set(name, value);
    }

    commitParams(nextParams);
  }

  function handleSelectChange(
    name: "genre" | "language" | "sort",
    event: ChangeEvent<HTMLSelectElement>,
  ): void {
    updateStoryFilter(name, event.target.value);
  }

  function clearTagFilter(): void {
    const nextParams = paramsWithRouteFilter();

    nextParams.delete("tag");

    commitParams(nextParams);
  }

  function typePath(value: BrowseResultType): string {
    const nextParams = paramsWithRouteFilter();

    nextParams.delete("page");

    if (value === "stories") {
      nextParams.delete("type");
    } else {
      nextParams.set("type", value);
      nextParams.delete("genre");
      nextParams.delete("tag");
      nextParams.delete("language");
      nextParams.delete("sort");
    }

    return "/browse" + (nextParams.size > 0 ? "?" + nextParams.toString() : "");
  }

  function pagePath(nextPage: number): string {
    const nextParams = paramsWithRouteFilter();

    if (nextPage <= 1) {
      nextParams.delete("page");
    } else {
      nextParams.set("page", String(nextPage));
    }

    return "/browse" + (nextParams.size > 0 ? "?" + nextParams.toString() : "");
  }

  function translatedGenre(genre: Genre): string {
    return t("genres.items." + genre.slug, {
      defaultValue: genre.name,
    });
  }

  const PreviousIcon = direction === "rtl" ? ChevronRight : ChevronLeft;

  const NextIcon = direction === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <main
      className="page-shell browse-page"
      dir={direction}
      lang={copy.language}
    >
      <section className="browse-hero" aria-labelledby="browse-title">
        <div className="browse-hero__copy">
          <span className="browse-hero__icon" aria-hidden="true">
            <Compass />
          </span>

          <div>
            <p className="eyebrow">{copy.eyebrow}</p>

            <h1 id="browse-title">{copy.title}</h1>

            <p>{copy.description}</p>
          </div>
        </div>

        <BrowseSearchForm
          key={query}
          initialQuery={query}
          copy={copy}
          onSearch={updateSearch}
        />
      </section>

      <section
        className="browse-filter-panel"
        aria-labelledby="browse-filters-title"
      >
        <header>
          <SlidersHorizontal aria-hidden="true" />

          <h2 id="browse-filters-title">{copy.filtersTitle}</h2>
        </header>

        <div className="browse-result-types">
          <span>{copy.resultType}</span>

          <nav aria-label={copy.resultType}>
            {RESULT_TYPES.map((value) => {
              const active = resultType === value;

              const Icon =
                value === "all"
                  ? LayoutGrid
                  : value === "stories"
                    ? BookOpen
                    : value === "users"
                      ? Users
                      : Tags;

              return (
                <Link
                  key={value}
                  className={active ? "is-active" : undefined}
                  aria-current={active ? "page" : undefined}
                  to={typePath(value)}
                >
                  <Icon aria-hidden="true" />
                  <span>{copy.types[value]}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {resultType === "stories" ? (
          <>
            <div className="browse-story-filters">
              <label className="browse-select browse-select--with-icon">
                <span>{copy.filters.genre}</span>

                <div>
                  <SlidersHorizontal aria-hidden="true" />

                  <select
                    value={selectedGenre}
                    onChange={(event) => handleSelectChange("genre", event)}
                  >
                    <option value="all">{copy.filters.allGenres}</option>

                    {genres.map((genre) => (
                      <option key={genre.slug} value={genre.slug}>
                        {translatedGenre(genre)}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <label className="browse-select">
                <span>{copy.filters.language}</span>

                <div>
                  <select
                    value={selectedLanguage}
                    onChange={(event) => handleSelectChange("language", event)}
                  >
                    <option value="all">{copy.filters.allLanguages}</option>

                    <option value="en">{copy.languages.en}</option>

                    <option value="fa">{copy.languages.fa}</option>

                    <option value="bilingual">
                      {copy.languages.bilingual}
                    </option>
                  </select>
                </div>
              </label>

              <label className="browse-select">
                <span>{copy.filters.sort}</span>

                <div>
                  <select
                    value={selectedSort}
                    onChange={(event) => handleSelectChange("sort", event)}
                  >
                    {query ? (
                      <option value="relevance">{copy.sort.relevance}</option>
                    ) : null}

                    <option value="mostRead">{copy.sort.mostRead}</option>

                    <option value="mostVoted">{copy.sort.mostVoted}</option>

                    <option value="newest">{copy.sort.newest}</option>
                  </select>
                </div>
              </label>
            </div>

            <div className="browse-genres" aria-label={copy.genreList}>
              <button
                type="button"
                className={selectedGenre === "all" ? "is-active" : undefined}
                aria-pressed={selectedGenre === "all"}
                onClick={() => updateStoryFilter("genre", "all")}
              >
                {copy.filters.allGenres}
              </button>

              {genres.map((genre) => {
                const active = selectedGenre === genre.slug;

                return (
                  <button
                    key={genre.slug}
                    type="button"
                    className={active ? "is-active" : undefined}
                    aria-pressed={active}
                    onClick={() => updateStoryFilter("genre", genre.slug)}
                  >
                    {translatedGenre(genre)}
                  </button>
                );
              })}
            </div>

            {selectedTag ? (
              <div className="browse-active-tag">
                <Hash aria-hidden="true" />

                <span>{copy.activeTag(selectedTag)}</span>

                <button
                  type="button"
                  aria-label={copy.clearTag}
                  title={copy.clearTag}
                  onClick={clearTagFilter}
                >
                  <X aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      {queryIsTooShort || resultTypeNeedsQuery ? (
        <section className="browse-empty">
          <span aria-hidden="true">
            <Search />
          </span>

          <h2>{copy.minimumTitle}</h2>
          <p>{copy.minimum}</p>
        </section>
      ) : loading ? (
        <section className="browse-loading" aria-live="polite" aria-busy="true">
          <LoaderCircle aria-hidden="true" />
          <p>{copy.loading}</p>
        </section>
      ) : error ? (
        <div className="browse-error" role="alert">
          <CircleAlert aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : result ? (
        <>
          <header className="browse-results-heading">
            <div>
              <p>{copy.types[resultType]}</p>

              {query ? <h2 dir="auto">“{query}”</h2> : <h2>{copy.title}</h2>}
            </div>

            <span>{copy.resultCount(visibleResultCount)}</span>
          </header>

          {visibleResultCount === 0 ? (
            <section className="browse-empty">
              <span aria-hidden="true">
                <Search />
              </span>

              <h2>{copy.emptyTitle}</h2>
              <p>{copy.empty}</p>
            </section>
          ) : null}

          {stories.length > 0 ? (
            <section
              className="browse-results-section"
              aria-labelledby="browse-stories-title"
            >
              <header>
                <div>
                  <BookOpen aria-hidden="true" />

                  <h2 id="browse-stories-title">{copy.sections.stories}</h2>
                </div>

                <span>{copy.sectionCount(stories.length)}</span>
              </header>

              <div className="browse-story-grid">
                {stories.map((story) => (
                  <StoryCard key={story.id} story={story} />
                ))}
              </div>
            </section>
          ) : null}

          {users.length > 0 ? (
            <section
              className="browse-results-section"
              aria-labelledby="browse-users-title"
            >
              <header>
                <div>
                  <Users aria-hidden="true" />

                  <h2 id="browse-users-title">{copy.sections.users}</h2>
                </div>

                <span>{copy.sectionCount(users.length)}</span>
              </header>

              <ul className="browse-users">
                {users.map((user) => (
                  <li key={user.id}>
                    <Link
                      to={"/users/" + encodeURIComponent(user.username)}
                      aria-label={copy.userProfile(user.displayName)}
                    >
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" />
                      ) : (
                        <span className="browse-user-avatar" aria-hidden="true">
                          {userInitial(user)}
                        </span>
                      )}

                      <span className="browse-user-copy">
                        <strong dir="auto">{user.displayName}</strong>

                        <small dir="ltr">@{user.username}</small>

                        {user.bio ? <p dir="auto">{user.bio}</p> : null}
                      </span>

                      <UserRound aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {tags.length > 0 ? (
            <section
              className="browse-results-section"
              aria-labelledby="browse-tags-title"
            >
              <header>
                <div>
                  <Tags aria-hidden="true" />

                  <h2 id="browse-tags-title">{copy.sections.tags}</h2>
                </div>

                <span>{copy.sectionCount(tags.length)}</span>
              </header>

              <div className="browse-tags">
                {tags.map((tag) => (
                  <Link
                    key={tag.slug}
                    to={"/browse?tag=" + encodeURIComponent(tag.slug)}
                    aria-label={copy.browseTag(tag.name)}
                  >
                    <span aria-hidden="true">
                      <Hash />
                    </span>

                    <strong dir="auto">{tag.name}</strong>

                    <small>{copy.tagStoryCount(tag.storyCount)}</small>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {page > 1 || result.pagination.hasMore ? (
            <nav className="browse-pagination" aria-label={copy.pagination}>
              {page > 1 ? (
                <Link
                  className="button button--secondary"
                  to={pagePath(page - 1)}
                >
                  <PreviousIcon aria-hidden="true" />
                  <span>{copy.previous}</span>
                </Link>
              ) : (
                <span />
              )}

              <strong>{copy.page(page)}</strong>

              {result.pagination.hasMore ? (
                <Link
                  className="button button--secondary"
                  to={pagePath(page + 1)}
                >
                  <span>{copy.next}</span>
                  <NextIcon aria-hidden="true" />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
