import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import "./Register.css";
import "../styles/Form.css";

function Register() {
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
  }

  return (
    <main className="register-page">
      <section className="form-card">
        <h1 className="form-title">ثبت‌نام</h1>

        <p className="form-subtitle">به جامعه نویسندگان خوش آمدید.</p>

        <form className="form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="displayName">نام نمایشی</label>

            <input
              id="displayName"
              name="displayName"
              type="text"
              placeholder="مثلاً چنگیز"
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">نام کاربری</label>

            <input
              id="username"
              name="username"
              type="text"
              placeholder="@Changiz"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">ایمیل</label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">رمز عبور</label>

            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
            />
          </div>

          <label className="form-checkbox">
            <input type="checkbox" />

            <span>قوانین سایت را مطالعه کرده‌ام و می‌پذیرم.</span>
          </label>

          <button type="submit" className="form-button">
            ثبت‌نام
          </button>
        </form>

        <p className="form-footer">
          حساب کاربری دارید؟
          <Link to="/login">ورود</Link>
        </p>
      </section>
    </main>
  );
}

export default Register;
