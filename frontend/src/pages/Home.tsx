import "./Home.css";
import SearchBar from "../components/SearchBar";
import StoryCard from "../components/StoryCard";

import Smooth3DSlideshow from "../components/originkit/ui/coverflowgallery";
import storycover from "../assets/storycover.jpg";
import wedding from "../assets/wedding.jpg";
import myBoy from "../assets/myBoy.jpg";
import Hands from "../assets/Hands.jpg";
import Girl from "../assets/Girl.jpg";

import { Link } from "react-router-dom";

interface Story {
  id: number;
  image: string;
  category: string;
  title: string;
  link: string;
}

const stories: Story[] = Array.from({ length: 7 }, (_, index) => ({
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
      <Smooth3DSlideshow />
      <div className="Story-Container">
        <StorySection title="تازه‌ها" />

        <StorySection title="محبوب‌ها" />

        <StorySection title="مطابق با سلیقه شما" />
      </div>
    </main>
  );
}

export default Home;
