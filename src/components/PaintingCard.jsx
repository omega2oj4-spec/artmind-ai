import React from 'react';
import { FaDownload } from 'react-icons/fa';
import './PaintingCard.css';

export default function PaintingCard({ painting }) {
  if (!painting) return null;

  const imageUrl = painting.imageUrl || painting.src;
  const downloadName = `${(painting.title || 'artwork').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'artwork'}.jpg`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `/api/paintings/download?url=${encodeURIComponent(imageUrl)}&name=${encodeURIComponent(painting.title || 'artwork')}`;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <article className="painting-card" id={`painting-${painting.id || painting._id}`} tabIndex="-1">
      <div className="painting-card-image-wrapper">
        <img
          src={imageUrl}
          alt={painting.title}
          loading="lazy"
        />
        <button
          type="button"
          className="painting-download-btn"
          onClick={handleDownload}
          aria-label={`Download ${painting.title || 'artwork'}`}
          title="Download artwork"
        >
          <FaDownload />
          <span>Download</span>
        </button>
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
