import type { Dispatch, SetStateAction } from "react";

interface FilterDropdownProps {
    title: string;
    options: readonly string[];
    selectedItems: string[];
    setSelectedItems: Dispatch<SetStateAction<string[]>>;
}

function FilterDropdown({
    title,
    options,
    selectedItems,
    setSelectedItems,
}: FilterDropdownProps) {
    function handleChange(item: string): void {
        setSelectedItems((previousItems) =>
            previousItems.includes(item)
                ? previousItems.filter((value) => value !== item)
                : [...previousItems, item],
        );
    }

    function handleReset(): void {
        setSelectedItems([]);
    }

    return (
        <details className="filter-dropdown">
            <summary>
                <span>{title}</span>
                <span className="arrow">▼</span>
            </summary>

            <div className="dropdown-content">
                <div className="dropdown-header">
                    <span>{selectedItems.length} انتخاب شده</span>

                    <button type="button" onClick={handleReset}>
                        بازنشانی
                    </button>
                </div>

                <div className="checkbox-group">
                    {options.map((item) => (
                        <label key={item}>
                            <input
                                type="checkbox"
                                checked={selectedItems.includes(item)}
                                onChange={() => handleChange(item)}
                            />

                            <span>{item}</span>
                        </label>
                    ))}
                </div>
            </div>
        </details>
    );
}

export default FilterDropdown;
