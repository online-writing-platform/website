import "./Home.css";
import StorySection from "../components/StorySection";
import Smooth3DSlideshow from "../components/originkit/ui/coverflowgallery";
import { mockStories } from "@/data/mockStories";

function Home() {
  const heroSlides = mockStories.map((story) => ({
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
