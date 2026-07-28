import { useState } from "react";

import { filterData } from "../../data/filters";
import FilterDropdown from "./FilterDropdown";

function Filter() {
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

    const [selectedStatus, setSelectedStatus] = useState<string[]>([]);

    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

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
