import "./Home.css";

import Filter from "../components/Filters/Filter";
import SearchBar from "../components/SearchBar";
import StoryCard from "../components/StoryCard";

interface Story {
  id: number;
  image: string;
  category: string;
  title: string;
  description: string;
  link: string;
}

const stories: Story[] = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1,
  image: "https://picsum.photos/300/200",
  category: "فانتزی",
  title: "افسانه آخر",
  description: "داستانی درباره سفر یک قهرمان...",
  link: "/story/1",
}));

interface StorySectionProps {
  title: string;
}

function StorySection({ title }: StorySectionProps) {
  return (
    <section className="story-section">
      <h2>{title}</h2>

      <div className="story-row">
        {stories.map((story) => (
          <StoryCard
            key={`${title}-${story.id}`}
            image={story.image}
            category={story.category}
            title={story.title}
            description={story.description}
            link={story.link}
          />
        ))}
      </div>
    </section>
  );
}

function Home() {
  return (
    <main className="home">
      <SearchBar />

      <Filter />

      <StorySection title="تازه‌ها" />

      <StorySection title="محبوب‌ها" />

      <StorySection title="مطابق با سلیقه شما" />
    </main>
  );
}

export default Home;
