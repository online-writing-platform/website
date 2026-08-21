import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  BookOpen,
  CalendarDays,
  Edit3,
  Library,
  UserCheck,
  UserMinus,
  UserPlus,
  UsersRound,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import ReportForm from "../components/ReportForm";
import StoryCard from "../components/StoryCard";
import useAuth from "../hooks/useAuth";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";
import type { Story } from "../types/story";

import "./Profile.css";

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
    pagination: {
      hasMore: boolean;
      nextCursor: string | null;
    };
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

type ProfileTab = "stories" | "reading-lists";
type RelationshipAction = "follow" | "block" | "mute";

export default function PublicProfilePage() {
  const { username = "" } = useParams();
  const { i18n, t } = useTranslation();
  const { status, user: viewer, request } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [lists, setLists] = useState<ReadingList[]>([]);
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

      const [
        profileResponse,
        storiesResponse,
        listsResponse,
        relationshipResponse,
      ] = await Promise.all([
        apiRequest<ProfileResponse>(`/api/v1/users/${encodedUsername}`, {
          signal,
        }),
        storiesPromise,
        listsPromise,
        relationshipPromise,
      ]);

      if (signal?.aborted) {
        return;
      }

      setProfile(profileResponse.data.user);
      setStories(storiesResponse.data.stories);
      setLists(listsResponse.data.lists);
      setRelationship(relationshipResponse?.data ?? null);
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
      setRelationship(null);
      setActiveTab("stories");

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

  const avatarFallback =
    profile.displayName.trim().charAt(0) ||
    profile.username.trim().charAt(0).toUpperCase();

  const FollowIcon = relationship?.following ? UserMinus : UserPlus;
  const MuteIcon = relationship?.muted ? Volume2 : VolumeX;
  const actionIsPending = mutatingAction !== null;

  const encodedProfileUsername = encodeURIComponent(profile.username);

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
              <Link
                className="profile-action profile-action--secondary"
                to="/settings"
              >
                <Edit3 aria-hidden="true" />
                {t("profile.actions.editProfile")}
              </Link>
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
        <Link
          className="profile-menu__item"
          to={`/users/${encodedProfileUsername}/followers`}
          aria-label={t("profile.stats.viewFollowers")}
        >
          <UsersRound aria-hidden="true" />
          <span>{t("profile.stats.followers")}</span>
        </Link>

        <Link
          className="profile-menu__item"
          to={`/users/${encodedProfileUsername}/following`}
          aria-label={t("profile.stats.viewFollowing")}
        >
          <UserCheck aria-hidden="true" />
          <span>{t("profile.stats.following")}</span>
        </Link>

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
        ) : (
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
        )}
      </section>
    </main>
  );
}
