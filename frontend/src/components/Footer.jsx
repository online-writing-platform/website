import "./Footer.css";
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-links">
        <Link to="/about">درباره ما</Link>
        <Link to="/contact">ارتباط با ما</Link>
        <Link to="/rights">حقوق محفوظ</Link>
      </div>

      <div className="copyright">
        © 2026 Online Writing Platform. All Rights Reserved.
      </div>
    </footer>
  );
}

export default Footer;
