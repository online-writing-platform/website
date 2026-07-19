import "./Dashboard.css";
import { Link } from "react-router-dom";

function Dashboard() {
  return (
    <main className="dashboard-page">
      <h1>داشبورد</h1>

      <section className="dashboard-stats">
        <div className="stat-card">
          <h2>نوشته‌ها</h2>
          <p>12</p>
        </div>

        <div className="stat-card">
          <h2>بازدیدها</h2>
          <p>1,254</p>
        </div>

        <div className="stat-card">
          <h2>پسندها</h2>
          <p>324</p>
        </div>
      </section>

      <section className="dashboard-actions">
        <Link>داستان جدید</Link>
        <Link>مدیریت نوشته‌ها</Link>
        <Link to="/profile">ویرایش پروفایل</Link>
      </section>

      <section className="recent-stories">
        <h2>آخرین نوشته‌ها</h2>

        <div className="story-item">
          <h3>عنوان داستان</h3>
          <p>توضیح کوتاهی از داستان...</p>
        </div>

        <div className="story-item">
          <h3>عنوان داستان</h3>
          <p>توضیح کوتاهی از داستان...</p>
        </div>

        <div className="story-item">
          <h3>عنوان داستان</h3>
          <p>توضیح کوتاهی از داستان...</p>
        </div>
      </section>
    </main>
  );
}

export default Dashboard;
