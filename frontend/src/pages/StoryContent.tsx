import { useState, type FormEvent } from "react";
import { AiFillPicture } from "react-icons/ai";
import "./StoryContent.css";

const MAX_SUMMARY_LENGTH = 500;

function WriteStory() {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [summary, setSummary] = useState("");
  const [chapterTitle] = useState("");
  const [content] = useState("");
  const [cover, setCover] = useState<File | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    console.log({
      title,
      genre,
      summary,
      chapterTitle,
      content,
    });
  }

  return (
    <main className="write-story-page">
      <section className="write-story-card">
        <h1 className="write-story-title">جزئیات داستان</h1>

        <form className="write-story-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="cover" className="cover-upload">
              {cover ? (
                <img
                  src={URL.createObjectURL(cover)}
                  alt="Story Cover"
                  className="cover-preview"
                />
              ) : (
                <div className="cover-placeholder">
                  <span>
                    <AiFillPicture />
                  </span>

                  <p>برای انتخاب کاور کلیک کنید</p>

                  <small>نسبت تصویر 3:4</small>
                </div>
              )}
            </label>

            <input
              id="cover"
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  setCover(file);
                }
              }}
            />
          </div>
          <div className="form-group">
            <label htmlFor="title">عنوان داستان</label>

            <input
              id="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="مثلاً افسانه آخر"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="genre">ژانر</label>

            <select
              id="genre"
              value={genre}
              onChange={(event) => setGenre(event.target.value)}
              required
            >
              <option value="">انتخاب ژانر</option>

              <option value="fantasy">فانتزی</option>

              <option value="romance">عاشقانه</option>

              <option value="drama">درام</option>

              <option value="horror">ترسناک</option>

              <option value="science-fiction">علمی تخیلی</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="summary">خلاصه داستان</label>

            <textarea
              id="summary"
              rows={4}
              value={summary}
              maxLength={MAX_SUMMARY_LENGTH}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="خلاصه‌ای کوتاه از داستان..."
            />

            <p className="character-counter">
              {summary.length} / {MAX_SUMMARY_LENGTH}
            </p>
          </div>
        </form>
      </section>
    </main>
  );
}

export default WriteStory;
