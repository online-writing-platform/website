import "./Home.css";

function Home() {
  return (
    <main className="home">
      <section className="search-section">
        <h2>جستجوی داستان</h2>

        <div className="search-box">
          <input type="text" placeholder="نام داستان، نویسنده یا ژانر..." />

          <button>جستجو</button>
        </div>

        <div className="filters">
          <select>
            <option>ژانر</option>
          </select>

          <select>
            <option>سال</option>
          </select>

          <select>
            <option>زبان</option>
          </select>

          <select>
            <option>وضعیت</option>
          </select>
        </div>
      </section>

      <section className="story-section">
        <h2>تازه‌ها</h2>

        <div className="story-row">
          <div className="story-card">داستان ۱</div>
          <div className="story-card">داستان ۲</div>
          <div className="story-card">داستان ۳</div>
          <div className="story-card">داستان ۴</div>
          <div className="story-card">داستان ۵</div>
        </div>
      </section>

      <section className="story-section">
        <h2>محبوب‌ها</h2>

        <div className="story-row">
          <div className="story-card">داستان ۱</div>
          <div className="story-card">داستان ۲</div>
          <div className="story-card">داستان ۳</div>
          <div className="story-card">داستان ۴</div>
          <div className="story-card">داستان ۵</div>
        </div>
      </section>

      <section className="story-section">
        <h2>مطابق با سلیقه شما</h2>

        <div className="story-row">
          <div className="story-card">داستان ۱</div>
          <div className="story-card">داستان ۲</div>
          <div className="story-card">داستان ۳</div>
          <div className="story-card">داستان ۴</div>
          <div className="story-card">داستان ۵</div>
        </div>
      </section>
    </main>
  );
}

export default Home;
