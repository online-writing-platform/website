import Button from "../components/Button";
import "./Login.css";
import { Link } from "react-router-dom";

function Login() {
  return (
    <main className="login-page">
      <section className="form-card">
        <h1 className="form-title">ورود</h1>

        <p className="form-subtitle">
          خوش آمدید، برای ادامه وارد حساب خود شوید.
        </p>

        <form className="form">
          <div className="form-group">
            <label htmlFor="email">ایمیل یا نام کاربری</label>

            <input id="email" type="text" placeholder="نام کاربری یا ایمیل" />
          </div>

          <div className="form-group">
            <label htmlFor="password">رمز عبور</label>

            <input id="password" type="password" placeholder="••••••••" />
          </div>

          <label className="form-checkbox">
            <input type="checkbox" />

            <span>مرا به خاطر بسپار</span>
          </label>

          <Button>ورود</Button>
        </form>

        <p className="form-footer">
          حساب کاربری ندارید؟
          <Link to="/register">ثبت‌نام</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;
