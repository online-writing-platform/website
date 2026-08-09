import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";

interface Notification {
  id: string;
  type: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
  actor: { username: string; displayName: string; avatarUrl: string | null } | null;
}

interface Response {
  data: { items: Notification[]; hasMore: boolean; nextCursor: string | null };
}

function label(item: Notification): string {
  const actor = item.actor?.displayName ?? "سامانه";
  switch (item.type) {
    case "FOLLOW": return `${actor} شما را دنبال کرد.`;
    case "COMMENT": return `${actor} برای فصل شما نظر نوشت.`;
    case "COMMENT_REPLY": return `${actor} به نظر شما پاسخ داد.`;
    case "CHAPTER_VOTE": return `${actor} به فصل شما رأی داد.`;
    case "CHAPTER_PUBLISHED": return "فصل تازه‌ای منتشر شد.";
    case "MODERATION": return "یک رویداد مدیریتی برای حساب یا محتوای شما ثبت شد.";
    case "SECURITY": return "یک رویداد امنیتی برای حساب شما ثبت شد.";
    default: return "اعلان جدید";
  }
}

export default function NotificationsPage() {
  const { request } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const response = await request<Response>("/api/v1/notifications?limit=50");
    setItems(response.data.items);
  }, [request]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void load().catch((cause) => setError(getErrorMessage(cause)));
    }, 0);

    return () => {
    window.clearTimeout(loadTimer);
    };
  }, [load]);

  async function markAllRead(): Promise<void> {
    try {
      await request("/api/v1/notifications/read-all", { method: "POST" });
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function markRead(id: string): Promise<void> {
    try {
      await request(`/api/v1/notifications/${id}/read`, { method: "POST" });
      setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item));
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return (
    <main className="page-shell">
      <header className="page-heading">
        <div><p className="eyebrow">حساب کاربری</p><h1>اعلان‌ها</h1></div>
        <button className="button button--secondary" type="button" onClick={() => void markAllRead()}>همه خوانده شد</button>
      </header>
      {error && <p className="status-message status-message--error">{error}</p>}
      <div className="notification-list">
        {items.length === 0 ? <p className="empty-state">اعلان جدیدی ندارید.</p> : items.map((item) => (
          <article className={`notification ${item.readAt ? "" : "notification--unread"}`} key={item.id}>
            <div>
              <strong>{label(item)}</strong>
              <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("fa-IR")}</time>
              {item.actor && <Link className="text-link" to={`/users/${item.actor.username}`}>@{item.actor.username}</Link>}
            </div>
            {!item.readAt && <button className="button button--quiet" type="button" onClick={() => void markRead(item.id)}>خوانده شد</button>}
          </article>
        ))}
      </div>
    </main>
  );
}
