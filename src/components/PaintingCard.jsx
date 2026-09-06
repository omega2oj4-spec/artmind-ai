import React from 'react';
import './PaintingCard.css';

export default function PaintingCard({ painting }) {
  if (!painting) return null;

  const imageUrl = painting.imageUrl || painting.src;

  return (
    <article className="painting-card" id={`painting-${painting.id || painting._id}`} tabIndex="-1">
      <div className="painting-card-image-wrapper">
        <img
          src={imageUrl}
          alt={painting.title}
          loading="lazy"
        />
      </div>

      <div className="painting-card-content">
        <div className="painting-card-tags">
          {painting.category && <span className="tag category-tag">{painting.category}</span>}
          {painting.colorMedium && <span className="tag medium-tag">{painting.colorMedium}</span>}
        </div>
        <h3 className="painting-card-title">{painting.title}</h3>
        {painting.artist && <p className="painting-card-artist">{painting.artist}</p>}
      </div>
    </article>
  );
}
