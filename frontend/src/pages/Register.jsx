import "./Register.css";
<input type="file" accept="image/*" />;

function Register() {
  return (
    <main className="register-page">
      <div className="register-card">
        <h1>ثبت‌نام</h1>

        <form className="register-form">
          <input type="text" placeholder="نام نمایشی" />

          <input type="text" placeholder="نام کاربری" />

          <input type="email" placeholder="ایمیل" />

          <input type="password" placeholder="رمز عبور" />

          <textarea placeholder="بیوگرافی (اختیاری)" rows="4"></textarea>

          <button type="submit">ثبت‌نام</button>
        </form>
      </div>
    </main>
  );
}

export default Register;
