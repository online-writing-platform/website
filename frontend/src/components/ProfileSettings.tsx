import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Bell,
  BookOpen,
  Edit3,
  KeyRound,
  Laptop,
  Mail,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";
import type { ProfileSettingsSection } from "../lib/profile-settings";
import {
  changePassword,
  changeUsername,
  deleteAccount,
  getPreferences,
  getSessions,
  requestEmailChange,
  resendEmailVerification,
  revokeOtherSessions,
  revokeSession,
  uploadProfileImage,
  updatePreferences,
  type Preferences,
  type Session,
} from "../lib/settings-api";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./ui/navigation-menu";

import "./ProfileSettings.css";

interface ProfileSettingsProps {
  activeSection: ProfileSettingsSection | null;
  onSelect(section: ProfileSettingsSection): void;
  onClose(): void;
  onProfileUpdated?(): void | Promise<void>;
}

const notificationKeys = [
  "notifyFollow",
  "notifyComment",
  "notifyReply",
  "notifyVote",
  "notifyChapterPublished",
  "notifyModeration",
  "notifySecurity",
] as const satisfies ReadonlyArray<keyof Preferences>;

const PROFILE_IMAGE_MAX_BYTES = 5_000_000;
const PROFILE_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

export default function ProfileSettings({
  activeSection,
  onSelect,
  onClose,
  onProfileUpdated,
}: ProfileSettingsProps) {
  const { t } = useTranslation();

  const items = [
    { id: "profile", icon: Edit3 },
    { id: "notifications", icon: Bell },
    { id: "security", icon: ShieldCheck },
    { id: "sessions", icon: Laptop },
    { id: "delete", icon: Trash2, danger: true },
  ] as const;

  return (
    <>
      <NavigationMenu
        className="profile-settings-menu"
        align="end"
        aria-label={t("settings.menu.ariaLabel")}
      >
        <NavigationMenuList>
          <NavigationMenuItem value="profile-settings">
            <NavigationMenuTrigger className="profile-action profile-action--secondary profile-settings-trigger">
              <Edit3 aria-hidden="true" />
              <span>{t("settings.menu.trigger")}</span>
            </NavigationMenuTrigger>

            <NavigationMenuContent className="profile-settings-dropdown">
              <ul className="profile-settings-dropdown__list">
                {items.map(({ id, icon: Icon, ...item }) => (
                  <li key={id}>
                    <NavigationMenuLink
                      render={
                        <button type="button" onClick={() => onSelect(id)} />
                      }
                      className={
                        "danger" in item && item.danger
                          ? "is-danger"
                          : undefined
                      }
                      closeOnClick
                    >
                      <Icon aria-hidden="true" />
                      <span>{t(`settings.menu.items.${id}`)}</span>
                    </NavigationMenuLink>
                  </li>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>

      {activeSection ? (
        <ProfileSettingsDialog
          activeSection={activeSection}
          onSelect={onSelect}
          onClose={onClose}
          onProfileUpdated={onProfileUpdated}
        />
      ) : null}
    </>
  );
}

function ProfileSettingsDialog({
  activeSection,
  onSelect,
  onClose,
  onProfileUpdated,
}: Required<
  Pick<ProfileSettingsProps, "activeSection" | "onSelect" | "onClose">
> &
  Pick<ProfileSettingsProps, "onProfileUpdated">) {
  const { i18n, t } = useTranslation();
  const { user, request, updateProfile, logout } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [deletePassword, setDeletePassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const locale = i18n.resolvedLanguage?.startsWith("fa") ? "fa-IR" : "en-US";

  const loadPreferences = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      const response = await getPreferences(request, signal);
      if (!signal?.aborted) setPreferences(response.data.preferences);
    },
    [request],
  );

  const loadSessions = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      const response = await getSessions(request, signal);
      if (!signal?.aborted) setSessions(response.data.sessions);
    },
    [request],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }

    return () => {
      if (dialog.open && typeof dialog.close === "function") dialog.close();
    };
  }, []);

  useEffect(() => {
    if (
      preferences ||
      (activeSection !== "profile" && activeSection !== "notifications")
    ) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setPreferencesLoading(true);
      void loadPreferences(controller.signal)
        .catch((cause) => {
          if (!controller.signal.aborted) setError(getErrorMessage(cause));
        })
        .finally(() => {
          if (!controller.signal.aborted) setPreferencesLoading(false);
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeSection, loadPreferences, preferences]);

  useEffect(() => {
    if (activeSection !== "sessions" || sessions.length > 0) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSessionsLoading(true);
      void loadSessions(controller.signal)
        .catch((cause) => {
          if (!controller.signal.aborted) setError(getErrorMessage(cause));
        })
        .finally(() => {
          if (!controller.signal.aborted) setSessionsLoading(false);
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeSection, loadSessions, sessions.length]);

  function beginAction(action: string) {
    setPendingAction(action);
    setError(null);
    setMessage(null);
  }

  function failAction(cause: unknown) {
    setError(getErrorMessage(cause));
  }

  function selectAvatarFile(file: File | null) {
    setError(null);
    setMessage(null);

    if (!file) {
      setAvatarFile(null);
      return;
    }

    if (!PROFILE_IMAGE_TYPES.has(file.type)) {
      setAvatarFile(null);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      setError(t("settings.profile.avatarUpload.invalidType"));
      return;
    }

    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      setAvatarFile(null);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      setError(t("settings.profile.avatarUpload.tooLarge"));
      return;
    }

    setAvatarFile(file);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    beginAction("profile");

    try {
      let nextAvatarUrl = avatarUrl.trim() || null;

      if (avatarFile) {
        const response = await uploadProfileImage(request, avatarFile);
        nextAvatarUrl = response.data.media.url;
        setAvatarUrl(nextAvatarUrl);
      }

      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        avatarUrl: nextAvatarUrl,
      });

      setAvatarFile(null);

      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }

      await onProfileUpdated?.();
      setMessage(t("settings.profile.saved"));
    } catch (cause) {
      failAction(cause);
    } finally {
      setPendingAction(null);
    }
  }

  async function savePreference(next: Partial<Preferences>) {
    beginAction("preference");

    try {
      const response = await updatePreferences(request, next);
      setPreferences(response.data.preferences);
      setMessage(t("settings.messages.preferencesSaved"));
    } catch (cause) {
      failAction(cause);
    } finally {
      setPendingAction(null);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    beginAction("password");

    try {
      await changePassword(request, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMessage(t("settings.security.password.saved"));
    } catch (cause) {
      failAction(cause);
    } finally {
      setPendingAction(null);
    }
  }

  async function submitUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    beginAction("username");

    try {
      await changeUsername(request, currentPassword, newUsername);
      setNewUsername("");
      setMessage(t("settings.security.username.saved"));
    } catch (cause) {
      failAction(cause);
    } finally {
      setPendingAction(null);
    }
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    beginAction("email");

    try {
      await requestEmailChange(request, currentPassword, newEmail);
      setNewEmail("");
      setMessage(t("settings.security.email.sent"));
    } catch (cause) {
      failAction(cause);
    } finally {
      setPendingAction(null);
    }
  }

  async function resendVerification() {
    if (!user) return;

    beginAction("verification");

    try {
      await resendEmailVerification(request, user.email);
      setMessage(t("settings.security.verification.sent"));
    } catch (cause) {
      failAction(cause);
    } finally {
      setPendingAction(null);
    }
  }

  async function removeSession(sessionId: string) {
    beginAction(`session-${sessionId}`);

    try {
      await revokeSession(request, sessionId);
      await loadSessions();
      setMessage(t("settings.sessions.revoked"));
    } catch (cause) {
      failAction(cause);
    } finally {
      setPendingAction(null);
    }
  }

  async function removeOtherSessions() {
    beginAction("other-sessions");

    try {
      const response = await revokeOtherSessions(request);
      await loadSessions();
      setMessage(
        t("settings.sessions.othersRevoked", {
          count: response.data.revokedCount,
        }),
      );
    } catch (cause) {
      failAction(cause);
    } finally {
      setPendingAction(null);
    }
  }

  async function removeAccount() {
    if (!confirmDelete || !deletePassword) return;

    beginAction("delete");

    try {
      await deleteAccount(request, deletePassword);
      await logout().catch(() => undefined);
      window.location.assign("/");
    } catch (cause) {
      failAction(cause);
      setPendingAction(null);
    }
  }

  const navItems = [
    { id: "profile", icon: Edit3 },
    { id: "notifications", icon: Bell },
    { id: "security", icon: ShieldCheck },
    { id: "sessions", icon: Laptop },
    { id: "delete", icon: Trash2 },
  ] as const;

  return (
    <dialog
      ref={dialogRef}
      className="profile-settings-dialog"
      aria-labelledby="profile-settings-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="profile-settings-window"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="profile-settings-window__header">
          <div>
            <p>{t("settings.dialog.eyebrow")}</p>
            <h2 id="profile-settings-title">
              {t(`settings.sections.${activeSection}.title`)}
            </h2>
          </div>

          <button
            className="profile-settings-close"
            type="button"
            aria-label={t("settings.dialog.close")}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="profile-settings-layout">
          <nav
            className="profile-settings-nav"
            aria-label={t("settings.dialog.navigation")}
          >
            {navItems.map(({ id, icon: Icon }) => (
              <button
                key={id}
                className={activeSection === id ? "is-active" : undefined}
                type="button"
                aria-current={activeSection === id ? "page" : undefined}
                onClick={() => onSelect(id)}
              >
                <Icon aria-hidden="true" />
                <span>{t(`settings.menu.items.${id}`)}</span>
              </button>
            ))}
          </nav>

          <div className="profile-settings-content">
            {error ? (
              <p className="profile-settings-feedback is-error" role="alert">
                {error}
              </p>
            ) : null}

            {message ? (
              <p className="profile-settings-feedback is-success" role="status">
                {message}
              </p>
            ) : null}

            {activeSection === "profile" ? (
              <section className="profile-settings-section">
                <p className="profile-settings-description">
                  {t("settings.sections.profile.description")}
                </p>

                <form
                  className="profile-settings-form"
                  onSubmit={(event) => void saveProfile(event)}
                >
                  <label>
                    <span>{t("settings.profile.displayName")}</span>
                    <input
                      value={displayName}
                      minLength={1}
                      maxLength={80}
                      autoComplete="name"
                      onChange={(event) => setDisplayName(event.target.value)}
                    />
                  </label>

                  <label>
                    <span>{t("settings.profile.bio")}</span>
                    <textarea
                      value={bio}
                      maxLength={500}
                      rows={4}
                      placeholder={t("settings.profile.bioPlaceholder")}
                      onChange={(event) => setBio(event.target.value)}
                    />
                    <small>
                      {t("settings.profile.bioCount", {
                        count: bio.length.toLocaleString(locale),
                      })}
                    </small>
                  </label>

                  <label>
                    <span>{t("settings.profile.avatarUrl")}</span>
                    <input
                      className="is-ltr"
                      type="url"
                      value={avatarUrl}
                      maxLength={2048}
                      placeholder="https://example.com/avatar.jpg"
                      onChange={(event) => {
                        setAvatarUrl(event.target.value);
                        setAvatarFile(null);

                        if (avatarInputRef.current) {
                          avatarInputRef.current.value = "";
                        }
                      }}
                    />
                  </label>

                  <label>
                    <span>{t("settings.profile.avatarUpload.label")}</span>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png"
                      disabled={pendingAction !== null}
                      onChange={(event) =>
                        selectAvatarFile(event.target.files?.[0] ?? null)
                      }
                    />
                    <small>{t("settings.profile.avatarUpload.help")}</small>

                    {avatarFile ? (
                      <small>
                        {t("settings.profile.avatarUpload.selected", {
                          name: avatarFile.name,
                        })}
                      </small>
                    ) : null}
                  </label>

                  <button
                    className="profile-settings-primary"
                    type="submit"
                    disabled={pendingAction !== null}
                  >
                    {pendingAction === "profile"
                      ? t("settings.common.saving")
                      : t("settings.common.save")}
                  </button>
                </form>

                <div className="profile-settings-subsection">
                  <div className="profile-settings-subsection__heading">
                    <BookOpen aria-hidden="true" />
                    <div>
                      <h3>{t("settings.profile.reading.title")}</h3>
                      <p>{t("settings.profile.reading.description")}</p>
                    </div>
                  </div>

                  {preferencesLoading || !preferences ? (
                    <p className="profile-settings-loading">
                      {t("settings.common.loading")}
                    </p>
                  ) : (
                    <div className="profile-settings-options">
                      <label className="profile-settings-check">
                        <input
                          type="checkbox"
                          checked={preferences.allowMatureContent}
                          disabled={pendingAction !== null}
                          onChange={(event) =>
                            void savePreference({
                              allowMatureContent: event.target.checked,
                            })
                          }
                        />
                        <span>
                          {t("settings.profile.reading.matureContent")}
                        </span>
                      </label>

                      <label>
                        <span>{t("settings.profile.reading.theme")}</span>
                        <select
                          value={preferences.readerTheme}
                          disabled={pendingAction !== null}
                          onChange={(event) =>
                            void savePreference({
                              readerTheme: event.target
                                .value as Preferences["readerTheme"],
                            })
                          }
                        >
                          {(["SYSTEM", "LIGHT", "DARK", "SEPIA"] as const).map(
                            (theme) => (
                              <option key={theme} value={theme}>
                                {t(`settings.profile.reading.themes.${theme}`)}
                              </option>
                            ),
                          )}
                        </select>
                      </label>

                      <label>
                        <span>
                          {t("settings.profile.reading.fontScale")}:{" "}
                          {preferences.fontScale.toFixed(2)}
                        </span>
                        <input
                          type="range"
                          min="0.75"
                          max="1.6"
                          step="0.05"
                          value={preferences.fontScale}
                          disabled={pendingAction !== null}
                          onChange={(event) =>
                            void savePreference({
                              fontScale: Number(event.target.value),
                            })
                          }
                        />
                      </label>

                      <label>
                        <span>
                          {t("settings.profile.reading.lineHeight")}:{" "}
                          {preferences.lineHeight.toFixed(2)}
                        </span>
                        <input
                          type="range"
                          min="1.2"
                          max="2.4"
                          step="0.05"
                          value={preferences.lineHeight}
                          disabled={pendingAction !== null}
                          onChange={(event) =>
                            void savePreference({
                              lineHeight: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            {activeSection === "notifications" ? (
              <section className="profile-settings-section">
                <p className="profile-settings-description">
                  {t("settings.sections.notifications.description")}
                </p>

                {preferencesLoading || !preferences ? (
                  <p className="profile-settings-loading">
                    {t("settings.common.loading")}
                  </p>
                ) : (
                  <div className="profile-notification-list">
                    {notificationKeys.map((key) => (
                      <label key={key}>
                        <span>{t(`settings.notifications.items.${key}`)}</span>
                        <input
                          type="checkbox"
                          checked={preferences[key] as boolean}
                          disabled={pendingAction !== null}
                          onChange={(event) =>
                            void savePreference({
                              [key]: event.target.checked,
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                )}
              </section>
            ) : null}

            {activeSection === "security" ? (
              <section className="profile-settings-section">
                <p className="profile-settings-description">
                  {t("settings.sections.security.description")}
                </p>

                {!user?.emailVerified ? (
                  <div className="profile-settings-notice">
                    <Mail aria-hidden="true" />
                    <div>
                      <strong>
                        {t("settings.security.verification.title")}
                      </strong>
                      <p>{t("settings.security.verification.description")}</p>
                    </div>
                    <button
                      type="button"
                      disabled={pendingAction !== null}
                      onClick={() => void resendVerification()}
                    >
                      {t("settings.security.verification.resend")}
                    </button>
                  </div>
                ) : null}

                <label className="profile-settings-current-password">
                  <span>{t("settings.security.currentPassword")}</span>
                  <input
                    type="password"
                    value={currentPassword}
                    autoComplete="current-password"
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                </label>

                <div className="profile-security-grid">
                  <form onSubmit={(event) => void submitPassword(event)}>
                    <KeyRound aria-hidden="true" />
                    <h3>{t("settings.security.password.title")}</h3>
                    <label>
                      <span>{t("settings.security.password.newPassword")}</span>
                      <input
                        type="password"
                        value={newPassword}
                        minLength={10}
                        maxLength={128}
                        autoComplete="new-password"
                        onChange={(event) => setNewPassword(event.target.value)}
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={
                        !currentPassword ||
                        !newPassword ||
                        pendingAction !== null
                      }
                    >
                      {t("settings.security.password.submit")}
                    </button>
                  </form>

                  <form onSubmit={(event) => void submitUsername(event)}>
                    <UserRound aria-hidden="true" />
                    <h3>{t("settings.security.username.title")}</h3>
                    <label>
                      <span>{t("settings.security.username.newUsername")}</span>
                      <input
                        className="is-ltr"
                        value={newUsername}
                        minLength={3}
                        maxLength={20}
                        onChange={(event) => setNewUsername(event.target.value)}
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={
                        !currentPassword ||
                        !newUsername ||
                        pendingAction !== null
                      }
                    >
                      {t("settings.security.username.submit")}
                    </button>
                  </form>

                  <form onSubmit={(event) => void submitEmail(event)}>
                    <Mail aria-hidden="true" />
                    <h3>{t("settings.security.email.title")}</h3>
                    <label>
                      <span>{t("settings.security.email.newEmail")}</span>
                      <input
                        className="is-ltr"
                        type="email"
                        value={newEmail}
                        autoComplete="email"
                        onChange={(event) => setNewEmail(event.target.value)}
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={
                        !currentPassword || !newEmail || pendingAction !== null
                      }
                    >
                      {t("settings.security.email.submit")}
                    </button>
                  </form>
                </div>
              </section>
            ) : null}

            {activeSection === "sessions" ? (
              <section className="profile-settings-section">
                <div className="profile-settings-section__heading">
                  <p className="profile-settings-description">
                    {t("settings.sections.sessions.description")}
                  </p>
                  <button
                    className="profile-settings-secondary"
                    type="button"
                    disabled={pendingAction !== null || sessions.length < 2}
                    onClick={() => void removeOtherSessions()}
                  >
                    {t("settings.sessions.revokeOthers")}
                  </button>
                </div>

                {sessionsLoading ? (
                  <p className="profile-settings-loading">
                    {t("settings.common.loading")}
                  </p>
                ) : sessions.length === 0 ? (
                  <p className="profile-settings-empty">
                    {t("settings.sessions.empty")}
                  </p>
                ) : (
                  <ul className="profile-session-list">
                    {sessions.map((session) => (
                      <li key={session.id}>
                        <span className="profile-session-icon">
                          <Laptop aria-hidden="true" />
                        </span>
                        <div>
                          <strong>
                            {session.current
                              ? t("settings.sessions.current")
                              : t("settings.sessions.other")}
                          </strong>
                          <span>
                            {session.userAgent ??
                              t("settings.sessions.unknownDevice")}
                          </span>
                          <small>
                            {t("settings.sessions.lastUsed", {
                              date: new Date(session.lastUsedAt).toLocaleString(
                                locale,
                              ),
                            })}
                          </small>
                        </div>

                        {!session.current ? (
                          <button
                            type="button"
                            disabled={pendingAction !== null}
                            onClick={() => void removeSession(session.id)}
                          >
                            {t("settings.sessions.revoke")}
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            {activeSection === "delete" ? (
              <section className="profile-settings-section profile-delete-section">
                <span className="profile-delete-icon">
                  <Trash2 aria-hidden="true" />
                </span>
                <h3>{t("settings.delete.title")}</h3>
                <p>{t("settings.delete.description")}</p>

                <label>
                  <span>{t("settings.delete.password")}</span>
                  <input
                    type="password"
                    value={deletePassword}
                    autoComplete="current-password"
                    onChange={(event) => setDeletePassword(event.target.value)}
                  />
                </label>

                <label className="profile-settings-check">
                  <input
                    type="checkbox"
                    checked={confirmDelete}
                    onChange={(event) => setConfirmDelete(event.target.checked)}
                  />
                  <span>{t("settings.delete.confirm")}</span>
                </label>

                <button
                  className="profile-settings-danger"
                  type="button"
                  disabled={
                    !confirmDelete || !deletePassword || pendingAction !== null
                  }
                  onClick={() => void removeAccount()}
                >
                  {t("settings.delete.submit")}
                </button>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </dialog>
  );
}
