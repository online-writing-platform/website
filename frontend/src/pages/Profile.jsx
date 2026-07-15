import "./Profile.css";

function Profile() {
  return (
    <main className="profile-page">
      {/*user */}
      <aside className="profile-card">
        <div className="profile-image">Profile</div>

        <h2>نام نمایشی</h2>

        <p className="username">@username</p>

        <p className="bio"></p>

        <button className="edit-btn">ویرایش پروفایل</button>
      </aside>

      {/*stories*/}
      <section className="stories-section">
        <h2>نوشته‌ها</h2>

        <div className="stories">
          <div className="story-card">
            <div className="story-cover">Cover</div>

            <div className="story-info">
              <h3>عنوان داستان</h3>

              <p>توضیح کوتاهی درباره داستان در این قسمت نمایش داده می‌شود.</p>
            </div>
          </div>

          <div className="story-card">
            <div className="story-cover">Cover</div>

            <div className="story-info">
              <h3>عنوان داستان</h3>

              <p>توضیح کوتاهی درباره داستان در این قسمت نمایش داده می‌شود.</p>
            </div>
          </div>

          <div className="story-card">
            <div className="story-cover">Cover</div>

            <div className="story-info">
              <h3>عنوان داستان</h3>

              <p>توضیح کوتاهی درباره داستان در این قسمت نمایش داده می‌شود.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Profile;
