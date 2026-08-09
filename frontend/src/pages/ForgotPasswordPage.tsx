import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    try {
      await apiRequest("/api/v1/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      setMessage("اگر حسابی با این مشخصات وجود داشته باشد، راهنمای بازیابی ارسال می‌شود.");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  return (
    <main className="auth-page">
      <section className="form-card">
        <h1>بازیابی رمز عبور</h1>
        <p>ایمیل یا نام کاربری حساب را وارد کنید.</p>
        {message && <p className="status-message status-message--success">{message}</p>}
        {error && <p className="status-message status-message--error">{error}</p>}
        <form className="stack-form" onSubmit={(event) => void submit(event)}>
          <label>ایمیل یا نام کاربری<input value={identifier} maxLength={320} autoComplete="username" required onChange={(event) => setIdentifier(event.target.value)} /></label>
          <button className="button" type="submit">ارسال راهنمای بازیابی</button>
        </form>
        <Link className="text-link" to="/login">بازگشت به ورود</Link>
      </section>
    </main>
  );
}
