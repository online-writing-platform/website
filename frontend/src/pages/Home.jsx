import "./Home.css";
import Filter from "../components/Filters/Filter";
import StoryCard from "../components/StoryCard";
import SearchBar from "../components/SearchBar";

function Home() {
  return (
    <main className="home">
      <SearchBar />
      <Filter />

      <section className="story-section">
        <h2>تازه‌ها</h2>

        <div className="story-row">
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
        </div>
      </section>

      <section className="story-section">
        <h2>محبوب‌ها</h2>

        <div className="story-row">
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
        </div>
      </section>

      <section className="story-section">
        <h2>مطابق با سلیقه شما</h2>

        <div className="story-row">
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
        </div>
      </section>
    </main>
  );
}

export default Home;
