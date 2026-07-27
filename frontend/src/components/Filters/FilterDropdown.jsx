function FilterDropdown({ title, options, selectedItems, setSelectedItems }) {
  const handleChange = (item) => {
    setSelectedItems((prev) =>
      prev.includes(item)
        ? prev.filter((value) => value !== item)
        : [...prev, item],
    );
  };

  const handleReset = () => {
    setSelectedItems([]);
  };

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
