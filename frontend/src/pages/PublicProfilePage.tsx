import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  BookOpen,
  CalendarDays,
  Library,
  UserCheck,
  UserMinus,
  UserPlus,
  UsersRound,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router-dom";

import ProfileSettings from "../components/ProfileSettings";
import ReportForm from "../components/ReportForm";
import StoryCard from "../components/StoryCard";
import useAuth from "../hooks/useAuth";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";
import {
  isProfileSettingsSection,
  type ProfileSettingsSection,
} from "../lib/profile-settings";
import type { Story } from "../types/story";

import "./Profile.css";

interface Pagination {
  hasMore: boolean;
  nextCursor: string | null;
}

interface Profile {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  counts: {
    followers: number;
    following: number;
    publishedStories: number;
  };
  createdAt: string;
}

interface ProfileResponse {
  data: {
    user: Profile;
  };
}

interface StoriesResponse {
  data: {
    stories: Story[];
    pagination: Pagination;
  };
}

interface RelationshipResponse {
  data: {
    following: boolean;
    blocked: boolean;
    blockedByTarget: boolean;
    muted: boolean;
  };
}

interface ReadingList {
  id: string;
  name: string;
  description: string | null;
}

interface ListsResponse {
  data: {
    lists: ReadingList[];
  };
}

interface SocialUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface SocialPageResponse {
  data: {
    users: SocialUser[];
    pagination: Pagination;
  };
}

interface SocialRequestResult {
  response: SocialPageResponse | null;
  error: string | null;
}

type SocialKind = "followers" | "following";

type ProfileTab = "followers" | "following" | "stories" | "reading-lists";

type RelationshipAction = "follow" | "block" | "mute";

function createSocialPaginationState(): Record<SocialKind, Pagination> {
  return {
    followers: {
      hasMore: false,
      nextCursor: null,
    },
    following: {
      hasMore: false,
      nextCursor: null,
    },
  };
}

async function fetchSocialPage(
  path: string,
  signal?: AbortSignal,
): Promise<SocialRequestResult> {
  try {
    const response = await apiRequest<SocialPageResponse>(path, { signal });

    return {
      response,
      error: null,
    };
  } catch (cause) {
    if (signal?.aborted) {
      return {
        response: null,
        error: null,
      };
    }

    return {
      response: null,
      error: getErrorMessage(cause),
    };
  }
}

export default function PublicProfilePage() {
  const { username = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { i18n, t } = useTranslation();
  const { status, user: viewer, request } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [lists, setLists] = useState<ReadingList[]>([]);

  const [followers, setFollowers] = useState<SocialUser[]>([]);
  const [following, setFollowing] = useState<SocialUser[]>([]);

  const [socialPagination, setSocialPagination] = useState<
    Record<SocialKind, Pagination>
  >(createSocialPaginationState);

  const [socialErrors, setSocialErrors] = useState<
    Record<SocialKind, string | null>
  >({
    followers: null,
    following: null,
  });

  const [loadingSocial, setLoadingSocial] = useState<SocialKind | null>(null);

  const [relationship, setRelationship] = useState<
    RelationshipResponse["data"] | null
  >(null);

  const [activeTab, setActiveTab] = useState<ProfileTab>("stories");
  const [loading, setLoading] = useState(true);

  const [mutatingAction, setMutatingAction] =
    useState<RelationshipAction | null>(null);

  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      const encodedUsername = encodeURIComponent(username);

      const storiesPath = `/api/v1/stories?author=${encodedUsername}&limit=24`;
      const listsPath = `/api/v1/users/${encodedUsername}/reading-lists`;

      const followersPath = `/api/v1/users/${encodedUsername}/followers?limit=50`;

      const followingPath = `/api/v1/users/${encodedUsername}/following?limit=50`;

      const storiesPromise =
        status === "authenticated"
          ? request<StoriesResponse>(storiesPath, { signal })
          : apiRequest<StoriesResponse>(storiesPath, { signal });

      const listsPromise =
        status === "authenticated"
          ? request<ListsResponse>(listsPath, { signal })
          : apiRequest<ListsResponse>(listsPath, { signal });

      const relationshipPromise: Promise<RelationshipResponse | null> =
        status === "authenticated" && viewer?.username !== username
          ? request<RelationshipResponse>(
              `/api/v1/users/${encodedUsername}/relationship`,
              { signal },
            )
          : Promise.resolve(null);

      const followersPromise = fetchSocialPage(followersPath, signal);
      const followingPromise = fetchSocialPage(followingPath, signal);

      const [
        profileResponse,
        storiesResponse,
        listsResponse,
        relationshipResponse,
        followersResult,
        followingResult,
      ] = await Promise.all([
        apiRequest<ProfileResponse>(`/api/v1/users/${encodedUsername}`, {
          signal,
        }),
        storiesPromise,
        listsPromise,
        relationshipPromise,
        followersPromise,
        followingPromise,
      ]);

      if (signal?.aborted) {
        return;
      }

      const followersData = followersResult.response?.data;
      const followingData = followingResult.response?.data;

      setProfile(profileResponse.data.user);
      setStories(storiesResponse.data.stories);
      setLists(listsResponse.data.lists);
      setRelationship(relationshipResponse?.data ?? null);

      setFollowers(followersData?.users ?? []);
      setFollowing(followingData?.users ?? []);

      setSocialPagination({
        followers:
          followersData?.pagination ?? createSocialPaginationState().followers,
        following:
          followingData?.pagination ?? createSocialPaginationState().following,
      });

      setSocialErrors({
        followers: followersResult.error,
        following: followingResult.error,
      });
    },
    [request, status, username, viewer],
  );

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    const controller = new AbortController();

    const loadTimer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      setProfile(null);
      setStories([]);
      setLists([]);
      setFollowers([]);
      setFollowing([]);
      setRelationship(null);
      setActiveTab("stories");
      setLoadingSocial(null);
      setSocialPagination(createSocialPaginationState());
      setSocialErrors({
        followers: null,
        following: null,
      });

      void load(controller.signal)
        .catch((cause: unknown) => {
          if (!controller.signal.aborted) {
            setError(getErrorMessage(cause));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoading(false);
          }
        });
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
      controller.abort();
    };
  }, [load, status]);

  async function mutateRelationship(
    action: RelationshipAction,
    active: boolean,
  ): Promise<void> {
    setError(null);
    setMutatingAction(action);

    try {
      await request(`/api/v1/users/${encodeURIComponent(username)}/${action}`, {
        method: active ? "DELETE" : "POST",
      });

      await load();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setMutatingAction(null);
    }
  }

  async function loadSocialPage(
    kind: SocialKind,
    cursor?: string,
  ): Promise<void> {
    if (loadingSocial !== null) {
      return;
    }

    setLoadingSocial(kind);

    try {
      const encodedUsername = encodeURIComponent(username);

      const cursorQuery = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";

      const response = await apiRequest<SocialPageResponse>(
        `/api/v1/users/${encodedUsername}/${kind}?limit=50${cursorQuery}`,
      );

      const incomingUsers = response.data.users;

      const updateUsers = (currentUsers: SocialUser[]) => {
        if (!cursor) {
          return incomingUsers;
        }

        const existingIds = new Set(
          currentUsers.map((socialUser) => socialUser.id),
        );

        return [
          ...currentUsers,
          ...incomingUsers.filter(
            (socialUser) => !existingIds.has(socialUser.id),
          ),
        ];
      };

      if (kind === "followers") {
        setFollowers(updateUsers);
      } else {
        setFollowing(updateUsers);
      }

      setSocialPagination((current) => ({
        ...current,
        [kind]: response.data.pagination,
      }));

      setSocialErrors((current) => ({
        ...current,
        [kind]: null,
      }));
    } catch (cause) {
      setSocialErrors((current) => ({
        ...current,
        [kind]: getErrorMessage(cause),
      }));
    } finally {
      setLoadingSocial((current) => (current === kind ? null : current));
    }
  }

  if (!profile) {
    return (
      <main className="profile-page-shell" dir={i18n.dir()} aria-busy={loading}>
        <div className="profile-status surface">
          {loading ? (
            <>
              <span className="profile-status__spinner" aria-hidden="true" />
              <p aria-live="polite">{t("profile.loading")}</p>
            </>
          ) : (
            <p className="status-message" data-kind="error" role="alert">
              {error}
            </p>
          )}
        </div>
      </main>
    );
  }

  const language = i18n.resolvedLanguage?.startsWith("fa") ? "fa" : "en";
  const locale = language === "fa" ? "fa-IR" : "en-US";

  const createdAt = new Date(profile.createdAt);

  const joinedDate = Number.isNaN(createdAt.getTime())
    ? null
    : new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
      }).format(createdAt);

  const isSelf =
    status === "authenticated" && viewer?.username === profile.username;

  const settingsParameter = searchParams.get("settings");
  const activeSettingsSection = isProfileSettingsSection(settingsParameter)
    ? settingsParameter
    : null;

  function selectSettingsSection(section: ProfileSettingsSection) {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("settings", section);
    setSearchParams(nextSearchParams, {
      replace: activeSettingsSection !== null,
    });
  }

  function closeSettings() {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("settings");
    setSearchParams(nextSearchParams, { replace: true });
  }

  const avatarFallback =
    profile.displayName.trim().charAt(0) ||
    profile.username.trim().charAt(0).toUpperCase();

  const FollowIcon = relationship?.following ? UserMinus : UserPlus;
  const MuteIcon = relationship?.muted ? Volume2 : VolumeX;
  const actionIsPending = mutatingAction !== null;

  function renderSocialPanel(kind: SocialKind) {
    const users = kind === "followers" ? followers : following;
    const pagination = socialPagination[kind];
    const socialError = socialErrors[kind];
    const isSocialLoading = loadingSocial === kind;
    const SocialIcon = kind === "followers" ? UsersRound : UserCheck;

    const heading =
      kind === "followers"
        ? t("profile.stats.followers")
        : t("profile.stats.following");

    const emptyMessage =
      kind === "followers"
        ? t("profile.social.emptyFollowers")
        : t("profile.social.emptyFollowing");

    return (
      <div
        id={`profile-panel-${kind}`}
        className="profile-tab-panel"
        role="region"
        aria-labelledby={`profile-menu-${kind}`}
      >
        <div className="profile-section-heading">
          <h2>{heading}</h2>
        </div>

        {socialError ? (
          <p
            className="status-message profile-social-error"
            data-kind="error"
            role="alert"
          >
            {socialError}
          </p>
        ) : null}

        {users.length === 0 && !socialError ? (
          <div className="profile-empty-state">
            <span className="profile-empty-state__icon">
              <SocialIcon aria-hidden="true" />
            </span>

            <p>{emptyMessage}</p>
          </div>
        ) : users.length > 0 ? (
          <ul className="profile-social-list">
            {users.map((socialUser) => {
              const socialAvatarFallback =
                socialUser.displayName.trim().charAt(0) ||
                socialUser.username.trim().charAt(0).toUpperCase();

              return (
                <li key={socialUser.id}>
                  <Link
                    className="profile-social-user"
                    to={`/users/${encodeURIComponent(socialUser.username)}`}
                  >
                    <span className="profile-social-user__avatar">
                      {socialUser.avatarUrl ? (
                        <img
                          referrerPolicy="no-referrer"
                          src={socialUser.avatarUrl}
                          alt={t("profile.avatarAlt", {
                            name: socialUser.displayName,
                          })}
                          width={48}
                          height={48}
                        />
                      ) : (
                        <span aria-hidden="true">{socialAvatarFallback}</span>
                      )}
                    </span>

                    <span className="profile-social-user__content">
                      <strong>{socialUser.displayName}</strong>

                      <span dir="ltr">@{socialUser.username}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}

        {socialError || pagination.hasMore ? (
          <div className="profile-social-actions">
            <button
              className="profile-action profile-action--secondary"
              type="button"
              disabled={isSocialLoading}
              onClick={() =>
                void loadSocialPage(
                  kind,
                  socialError
                    ? undefined
                    : (pagination.nextCursor ?? undefined),
                )
              }
            >
              {isSocialLoading
                ? t("profile.social.loadingMore")
                : socialError
                  ? t("profile.social.retry")
                  : t("profile.social.loadMore")}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <main className="profile-page-shell" dir={i18n.dir()} lang={language}>
      <header className="profile-hero-card surface">
        <div className="profile-hero-card__decoration" />

        <div className="profile-hero-content">
          <div className="profile-identity">
            <div className="profile-avatar">
              {profile.avatarUrl ? (
                <img
                  referrerPolicy="no-referrer"
                  src={profile.avatarUrl}
                  alt={t("profile.avatarAlt", {
                    name: profile.displayName,
                  })}
                  width={112}
                  height={112}
                />
              ) : (
                <span aria-hidden="true">{avatarFallback}</span>
              )}
            </div>

            <div className="profile-identity__content">
              <div className="profile-name-row">
                <div>
                  <h1>{profile.displayName}</h1>

                  <p className="profile-username" dir="ltr">
                    @{profile.username}
                  </p>
                </div>
              </div>

              <p
                className={
                  profile.bio ? "profile-bio" : "profile-bio profile-bio--empty"
                }
              >
                {profile.bio ?? t("profile.noBio")}
              </p>

              {joinedDate ? (
                <p className="profile-joined">
                  <CalendarDays aria-hidden="true" />
                  {t("profile.joined", { date: joinedDate })}
                </p>
              ) : null}
            </div>
          </div>

          <div className="profile-actions" aria-busy={actionIsPending}>
            {isSelf ? (
              <ProfileSettings
                activeSection={activeSettingsSection}
                onSelect={selectSettingsSection}
                onClose={closeSettings}
                onProfileUpdated={load}
              />
            ) : status === "authenticated" && relationship ? (
              <>
                <button
                  className="profile-action profile-action--primary"
                  type="button"
                  disabled={
                    actionIsPending ||
                    relationship.blocked ||
                    relationship.blockedByTarget
                  }
                  aria-pressed={relationship.following}
                  onClick={() =>
                    void mutateRelationship("follow", relationship.following)
                  }
                >
                  <FollowIcon aria-hidden="true" />

                  {relationship.following
                    ? t("profile.actions.unfollow")
                    : t("profile.actions.follow")}
                </button>

                <button
                  className="profile-action profile-action--secondary"
                  type="button"
                  disabled={actionIsPending}
                  aria-pressed={relationship.muted}
                  onClick={() =>
                    void mutateRelationship("mute", relationship.muted)
                  }
                >
                  <MuteIcon aria-hidden="true" />

                  {relationship.muted
                    ? t("profile.actions.unmute")
                    : t("profile.actions.mute")}
                </button>

                <button
                  className="profile-action profile-action--danger"
                  type="button"
                  disabled={actionIsPending}
                  aria-pressed={relationship.blocked}
                  onClick={() =>
                    void mutateRelationship("block", relationship.blocked)
                  }
                >
                  <Ban aria-hidden="true" />

                  {relationship.blocked
                    ? t("profile.actions.unblock")
                    : t("profile.actions.block")}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <nav
        className="profile-menu surface"
        aria-label={t("profile.tabs.ariaLabel")}
      >
        <button
          id="profile-menu-followers"
          className={
            activeTab === "followers"
              ? "profile-menu__item profile-menu__item--active"
              : "profile-menu__item"
          }
          type="button"
          aria-pressed={activeTab === "followers"}
          aria-controls="profile-panel-followers"
          onClick={() => setActiveTab("followers")}
        >
          <UsersRound aria-hidden="true" />
          <span>{t("profile.stats.followers")}</span>
        </button>

        <button
          id="profile-menu-following"
          className={
            activeTab === "following"
              ? "profile-menu__item profile-menu__item--active"
              : "profile-menu__item"
          }
          type="button"
          aria-pressed={activeTab === "following"}
          aria-controls="profile-panel-following"
          onClick={() => setActiveTab("following")}
        >
          <UserCheck aria-hidden="true" />
          <span>{t("profile.stats.following")}</span>
        </button>

        <button
          id="profile-menu-stories"
          className={
            activeTab === "stories"
              ? "profile-menu__item profile-menu__item--active"
              : "profile-menu__item"
          }
          type="button"
          aria-pressed={activeTab === "stories"}
          aria-controls="profile-panel-stories"
          onClick={() => setActiveTab("stories")}
        >
          <BookOpen aria-hidden="true" />
          <span>{t("profile.tabs.stories")}</span>
        </button>

        <button
          id="profile-menu-reading-lists"
          className={
            activeTab === "reading-lists"
              ? "profile-menu__item profile-menu__item--active"
              : "profile-menu__item"
          }
          type="button"
          aria-pressed={activeTab === "reading-lists"}
          aria-controls="profile-panel-reading-lists"
          onClick={() => setActiveTab("reading-lists")}
        >
          <Library aria-hidden="true" />
          <span>{t("profile.tabs.readingLists")}</span>
        </button>
      </nav>

      {status === "authenticated" && !isSelf ? (
        <div className="profile-report">
          <ReportForm targetType="USER" targetId={profile.id} />
        </div>
      ) : null}

      {error ? (
        <p
          className="status-message profile-error"
          data-kind="error"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <section className="profile-content-card surface">
        {activeTab === "stories" ? (
          <div
            id="profile-panel-stories"
            className="profile-tab-panel"
            role="region"
            aria-labelledby="profile-menu-stories"
          >
            <div className="profile-section-heading">
              <h2>{t("profile.stories.title")}</h2>
            </div>

            {stories.length === 0 ? (
              <div className="profile-empty-state">
                <span className="profile-empty-state__icon">
                  <BookOpen aria-hidden="true" />
                </span>

                <p>{t("profile.stories.empty")}</p>
              </div>
            ) : (
              <div className="story-grid profile-story-grid">
                {stories.map((story) => (
                  <StoryCard key={story.id} story={story} variant="home" />
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "reading-lists" ? (
          <div
            id="profile-panel-reading-lists"
            className="profile-tab-panel"
            role="region"
            aria-labelledby="profile-menu-reading-lists"
          >
            <div className="profile-section-heading">
              <h2>{t("profile.lists.title")}</h2>
            </div>

            {lists.length === 0 ? (
              <div className="profile-empty-state">
                <span className="profile-empty-state__icon">
                  <Library aria-hidden="true" />
                </span>

                <p>{t("profile.lists.empty")}</p>
              </div>
            ) : (
              <div className="profile-reading-lists">
                {lists.map((list) => (
                  <Link
                    key={list.id}
                    className="profile-reading-list"
                    to={`/reading-lists/${list.id}`}
                    aria-label={t("profile.lists.open", {
                      name: list.name,
                    })}
                  >
                    <span className="profile-reading-list__icon">
                      <Library aria-hidden="true" />
                    </span>

                    <span className="profile-reading-list__content">
                      <strong>{list.name}</strong>

                      <span>
                        {list.description ?? t("profile.lists.noDescription")}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          renderSocialPanel(activeTab)
        )}
      </section>
    </main>
  );
}
