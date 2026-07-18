import "./Contact.css";

function Contact() {
  return (
    <main className="contact-page">
      <div className="contact-card">
        <h1>ارتباط با ما</h1>

        <p className="contact-text">
          اگر سؤال، پیشنهاد یا گزارشی دارید، از طریق فرم زیر با ما در ارتباط
          باشید.
        </p>

        <form className="contact-form">
          <input type="text" placeholder="نام" />

          <input type="email" placeholder="ایمیل" />

          <textarea placeholder="پیام شما..." rows="6"></textarea>

          <button type="submit">ارسال پیام</button>
        </form>

        <div className="contact-info">
          <p>📧 support@example.com</p>
          <p>📞 +98 21 1234 5678</p>
        </div>
      </div>
    </main>
  );
}

export default Contact;
