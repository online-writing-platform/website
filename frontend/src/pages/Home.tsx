import "./Home.css";

import StoryCard from "../components/StoryCard";
import Smooth3DSlideshow from "../components/originkit/ui/coverflowgallery";

import storycover from "../assets/storycover.jpg";
import wedding from "../assets/wedding.jpg";
import myBoy from "../assets/myBoy.jpg";
import Hands from "../assets/Hands.jpg";
import Girl from "../assets/Girl.jpg";

interface Story {
  id: number;
  image: string;
  category: string;
  title: string;
  link: string;
}

const stories: Story[] = [
  {
    id: 1,
    image: storycover,
    category: "فانتزی",
    title: "افسانه آخر",
    link: "/story/1",
  },
  {
    id: 2,
    image: wedding,
    category: "عاشقانه",
    title: "عروس",
    link: "/story/2",
  },
  {
    id: 3,
    image: myBoy,
    category: "عاشقانه",
    title: "پسر من",
    link: "/story/3",
  },
  {
    id: 4,
    image: Hands,
    category: "درام",
    title: "دست در دست",
    link: "/story/4",
  },
  {
    id: 5,
    image: Girl,
    category: "معمایی",
    title: "آن دختر واقعی نبود",
    link: "/story/5",
  },
  {
    id: 6,
    image: storycover,
    category: "فانتزی",
    title: "راز آخر",
    link: "/story/6",
  },
  {
    id: 7,
    image: wedding,
    category: "عاشقانه",
    title: "خاطره",
    link: "/story/7",
  },
];

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
            link={story.link}
            views={1000}
          />
        ))}
      </div>
    </section>
  );
}

function Home() {
  const heroSlides = stories.map((story) => ({
    image: {
      src: story.image,
      alt: story.title,
    },
    title: story.title,
  }));

  return (
    <main className="home">
      <section className="home-hero">
        <Smooth3DSlideshow />
      </section>

      <StorySection title="تازه‌ها" />

      <StorySection title="محبوب‌ها" />

      <StorySection title="مطابق با سلیقه شما" />
    </main>
  );
}

export default Home;
