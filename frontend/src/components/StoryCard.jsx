import "./StoryCard.css";
import { Link } from "react-router-dom";
import { HiOutlineEye, HiOutlineHeart } from "react-icons/hi2";

function StoryCard({
  image,
  category,
  title,
  description,
  views,
  likes,
  status,
  link,
}) {
  return (
    <article className="story-card">
      <Link to={link} className="story-image-link">
        <img src={image} alt={title} className="story-card-image" />
      </Link>

      <div className="story-card-body">
        <span className="story-category">{category}</span>

        <Link to={link} className="story-title">
          {title}
        </Link>

        <p className="story-description">{description}</p>

        {(views || likes || status) && (
          <div className="story-meta">
            <div className="story-stats">
              {views && (
                <span>
                  <HiOutlineEye />
                  {views}
                </span>
              )}

              {likes && (
                <span>
                  <HiOutlineHeart />
                  {likes}
                </span>
              )}
            </div>

            {status && <span className="story-status">{status}</span>}
          </div>
        )}

        <Link to={link} className="story-button">
          مطالعه داستان
        </Link>
      </div>
    </article>
  );
}

export default StoryCard;
