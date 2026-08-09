import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import ReportForm from "../components/ReportForm";
import StoryCard from "../components/StoryCard";
import useAuth from "../hooks/useAuth";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";
import type { Story } from "../types/story";

interface Profile {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  counts: { followers: number; following: number; publishedStories: number };
  createdAt: string;
}

interface ProfileResponse { data: { user: Profile } }
interface StoriesResponse { data: { stories: Story[]; pagination: { hasMore: boolean; nextCursor: string | null } } }
interface RelationshipResponse {
  data: { following: boolean; blocked: boolean; blockedByTarget: boolean; muted: boolean };
}
interface ListsResponse {
  data: { lists: Array<{ id: string; name: string; description: string | null; itemCount: number }> };
}

export default function PublicProfilePage() {
  const { username = "" } = useParams();
  const { status, user: viewer, request } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [lists, setLists] = useState<ListsResponse["data"]["lists"]>([]);
  const [relationship, setRelationship] = useState<RelationshipResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const [profileResponse, storiesResponse, listsResponse] = await Promise.all([
      apiRequest<ProfileResponse>(`/api/v1/users/${encodeURIComponent(username)}`),
      status === "authenticated"
        ? request<StoriesResponse>(`/api/v1/stories?author=${encodeURIComponent(username)}&limit=24`)
        : apiRequest<StoriesResponse>(`/api/v1/stories?author=${encodeURIComponent(username)}&limit=24`),
      status === "authenticated"
        ? request<ListsResponse>(`/api/v1/users/${encodeURIComponent(username)}/reading-lists`)
        : apiRequest<ListsResponse>(`/api/v1/users/${encodeURIComponent(username)}/reading-lists`),
    ]);
    setProfile(profileResponse.data.user);
    setStories(storiesResponse.data.stories);
    setLists(listsResponse.data.lists);

    if (status === "authenticated" && viewer?.username !== username) {
      const relation = await request<RelationshipResponse>(
        `/api/v1/users/${encodeURIComponent(username)}/relationship`,
      );
      setRelationship(relation.data);
    }
  }, [request, status, username, viewer]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void load().catch((cause) => setError(getErrorMessage(cause)));
    }, 0);

    return () => {
    window.clearTimeout(loadTimer);
    };
  }, [load]);

  async function mutate(action: "follow" | "block" | "mute", active: boolean): Promise<void> {
    setError(null);
    try {
      await request(`/api/v1/users/${encodeURIComponent(username)}/${action}`, {
        method: active ? "DELETE" : "POST",
      });
      await load();
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  if (error && !profile) return <main className="page-shell"><p className="status-message status-message--error">{error}</p></main>;
  if (!profile) return <main className="page-shell"><p>در حال بارگذاری…</p></main>;

  const isSelf = viewer?.username === profile.username;

  return (
    <main className="page-shell">
      <header className="profile-hero surface">
        <div className="avatar avatar--large">
          {profile.avatarUrl ? <img referrerPolicy="no-referrer" src={profile.avatarUrl} alt="" /> : profile.displayName.slice(0, 1)}
        </div>
        <div>
          <h1>{profile.displayName}</h1>
          <p>@{profile.username}</p>
          {profile.bio && <p>{profile.bio}</p>}
          <div className="profile-counts">
            <span><strong>{profile.counts.publishedStories.toLocaleString("fa-IR")}</strong> داستان</span>
            <Link to={`/users/${encodeURIComponent(profile.username)}/followers`}>
              <strong>{profile.counts.followers.toLocaleString("fa-IR")}</strong> دنبال‌کننده
            </Link>
            <Link to={`/users/${encodeURIComponent(profile.username)}/following`}>
              <strong>{profile.counts.following.toLocaleString("fa-IR")}</strong> دنبال‌شده
            </Link>
          </div>
        </div>
        <div className="button-row">
          {isSelf ? (
            <Link className="button" to="/settings">ویرایش حساب</Link>
          ) : status === "authenticated" && relationship ? (
            <>
              <button
                className="button"
                type="button"
                disabled={relationship.blocked || relationship.blockedByTarget}
                onClick={() => void mutate("follow", relationship.following)}
              >
                {relationship.following ? "لغو دنبال‌کردن" : "دنبال‌کردن"}
              </button>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => void mutate("mute", relationship.muted)}
              >
                {relationship.muted ? "لغو بی‌صدا" : "بی‌صدا"}
              </button>
              <button
                className="button button--danger"
                type="button"
                onClick={() => void mutate("block", relationship.blocked)}
              >
                {relationship.blocked ? "رفع مسدودسازی" : "مسدودکردن"}
              </button>
            </>
          ) : null}
        </div>
      </header>
      {!isSelf && <ReportForm targetType="USER" targetId={profile.id} />}

      {error && <p className="status-message status-message--error">{error}</p>}

      <section className="section-block">
        <h2>داستان‌های منتشرشده</h2>
        {stories.length === 0 ? <p className="empty-state">داستان عمومی‌ای وجود ندارد.</p> : (
          <div className="story-grid">{stories.map((story) => <StoryCard key={story.id} story={story} />)}</div>
        )}
      </section>

      <section className="section-block">
        <h2>فهرست‌های مطالعه عمومی</h2>
        {lists.length === 0 ? <p className="empty-state">فهرست عمومی‌ای وجود ندارد.</p> : (
          <ul className="simple-list">
            {lists.map((list) => (
              <li key={list.id}>
                <Link to={`/reading-lists/${list.id}`}><strong>{list.name}</strong></Link>
                <span>{list.itemCount.toLocaleString("fa-IR")} داستان</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
