import { useState } from "react";
import "./Filter.css";

import FilterDropdown from "./FilterDropdown";
import { filterData } from "../../data/filters";

function Filter() {
  const [selectedGenres, setSelectedGenres] = useState([]);

  const [selectedStatus, setSelectedStatus] = useState([]);

  const [selectedLanguages, setSelectedLanguages] = useState([]);

  return (
    <div className="filter-container">
      <FilterDropdown
        title="ژانر"
        options={filterData.genres}
        selectedItems={selectedGenres}
        setSelectedItems={setSelectedGenres}
      />

      <FilterDropdown
        title="وضعیت"
        options={filterData.status}
        selectedItems={selectedStatus}
        setSelectedItems={setSelectedStatus}
      />

      <FilterDropdown
        title="زبان"
        options={filterData.languages}
        selectedItems={selectedLanguages}
        setSelectedItems={setSelectedLanguages}
      />
    </div>
  );
}

export default Filter;
