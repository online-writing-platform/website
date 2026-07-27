import "./StoryCard.css";
import { Link } from "react-router-dom";

function StoryCard({ image, category, title, description, link }) {
  return (
    <div className="story-card">
      <Link to={link}>
        <img src={image} alt={title} className="story-card-image" />
      </Link>

      <div className="story-card-body">
        <span className="story-category">{category}</span>

        <Link to={link} className="story-title">
          {title}
        </Link>

        <p className="story-description">{description}</p>

        <Link to={link} className="story-button">
          مطالعه داستان →
        </Link>
      </div>
    </div>
  );
}

export default StoryCard;
