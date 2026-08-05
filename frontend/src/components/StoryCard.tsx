import { HiOutlineEye, HiOutlineHeart } from "react-icons/hi2";
import { Link } from "react-router-dom";
import "./StoryCard.css";
import Button from "./Button";

import { StoryListItem } from "../types/story";

interface StoryCardProps extends StoryListItem {
  views?: number;
  likes?: number;
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
        <span className="story-category">{category}</span>

        <Link to={link} className="story-title">
          {title}
        </Link>

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

        <Button to={link}>مطالعه داستان</Button>
      </div>
    </article>
  );
}

export default StoryCard;
