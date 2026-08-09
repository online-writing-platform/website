import "./Error.css";
import Button from "../components/Button";
function ErrorPage() {
  return (
    <main className="error-page">
      <div className="error-box">
        <h1>Oops!</h1>

        <p>Something went wrong.</p>

        <Button to="/">برگرد خونه</Button>
      </div>
    </main>
  );
}

export default ErrorPage;
