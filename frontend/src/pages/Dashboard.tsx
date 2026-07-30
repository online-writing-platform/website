import "./Dashboard.css";
import { Link } from "react-router-dom";

import { FaRegHandPaper, FaRegEye } from "react-icons/fa";
import { RiBookShelfLine } from "react-icons/ri";
import { AiFillHeart } from "react-icons/ai";
import { MdPeopleAlt, MdCreate } from "react-icons/md";
import { IoPersonCircleSharp } from "react-icons/io5";
import { LuNotebookPen } from "react-icons/lu";

import StoryCard from "../components/StoryCard";

function Dashboard() {
  return (
    <main className="dashboard-page">
      <section className="dashboard-header">
        <div>
          <h1>
            سلام، کاربر جدید <FaRegHandPaper />
          </h1>

          <p>امروز آماده‌ای یک داستان جدید خلق کنی؟</p>
        </div>

        <Link to="/create-story" className="new-story-btn">
          + داستان جدید
        </Link>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">
            <RiBookShelfLine />
          </span>

          <h2>12</h2>

          <p>نوشته‌ها</p>
        </div>

        <div className="stat-card">
          <span className="stat-icon">
            <FaRegEye />
          </span>

          <h2>1,254</h2>

          <p>بازدید</p>
        </div>

        <div className="stat-card">
          <span className="stat-icon">
            <AiFillHeart />
          </span>

          <h2>324</h2>

          <p>پسند</p>
        </div>

        <div className="stat-card">
          <span className="stat-icon">
            <MdPeopleAlt />
          </span>

          <h2>87</h2>

          <p>دنبال‌کننده</p>
        </div>
      </section>

      <section className="quick-actions">
        <Link to="/create-story" className="action-card">
          <LuNotebookPen />
          <span>نوشتن داستان</span>
        </Link>

        <Link to="/dashboard" className="action-card">
          <MdCreate />
          <span>مدیریت نوشته‌ها</span>
        </Link>

        <Link to="/profile" className="action-card">
          <IoPersonCircleSharp />
          <span>پروفایل</span>
        </Link>
      </section>

      <section className="recent-section">
        <div className="section-header">
          <h2>آخرین نوشته‌ها</h2>

          <Link to="/profile">مشاهده همه</Link>
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
          image="https://picsum.photos/300/200"
          category="وحشت"
          title="خانه خاموش"
          description="داستانی مرموز در عمارتی قدیمی..."
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
