import type { FormEvent } from "react";
import { CiSearch } from "react-icons/ci";
import "./SearchBar.css";
function SearchBar() {
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="search-box" dir="rtl">
        <CiSearch className="search-icon" />

        <input
          id="search"
          name="search"
          type="search"
          placeholder="جستجوی داستان، نویسنده یا ژانر..."
          className="search-input"
        />
      </div>
    </form>
  );
}

export default SearchBar;
