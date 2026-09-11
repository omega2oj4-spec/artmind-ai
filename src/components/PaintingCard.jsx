import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { FaDownload, FaHeart, FaRegHeart } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext.jsx';
import './PaintingCard.css';

export default function PaintingCard({ painting }) {
  if (!painting) return null;

  const { favorites, toggleFavorite } = useContext(AuthContext);
  const paintingId = painting._id || painting.id;
  const isFav = favorites?.some(favId => String(favId) === String(paintingId));

  const rawImageUrl = painting.imageUrl || painting.src;

  // These hosts block direct browser image requests with 403.
  // Route them through our server proxy — everything else loads fine directly.
  const PROXIED_HOSTS = ['www.artic.edu', 'images.metmuseum.org', 'api.nga.gov'];
  const imageUrl = (() => {
    if (!rawImageUrl) return '';
    try {
      const { hostname } = new URL(rawImageUrl);
      if (PROXIED_HOSTS.includes(hostname)) {
        return `/api/paintings/proxy-image?url=${encodeURIComponent(rawImageUrl)}`;
      }
    } catch { /* not a valid URL — use as-is */ }
    return rawImageUrl;
  })();

  const downloadName = `${(painting.title || 'artwork').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'artwork'}.jpg`;

  const handleDownload = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = `/api/paintings/download?url=${encodeURIComponent(rawImageUrl)}&name=${encodeURIComponent(painting.title || 'artwork')}`;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!paintingId) return;

    const res = await toggleFavorite(paintingId);
    if (res && res.requireAuth) {
      alert('Please sign in to save your favorite artworks.');
    }
  };

  return (
    <article className="painting-card" id={`painting-${paintingId}`} tabIndex="-1">
      <Link to={`/painting/${paintingId}`} className="painting-card-link" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className="painting-card-image-wrapper">
          <img
            src={imageUrl}
            alt={painting.title}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <button
            type="button"
            className={`painting-fav-btn ${isFav ? 'active' : ''}`}
            onClick={handleFavoriteClick}
            aria-label={isFav ? `Remove ${painting.title || 'artwork'} from favorites` : `Add ${painting.title || 'artwork'} to favorites`}
            title={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            {isFav ? <FaHeart color="#ff477e" /> : <FaRegHeart />}
          </button>
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
      </Link>
    </article>
  );
}
