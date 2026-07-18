import "./Search.css";

function Search() {
  return (
    <main className="search-page">
      <h1>جستجوی داستان</h1>

      <section className="search-panel">
        <input type="text" placeholder="نام داستان، نویسنده یا ژانر..." />

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

          <button>جستجو</button>
        </div>
      </section>

      <section className="search-results">
        <h2>نتایج</h2>

        <div className="result-card">
          <div className="cover">Cover</div>

          <div className="result-info">
            <h3>عنوان داستان</h3>

            <p>توضیح کوتاهی درباره داستان...</p>
          </div>
        </div>

        <div className="result-card">
          <div className="cover">Cover</div>

          <div className="result-info">
            <h3>عنوان داستان</h3>

            <p>توضیح کوتاهی درباره داستان...</p>
          </div>
        </div>

        <div className="result-card">
          <div className="cover">Cover</div>

          <div className="result-info">
            <h3>عنوان داستان</h3>

            <p>توضیح کوتاهی درباره داستان...</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Search;
