import "./Error.css";
import { Link } from "react-router-dom";

function Error() {
  return (
    <main className="error-page">
      <div className="error-box">
        <h1>Oops!</h1>

        <p>Something went wrong.</p>

        <Link to="/" className="home-btn">
          برگرد خونه
        </Link>
      </div>
    </main>
  );
}

export default Error;
