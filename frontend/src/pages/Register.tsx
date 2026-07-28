import type { FormEvent } from "react";

function Register() {
    function handleSubmit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
    }

    return (
        <main className="register-page">
            <div className="register-card">
                <h1>ثبت‌نام</h1>

                <form className="register-form" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        name="displayName"
                        placeholder="نام نمایشی"
                    />

                    <input
                        type="text"
                        name="username"
                        placeholder="نام کاربری"
                    />

                    <input type="email" name="email" placeholder="ایمیل" />

                    <input
                        type="password"
                        name="password"
                        placeholder="رمز عبور"
                    />

                    <textarea
                        name="bio"
                        placeholder="بیوگرافی (اختیاری)"
                        rows={4}
                    />

                    <button type="submit">ثبت‌نام</button>
                </form>
            </div>
        </main>
    );
}

export default Register;
