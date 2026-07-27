import "./SearchBar.css";
import { FaSearch } from "react-icons/fa";

function SearchBar() {
  return (
    <form className="search-form">

      <label htmlFor="search" className="sr-only">
        Search
      </label>

      <div className="search-box">

        <FaSearch className="search-icon" />

        <input
          id="search"
          type="search"
          placeholder="جستجوی داستان، نویسنده یا ژانر..."
          className="search-input"
        />

        <button
          type="submit"
          className="search-button"
        >
          جستجو
        </button>

      </div>

    </form>
  );
}

export default SearchBar;