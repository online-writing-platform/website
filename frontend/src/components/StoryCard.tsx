import { HiOutlineEye, HiOutlineHeart } from "react-icons/hi2";
import { Link } from "react-router-dom";
import "./StoryCard.css";
import Button from "./Button";

interface StoryCardProps {
  image: string;
  category: string;
  title: string;
  link: string;
  views?: number | string;
  likes?: number | string;
  status?: string;
}

function StoryCard({
  image,
  category,
  title,
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
        <Link to={link} className="story-title">
          {title}
        </Link>

        {hasMetadata && (
          <div className="story-meta">
            <div className="story-stats">
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
        <span className="story-category">{category}</span>
        <span className="views">
          <HiOutlineEye className="icon" />
          {views}
        </span>
      </div>
    </article>
  );
}

export default StoryCard;
