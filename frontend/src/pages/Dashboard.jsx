import "./Dashboard.css";
import StoryCard from "../components/StoryCard";
import { Link } from "react-router-dom";

function Dashboard() {
  return (
    <main className="dashboard-page">
      {/* Header */}

      <section className="dashboard-header">
        <div>
          <h1>سلام، کاربر جدید 👋</h1>

          <p>امروز آماده‌ای یک داستان جدید خلق کنی؟</p>
        </div>

        <Link to="/create-story" className="new-story-btn">
          + داستان جدید
        </Link>
      </section>

      {/* Statistics */}

      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">📚</span>

          <h2>12</h2>

          <p>نوشته‌ها</p>
        </div>

        <div className="stat-card">
          <span className="stat-icon">👁</span>

          <h2>1,254</h2>

          <p>بازدید</p>
        </div>

        <div className="stat-card">
          <span className="stat-icon">❤️</span>

          <h2>324</h2>

          <p>پسند</p>
        </div>

        <div className="stat-card">
          <span className="stat-icon">👥</span>

          <h2>87</h2>

          <p>دنبال‌کننده</p>
        </div>
      </section>

      {/* Quick Actions */}

      <section className="quick-actions">
        <Link className="action-card">
          ✍️
          <span>نوشتن داستان</span>
        </Link>

        <Link className="action-card">
          📚
          <span>مدیریت نوشته‌ها</span>
        </Link>

        <Link to="/profile" className="action-card">
          👤
          <span>پروفایل</span>
        </Link>
      </section>

      {/* Recent Stories */}

      <section className="recent-section">
        <div className="section-header">
          <h2>آخرین نوشته‌ها</h2>

          <Link>مشاهده همه</Link>
        </div>

        <StoryCard
          image="https://picsum.photos/300/200"
          category="فانتزی"
          title="افسانه آخر"
          description="داستانی درباره سفر یک قهرمان..."
          views={521}
          likes={84}
          status="درحال انتشار"
          link="/story/1"
        />
        <StoryCard
          image="..."
          category="وحشت"
          title="خانه خاموش"
          description="..."
          views={1850}
          likes={320}
          status="پایان یافته"
          link="/story/3"
        />
      </section>
    </main>
  );
}

export default Dashboard;
