import { useState, type FormEvent } from "react";

import Button from "../components/Button";
import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";

import "./Profile.css";
import "../styles/Form.css";

interface ProfileForm {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
}

function Profile() {
  const { user, updateProfile } = useAuth();

  if (!user) {
    return null;
  }

  const currentUser = user;

  const [isEditing, setIsEditing] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [form, setForm] = useState<ProfileForm>({
    username: currentUser.username,
    displayName: currentUser.displayName,
    bio: currentUser.bio ?? "",
    avatarUrl: currentUser.avatarUrl ?? "",
  });

  const initials = currentUser.displayName.trim().slice(0, 2).toUpperCase();

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const updatedUser = await updateProfile({
        username: form.username.trim().toLowerCase(),

        displayName: form.displayName.trim(),

        bio: form.bio.trim().length > 0 ? form.bio.trim() : null,

        avatarUrl:
          form.avatarUrl.trim().length > 0 ? form.avatarUrl.trim() : null,
      });

      setForm({
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        bio: updatedUser.bio ?? "",
        avatarUrl: updatedUser.avatarUrl ?? "",
      });

      setSuccessMessage("پروفایل با موفقیت ویرایش شد.");

      setIsEditing(false);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  function cancelEditing(): void {
    setForm({
      username: currentUser.username,
      displayName: currentUser.displayName,
      bio: currentUser.bio ?? "",
      avatarUrl: currentUser.avatarUrl ?? "",
    });

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEditing(false);
  }

  return (
    <main className="profile-page">
      <aside className="profile-card">
        <div className="profile-image">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={`تصویر پروفایل ${user.displayName}`}
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        <h1>{user.displayName}</h1>

        <p className="username">@{user.username}</p>

        <p className="profile-email">{user.email}</p>

        <p className="bio">
          {user.bio ?? "هنوز توضیحی برای پروفایل ثبت نشده است."}
        </p>

        <Button
          onClick={() => {
            setIsEditing((current) => !current);
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
        >
          {isEditing ? "بستن فرم" : "ویرایش پروفایل"}
        </Button>
      </aside>

      <section className="profile-content">
        {successMessage && (
          <p className="form-message form-message-success">{successMessage}</p>
        )}

        {isEditing ? (
          <section className="profile-edit-card">
            <h2>ویرایش پروفایل</h2>

            <form
              className="form"
              onSubmit={(event) => {
                void handleSubmit(event);
              }}
            >
              {errorMessage && (
                <p className="form-message form-message-error" role="alert">
                  {errorMessage}
                </p>
              )}

              <div className="form-group">
                <label htmlFor="profileDisplayName">نام نمایشی</label>

                <input
                  id="profileDisplayName"
                  type="text"
                  value={form.displayName}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }));
                  }}
                  minLength={1}
                  maxLength={80}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="profileUsername">نام کاربری</label>

                <input
                  id="profileUsername"
                  type="text"
                  value={form.username}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      username: event.target.value,
                    }));
                  }}
                  minLength={3}
                  maxLength={30}
                  pattern="[A-Za-z0-9_]+"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="profileBio">بیوگرافی کوتاه</label>

                <textarea
                  id="profileBio"
                  value={form.bio}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      bio: event.target.value,
                    }));
                  }}
                  maxLength={500}
                  rows={5}
                  placeholder="کمی درباره خودتان بنویسید..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="profileAvatar">آدرس تصویر پروفایل</label>

                <input
                  id="profileAvatar"
                  type="url"
                  value={form.avatarUrl}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      avatarUrl: event.target.value,
                    }));
                  }}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div className="profile-form-actions">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={cancelEditing}
                  disabled={isSubmitting}
                >
                  انصراف
                </Button>
              </div>
            </form>
          </section>
        ) : (
          <section className="profile-stories">
            <h2>نوشته‌های من</h2>

            <div className="empty-state">هنوز داستانی منتشر نکرده‌اید.</div>
          </section>
        )}
      </section>
    </main>
  );
}

export default Profile;
