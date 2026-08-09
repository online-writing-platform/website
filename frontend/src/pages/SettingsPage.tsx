import { useCallback, useEffect, useState, type FormEvent } from "react";

import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";

interface Preferences {
  allowMatureContent: boolean;
  readerTheme: "SYSTEM" | "LIGHT" | "DARK" | "SEPIA";
  fontScale: number;
  lineHeight: number;
  notifyFollow: boolean;
  notifyComment: boolean;
  notifyReply: boolean;
  notifyVote: boolean;
  notifyChapterPublished: boolean;
  notifyModeration: boolean;
  notifySecurity: boolean;
}

interface PreferencesResponse { data: { preferences: Preferences } }
interface Session {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastUsedAt: string;
  expiresAt: string;
  createdAt: string;
  current: boolean;
}
interface SessionsResponse { data: { sessions: Session[] } }

export default function SettingsPage() {
  const { user, request, updateProfile, logout } = useAuth();
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const [preferenceResponse, sessionResponse] = await Promise.all([
      request<PreferencesResponse>("/api/v1/preferences"),
      request<SessionsResponse>("/api/v1/auth/sessions"),
    ]);
    setPreferences(preferenceResponse.data.preferences);
    setSessions(sessionResponse.data.sessions);
  }, [request]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void load().catch((cause) => setError(getErrorMessage(cause)));
    }, 0);

    return () => {
    window.clearTimeout(loadTimer);
    };
  }, [load]);

  async function updatePreference(next: Partial<Preferences>): Promise<void> {
    setError(null);
    setMessage(null);
    try {
      const response = await request<PreferencesResponse>("/api/v1/preferences", {
        method: "PATCH",
        body: JSON.stringify(next),
      });
      setPreferences(response.data.preferences);
      setMessage("تنظیمات ذخیره شد.");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      });
      setMessage("پروفایل به‌روزرسانی شد.");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    try {
      await request("/api/v1/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setMessage("رمز عبور تغییر کرد. نشست‌های دیگر ممکن است لغو شده باشند.");
      await load();
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function changeUsername(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    try {
      await request("/api/v1/auth/username", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newUsername: newUsername.trim() }),
      });
      setNewUsername("");
      setMessage("نام کاربری تغییر کرد. برای دیدن اطلاعات تازه صفحه را بازخوانی کنید.");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function requestEmailChange(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    try {
      await request("/api/v1/auth/email-change/request", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newEmail: newEmail.trim().toLowerCase() }),
      });
      setNewEmail("");
      setMessage("پیوند تأیید تغییر ایمیل ارسال شد.");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function revokeSession(sessionId: string): Promise<void> {
    try {
      await request(`/api/v1/auth/sessions/${sessionId}`, { method: "DELETE" });
      await load();
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function revokeOthers(): Promise<void> {
    try {
      await request("/api/v1/auth/sessions/revoke-others", { method: "POST" });
      await load();
      setMessage("نشست‌های دیگر لغو شدند.");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }


  async function deleteAccount(): Promise<void> {
    if (!confirmDelete || !currentPassword) return;
    setError(null);
    try {
      await request("/api/v1/auth/account", {
        method: "DELETE",
        body: JSON.stringify({ currentPassword }),
      });
      await logout().catch(() => undefined);
      window.location.assign("/");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  async function resendVerification(): Promise<void> {
    try {
      await request("/api/v1/auth/email-verification/resend", { method: "POST" });
      setMessage("ایمیل تأیید دوباره ارسال شد.");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  if (!preferences) {
    return <main className="page-shell">{error ? <p className="status-message status-message--error">{error}</p> : <p>در حال بارگذاری تنظیمات…</p>}</main>;
  }

  return (
    <main className="page-shell settings-page">
      <header className="page-heading">
        <div><p className="eyebrow">حساب کاربری</p><h1>تنظیمات</h1></div>
      </header>

      {error && <p className="status-message status-message--error" role="alert">{error}</p>}
      {message && <p className="status-message status-message--success">{message}</p>}

      {!user?.emailVerified && (
        <section className="surface">
          <h2>تأیید ایمیل</h2>
          <p>برای نوشتن، رأی و تعامل اجتماعی باید ایمیل حساب تأیید شود.</p>
          <button className="button" type="button" onClick={() => void resendVerification()}>ارسال دوباره ایمیل تأیید</button>
        </section>
      )}

      <section className="surface">
        <h2>پروفایل</h2>
        <form className="stack-form" onSubmit={(event) => void saveProfile(event)}>
          <label>نام نمایشی<input value={displayName} minLength={1} maxLength={80} onChange={(event) => setDisplayName(event.target.value)} /></label>
          <label>درباره من<textarea value={bio} maxLength={500} rows={4} onChange={(event) => setBio(event.target.value)} /></label>
          <label>
            نشانی تصویر پروفایل
            <input
              type="url"
              maxLength={2048}
              value={avatarUrl}
              placeholder="https://…"
              onChange={(event) => setAvatarUrl(event.target.value)}
            />
          </label>
          <button className="button" type="submit">ذخیره پروفایل</button>
        </form>
      </section>

      <section className="surface">
        <h2>مطالعه و محتوا</h2>
        <div className="settings-grid">
          <label className="inline-check">
            <input
              type="checkbox"
              checked={preferences.allowMatureContent}
              onChange={(event) => void updatePreference({ allowMatureContent: event.target.checked })}
            />
            نمایش محتوای بزرگسال
          </label>
          <label>
            پوسته خواندن
            <select value={preferences.readerTheme} onChange={(event) => void updatePreference({ readerTheme: event.target.value as Preferences["readerTheme"] })}>
              <option value="SYSTEM">سیستم</option>
              <option value="LIGHT">روشن</option>
              <option value="DARK">تیره</option>
              <option value="SEPIA">سپیا</option>
            </select>
          </label>
          <label>
            اندازه قلم
            <input type="range" min=".75" max="1.6" step=".05" value={preferences.fontScale} onChange={(event) => void updatePreference({ fontScale: Number(event.target.value) })} />
          </label>
          <label>
            فاصله خطوط
            <input type="range" min="1.2" max="2.4" step=".05" value={preferences.lineHeight} onChange={(event) => void updatePreference({ lineHeight: Number(event.target.value) })} />
          </label>
        </div>
      </section>

      <section className="surface">
        <h2>اعلان‌ها</h2>
        <div className="settings-grid">
          {([
            ["notifyFollow", "دنبال‌کردن"],
            ["notifyComment", "نظر جدید"],
            ["notifyReply", "پاسخ نظر"],
            ["notifyVote", "رأی"],
            ["notifyChapterPublished", "فصل منتشرشده"],
            ["notifyModeration", "رویداد مدیریتی"],
            ["notifySecurity", "رویداد امنیتی"],
          ] as const).map(([key, label]) => (
            <label className="inline-check" key={key}>
              <input type="checkbox" checked={preferences[key]} onChange={(event) => void updatePreference({ [key]: event.target.checked })} />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className="surface">
        <h2>امنیت حساب</h2>
        <p>رمز فعلی برای تغییر اطلاعات حساس دوباره بررسی می‌شود.</p>
        <label className="standalone-field">
          رمز فعلی
          <input type="password" value={currentPassword} autoComplete="current-password" onChange={(event) => setCurrentPassword(event.target.value)} />
        </label>

        <div className="settings-security-grid">
          <form className="stack-form" onSubmit={(event) => void changePassword(event)}>
            <h3>تغییر رمز</h3>
            <label>رمز جدید<input type="password" value={newPassword} minLength={10} maxLength={128} autoComplete="new-password" onChange={(event) => setNewPassword(event.target.value)} /></label>
            <button className="button button--secondary" type="submit" disabled={!currentPassword || !newPassword}>تغییر رمز</button>
          </form>
          <form className="stack-form" onSubmit={(event) => void changeUsername(event)}>
            <h3>تغییر نام کاربری</h3>
            <label>نام کاربری جدید<input value={newUsername} minLength={3} maxLength={20} onChange={(event) => setNewUsername(event.target.value)} /></label>
            <button className="button button--secondary" type="submit" disabled={!currentPassword || !newUsername}>تغییر نام کاربری</button>
          </form>
          <form className="stack-form" onSubmit={(event) => void requestEmailChange(event)}>
            <h3>تغییر ایمیل</h3>
            <label>ایمیل جدید<input type="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} /></label>
            <button className="button button--secondary" type="submit" disabled={!currentPassword || !newEmail}>ارسال تأیید</button>
          </form>
        </div>
      </section>

      <section className="surface">
        <div className="section-heading">
          <h2>نشست‌ها و دستگاه‌ها</h2>
          <button className="button button--secondary" type="button" onClick={() => void revokeOthers()}>خروج از دستگاه‌های دیگر</button>
        </div>
        <ul className="session-list">
          {sessions.map((session) => (
            <li key={session.id}>
              <div>
                <strong>{session.current ? "این دستگاه" : "نشست دیگر"}</strong>
                <span>{session.userAgent ?? "دستگاه ناشناخته"}</span>
                <small>آخرین استفاده: {new Date(session.lastUsedAt).toLocaleString("fa-IR")}</small>
              </div>
              {!session.current && <button className="button button--quiet" type="button" onClick={() => void revokeSession(session.id)}>لغو نشست</button>}
            </li>
          ))}
        </ul>
      </section>

      <section className="surface danger-zone">
        <h2>حذف حساب</h2>
        <p>حذف حساب یک عملیات حساس است و بعد از تأیید رمز عبور، نشست‌های فعال لغو می‌شوند.</p>
        <label className="inline-check">
          <input type="checkbox" checked={confirmDelete} onChange={(event) => setConfirmDelete(event.target.checked)} />
          می‌دانم که این عملیات برای حساب من اعمال می‌شود.
        </label>
        <button
          className="button button--danger"
          type="button"
          disabled={!confirmDelete || !currentPassword}
          onClick={() => void deleteAccount()}
        >
          حذف حساب
        </button>
      </section>
    </main>
  );
}
