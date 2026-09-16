import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaDownload, FaHeart, FaRegHeart } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext.jsx';
import API_BASE, { proxyImageUrl } from '../utils/api.js';
import { getArtworkImageUrl } from '../utils/artworkImages.js';
import './PaintingCard.css';

export default function PaintingCard({ painting }) {
  const location = useLocation();
  const { favorites, toggleFavorite } = useContext(AuthContext);

  if (!painting) return null;

  const paintingId = painting._id || painting.id || painting.catalogId;
  const candidateIds = [painting._id, painting.id, painting.catalogId].filter(Boolean).map(String);
  const isFav = favorites?.some((favId) => candidateIds.includes(String(favId)));
  const [localIsFav, setLocalIsFav] = useState(isFav);
  const isTogglingRef = useRef(false);

  useEffect(() => {
    // Only sync if we're not in the middle of a toggle operation
    if (!isTogglingRef.current) {
      setLocalIsFav(isFav);
    }
  }, [isFav]);

  // Sources that block browser hotlinking are routed through the API image
  // proxy, while retaining the actual image supplied by the catalogue.
  const rawImageUrl = getArtworkImageUrl(painting);
  const thumbnailUrl = painting.thumbnailUrl || painting.thumbnail || '';
  // Full IIIF images are primary. The source LQIP remains a reliable last
  // fallback for a record whose full image cannot be reached.
  const proxiedImageUrl = proxyImageUrl(rawImageUrl);
  const imageUrl = proxiedImageUrl;

  const handleImageError = (event) => {
    const image = event.currentTarget;
    // Render's proxy can occasionally time out on large IIIF files. Browser
    // image requests do not need CORS, so retry the source image directly.
    if (!image.dataset.triedDirect && rawImageUrl && proxiedImageUrl !== rawImageUrl) {
      image.dataset.triedDirect = 'true';
      image.src = rawImageUrl;
      return;
    }
    // AIC includes a compact LQIP thumbnail in its artwork payload. It still
    // represents the actual artwork when the full image is unavailable.
    if (!image.dataset.triedThumbnail && thumbnailUrl) {
      image.dataset.triedThumbnail = 'true';
      image.src = thumbnailUrl;
      return;
    }
    image.onerror = null;
    image.src = '/artwork-fallback.svg';
  };

  // Preserve the complete route (including gallery filters and search query)
  // so Painting Details can return through the browser history to this view.
  const sourceLocation = {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash
  };


  const downloadName = `${(painting.title || 'artwork').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'artwork'}.jpg`;

  const handleDownload = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = `${API_BASE}/api/paintings/download?url=${encodeURIComponent(rawImageUrl)}&name=${encodeURIComponent(painting.title || 'artwork')}`;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!paintingId) return;

    // Mark that we're toggling to prevent useEffect from overriding
    isTogglingRef.current = true;

    // Optimistic UI update - immediately change heart color
    setLocalIsFav(!localIsFav);

    const res = await toggleFavorite(paintingId);
    if (res && res.requireAuth) {
      alert('Please sign in to save your favorite artworks.');
      setLocalIsFav(isFav); // Revert if authentication required
    } else if (res && !res.success) {
      setLocalIsFav(isFav); // Revert if API call failed
    }

    // Allow useEffect to sync again after a short delay
    setTimeout(() => {
      isTogglingRef.current = false;
    }, 100);
  };

  return (
    <article className="painting-card" id={`painting-${paintingId}`} tabIndex="-1">
      <Link
        to={`/painting/${paintingId}`}
        state={{ from: sourceLocation }}
        className="painting-card-link"
        style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flex: 1 }}
      >
        <div className="painting-card-image-wrapper">
          <img
            src={imageUrl}
            alt={painting.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={handleImageError}
          />
          <button
            type="button"
            className={`painting-fav-btn ${localIsFav ? 'active' : ''}`}
            onClick={handleFavoriteClick}
            aria-label={localIsFav ? `Remove ${painting.title || 'artwork'} from favorites` : `Add ${painting.title || 'artwork'} to favorites`}
            title={localIsFav ? "Remove from favorites" : "Add to favorites"}
          >
            {localIsFav ? <FaHeart color="#ff477e" /> : <FaRegHeart />}
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
