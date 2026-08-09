import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";

export default function ConfirmEmailChangePage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [message, setMessage] = useState(
    token ? "در حال تأیید ایمیل جدید…" : "توکن تغییر ایمیل در آدرس وجود ندارد.",
  );
  const [failed, setFailed] = useState(!token);

  useEffect(() => {
    if (!token) return;
    void apiRequest("/api/v1/auth/email-change/confirm", {
      method: "POST",
      body: JSON.stringify({ token }),
    }).then(() => setMessage("ایمیل حساب تغییر کرد."))
      .catch((cause) => {
        setFailed(true);
        setMessage(getErrorMessage(cause));
      });
  }, [token]);

  return (
    <main className="auth-page">
      <section className="form-card">
        <h1>تغییر ایمیل</h1>
        <p className={`status-message ${failed ? "status-message--error" : "status-message--success"}`}>{message}</p>
        <Link className="button" to="/settings">تنظیمات</Link>
      </section>
    </main>
  );
}
