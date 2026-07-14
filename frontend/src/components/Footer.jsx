import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-links">
        <a href="/about">درباره ما</a>
        <a href="/contact">ارتباط با ما</a>
        <a href="/rights">حقوق محفوظ</a>
      </div>

      <div className="copyright">
        © 2026 Online Writing Platform. All Rights Reserved.
      </div>
    </footer>
  );
}

export default Footer;
