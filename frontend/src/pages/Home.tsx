import "./Home.css";
import SearchBar from "../components/SearchBar";
import StoryCard from "../components/StoryCard";
import storycover from "../assets/storycover.jpg";

interface Story {
  id: number;
  image: string;
  category: string;
  title: string;
  link: string;
}

const stories: Story[] = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  image: storycover,
  category: "فانتزی",
  title: "افسانه آخر",
  link: "/story/1",
}));

interface StorySectionProps {
  title: string;
}

function StorySection({ title }: StorySectionProps) {
  return (
    <section className="story-section">
      <h2 className="Story-title">{title}</h2>

      <div className="story-row">
        {stories.map((story) => (
          <StoryCard
            key={`${title}-${story.id}`}
            image={story.image}
            category={story.category}
            title={story.title}
            link={story.link}
            views={1000}
          />
        ))}
      </div>
    </section>
  );
}

function Home() {
  return (
    <main className="home">
      <StorySection title="تازه‌ها" />

      <StorySection title="محبوب‌ها" />

      <StorySection title="مطابق با سلیقه شما" />
    </main>
  );
}

export default Home;
