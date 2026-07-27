import Filter from "../components/Filter";
import SearchBar from "../components/SearchBar";
import StoryCard from "../components/StoryCard";
import "./Search.css";

function Search() {
  return (
    <main className="search-page">
      <h1>جستجوی داستان</h1>

      <SearchBar />

      <Filter />

      <section className="search-results">
        <h2>نتایج</h2>

        <StoryCard />

        <StoryCard />

        <StoryCard />
      </section>
    </main>
  );
}

export default Search;
