import "./Filter.css";

function Filter() {
  return (
    <div className="filter-container">
      <details className="filter-dropdown">
        <summary>
          <span>ژانر</span>
          <span className="arrow">▼</span>
        </summary>

        <div className="dropdown-content">
          <div className="dropdown-header">
            <span>0 Selected</span>
            <button type="button">Reset</button>
          </div>

          <div className="checkbox-group">
            <label>
              <input type="checkbox" />
              <span>Option 1</span>
            </label>

            <label>
              <input type="checkbox" />
              <span>Option 2</span>
            </label>

            <label>
              <input type="checkbox" />
              <span>Option 3</span>
            </label>
          </div>
        </div>
      </details>

      <details className="filter-dropdown">
        <summary>
          <span>وضعیت</span>
          <span className="arrow">▼</span>
        </summary>

        <div className="dropdown-content">
          <div className="dropdown-header">
            <span>0 Selected</span>
            <button type="button">Reset</button>
          </div>

          <div className="checkbox-group">
            <label>
              <input type="checkbox" />
              <span>Option 1</span>
            </label>

            <label>
              <input type="checkbox" />
              <span>Option 2</span>
            </label>

            <label>
              <input type="checkbox" />
              <span>Option 3</span>
            </label>
          </div>
        </div>
      </details>
      <details className="filter-dropdown">
        <summary>
          <span>زبان</span>
          <span className="arrow">▼</span>
        </summary>

        <div className="dropdown-content">
          <div className="dropdown-header">
            <span>0 Selected</span>
            <button type="button">Reset</button>
          </div>

          <div className="checkbox-group">
            <label>
              <input type="checkbox" />
              <span>Option 1</span>
            </label>

            <label>
              <input type="checkbox" />
              <span>Option 2</span>
            </label>

            <label>
              <input type="checkbox" />
              <span>Option 3</span>
            </label>
          </div>
        </div>
      </details>
    </div>
  );
}

export default Filter;
