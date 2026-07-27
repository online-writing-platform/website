import Filter from "../components/Filters/Filter";
import SearchBar from "../components/SearchBar";
import StoryCard from "../components/StoryCard";
import "./Search.css";

function Search() {
  return (
    <main className="search-page">
      <h1>جستجوی داستان</h1>

      <SearchBar />

      <Filter />
      <h2>نتایج</h2>
      <section className="search-results">
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
    </main>
  );
}

export default Search;
