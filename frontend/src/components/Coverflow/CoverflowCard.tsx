import { Link } from "react-router-dom";

import "./CoverflowCard.css";

import { CoverflowItem } from "./types";

interface CoverflowCardProps {
  item: CoverflowItem;

  offset: number;

  isActive: boolean;

  rotate: number;

  spacing: number;

  scale: number;

  onClick: () => void;
}

function CoverflowCard({
  item,
  offset,
  isActive,
  rotate,
  spacing,
  scale,
  onClick,
}: CoverflowCardProps) {
  const translateX = offset * spacing;

  const rotateY = offset * rotate;

  const cardScale = isActive ? 1 : scale;

  const zIndex = 100 - Math.abs(offset);

  const opacity = Math.abs(offset) > 4 ? 0 : 1;

  const blur = Math.abs(offset) * 0.8;

  const transform = `
    translateX(${translateX}px)
    translateZ(${-Math.abs(offset) * 120}px)
    rotateY(${rotateY}deg)
    scale(${cardScale})
  `;

  const content = (
    <>
      <img src={item.image} alt={item.title} draggable={false} />

      <div className="coverflow-card-overlay">
        <h3>{item.title}</h3>

        {item.subtitle && <p>{item.subtitle}</p>}
      </div>
    </>
  );

  return (
    <article
      className={`coverflow-card ${isActive ? "active" : ""}`}
      onClick={onClick}
      style={{
        transform,
        zIndex,
        opacity,
        filter: `blur(${blur}px)`,
      }}
    >
      {item.href ? <Link to={item.href}>{content}</Link> : content}
    </article>
  );
}

export default CoverflowCard;
