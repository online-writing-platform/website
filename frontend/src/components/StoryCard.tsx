import { HiOutlineEye, HiOutlineHeart } from "react-icons/hi2";
import { Link } from "react-router-dom";
import "./StoryCard.css";
interface StoryCardProps {
  image: string;
  category: string;
  title: string;
  description: string;
  link: string;
  views?: number | string;
  likes?: number | string;
  status?: string;
}

function StoryCard({
  image,
  category,
  title,
  description,
  views,
  likes,
  status,
  link,
}: StoryCardProps) {
  const hasMetadata =
    views !== undefined || likes !== undefined || status !== undefined;

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

        {hasMetadata && (
          <div className="story-meta">
            <div className="story-stats">
              {views !== undefined && (
                <span>
                  <HiOutlineEye />
                  {views}
                </span>
              )}

              {likes !== undefined && (
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
