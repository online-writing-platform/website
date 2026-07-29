import StoryCard from "../components/StoryCard";
import "./Profile.css";
function Profile() {
  return (
    <main className="profile-page">
      <aside className="profile-card">
        <div className="profile-image">Profile</div>

        <h2>نام نمایشی</h2>

        <p className="username">@username</p>

        <p className="bio" />

        <button type="button" className="edit-btn">
          ویرایش پروفایل
        </button>
      </aside>

      <section>
        <h2 className="stories">نوشته‌ها</h2>

        <section className="stories-section">
          <StoryCard
            image="https://picsum.photos/300/200"
            category="فانتزی"
            title="افسانه آخر"
            description="داستانی درباره سفر یک قهرمان..."
            link="/story/1"
          />

          <StoryCard
            image="https://picsum.photos/300/200"
            category="فانتزی"
            title="افسانه آخر"
            description="داستانی درباره سفر یک قهرمان..."
            link="/story/1"
          />

          <StoryCard
            image="https://picsum.photos/300/200"
            category="فانتزی"
            title="افسانه آخر"
            description="داستانی درباره سفر یک قهرمان..."
            link="/story/1"
          />
        </section>
      </section>
    </main>
  );
}

export default Profile;
