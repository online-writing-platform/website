import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (password !== confirmation) {
      setError("رمز عبور و تکرار آن یکسان نیست.");
      return;
    }
    setError(null);
    try {
      await apiRequest("/api/v1/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: password }),
      });
      setMessage("رمز عبور تغییر کرد. اکنون می‌توانید وارد شوید.");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return (
    <main className="auth-page">
      <section className="form-card">
        <h1>رمز عبور جدید</h1>
        {!token && <p className="status-message status-message--error">توکن بازیابی در آدرس وجود ندارد.</p>}
        {message && <p className="status-message status-message--success">{message}</p>}
        {error && <p className="status-message status-message--error">{error}</p>}
        <form className="stack-form" onSubmit={(event) => void submit(event)}>
          <label>رمز جدید<input type="password" value={password} minLength={10} maxLength={128} autoComplete="new-password" onChange={(event) => setPassword(event.target.value)} /></label>
          <label>تکرار رمز<input type="password" value={confirmation} minLength={10} maxLength={128} autoComplete="new-password" onChange={(event) => setConfirmation(event.target.value)} /></label>
          <button className="button" type="submit" disabled={!token}>ثبت رمز جدید</button>
        </form>
        <Link className="text-link" to="/login">ورود</Link>
      </section>
    </main>
  );
}
