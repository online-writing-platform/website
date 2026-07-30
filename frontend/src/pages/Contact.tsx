import { useState, type FormEvent } from "react";

import "./Contact.css";
import "../styles/Form.css";

function Contact() {
  const MAX_MESSAGE_LENGTH = 1000;

  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
  }

  return (
    <main className="contact-page">
      <section className="contact-card">
        <h1 className="contact-title">ارتباط با ما</h1>

        <p className="contact-subtitle">
          اگر سؤال، پیشنهاد یا گزارشی دارید، از طریق فرم زیر با ما در ارتباط
          باشید.
        </p>

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">نام</label>

            <input
              id="name"
              name="name"
              type="text"
              placeholder="نام خود را وارد کنید"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">ایمیل</label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="example@email.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="message">پیام</label>

            <textarea
              id="message"
              name="message"
              rows={5}
              value={message}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="پیام خود را بنویسید..."
            />

            <p className="character-counter">
              {message.length} / {MAX_MESSAGE_LENGTH}
            </p>
          </div>

          <button type="submit" className="contact-button">
            ارسال پیام
          </button>
        </form>
      </section>
    </main>
  );
}

export default Contact;
