import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <span className="footer-copy">
          © 2026{" "}
          <a href="/" className="footer-logo">
            Online Writing Platform
          </a>
          . All Rights Reserved.
        </span>

        <ul className="footer-links">
          <li>
            <a href="/about">درباره ما</a>
          </li>

          <li>
            <a href="/terms">قوانین و مقررات</a>
          </li>

          <li>
            <a href="/privacy">حریم خصوصی</a>
          </li>

          <li>
            <a href="/contact">ارتباط با ما</a>
          </li>
        </ul>
      </div>
    </footer>
  );
}

export default Footer;
