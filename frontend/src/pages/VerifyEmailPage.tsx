import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [message, setMessage] = useState(
    token ? "در حال تأیید ایمیل…" : "توکن تأیید در آدرس وجود ندارد.",
  );
  const [failed, setFailed] = useState(!token);

  useEffect(() => {
    if (!token) return;
    void apiRequest("/api/v1/auth/email-verification/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    }).then(() => {
      setMessage("ایمیل با موفقیت تأیید شد.");
    }).catch((cause) => {
      setFailed(true);
      setMessage(getErrorMessage(cause));
    });
  }, [token]);

  return (
    <main className="auth-page">
      <section className="form-card">
        <h1>تأیید ایمیل</h1>
        <p className={`status-message ${failed ? "status-message--error" : "status-message--success"}`}>{message}</p>
        <Link className="button" to="/login">ورود به حساب</Link>
      </section>
    </main>
  );
}
