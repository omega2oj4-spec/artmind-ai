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

  const candidateIds = [
    painting._id,
    painting.id,
    painting.catalogId
  ]
    .filter(Boolean)
    .map(String);

  const isFav = favorites?.some((favId) =>
    candidateIds.includes(String(favId))
  );

  const [localIsFav, setLocalIsFav] = useState(isFav);
  const isTogglingRef = useRef(false);

  useEffect(() => {
    if (!isTogglingRef.current) {
      setLocalIsFav(isFav);
    }
  }, [isFav]);

  /*
   * ---------------------------------------------------------
   * IMAGE HANDLING
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   * Never send Art Institute / Artvee URLs directly to the
   * browser. Some of these hosts reject browser requests.
   *
   * Everything goes through our backend proxy.
   */

  const rawImageUrl = getArtworkImageUrl(painting);

  const thumbnailUrl =
    painting.thumbnailUrl ||
    painting.thumbnail ||
    '';

  // Main image through backend proxy
  const primaryImageUrl = rawImageUrl
    ? proxyImageUrl(rawImageUrl)
    : '';

  // Thumbnail also goes through backend proxy
  const fallbackImageUrl = thumbnailUrl
    ? proxyImageUrl(thumbnailUrl)
    : '';

  const handleImageError = (event) => {
    const image = event.currentTarget;

    /*
     * First fallback:
     * Try the thumbnail THROUGH OUR SERVER.
     *
     * We intentionally do NOT use rawImageUrl directly because
     * Art Institute and some other sources can block browsers.
     */
    if (
      !image.dataset.triedThumbnail &&
      fallbackImageUrl &&
      image.src !== fallbackImageUrl
    ) {
      image.dataset.triedThumbnail = 'true';
      image.src = fallbackImageUrl;
      return;
    }

    /*
     * Final fallback:
     * Local SVG. No more external requests.
     */
    image.onerror = null;
    image.src = '/artwork-fallback.svg';
  };

  /*
   * Preserve gallery/search/filter state when opening details.
   */
  const sourceLocation = {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash
  };

  const downloadName =
    `${(painting.title || 'artwork')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'artwork'}.jpg`;

  const handleDownload = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!rawImageUrl) return;

    const link = document.createElement('a');

    link.href =
      `${API_BASE}/api/paintings/download` +
      `?url=${encodeURIComponent(rawImageUrl)}` +
      `&name=${encodeURIComponent(painting.title || 'artwork')}`;

    link.download = downloadName;

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!paintingId) return;

    isTogglingRef.current = true;

    // Optimistic update
    setLocalIsFav((current) => !current);

    try {
      const res = await toggleFavorite(paintingId);

      if (res?.requireAuth) {
        alert('Please sign in to save your favorite artworks.');
        setLocalIsFav(isFav);
      } else if (res && !res.success) {
        setLocalIsFav(isFav);
      }
    } catch (error) {
      console.error('Favorite error:', error);
      setLocalIsFav(isFav);
    }

    setTimeout(() => {
      isTogglingRef.current = false;
    }, 100);
  };

  return (
    <article
      className="painting-card"
      id={`painting-${paintingId}`}
      tabIndex="-1"
    >
      <Link
        to={`/painting/${paintingId}`}
        state={{ from: sourceLocation }}
        className="painting-card-link"
        style={{
          textDecoration: 'none',
          color: 'inherit',
          display: 'flex',
          flexDirection: 'column',
          flex: 1
        }}
      >
        <div className="painting-card-image-wrapper">
          <img
            src={primaryImageUrl || '/artwork-fallback.svg'}
            alt={painting.title || 'Artwork'}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={handleImageError}
          />

          <button
            type="button"
            className={`painting-fav-btn ${localIsFav ? 'active' : ''}`}
            onClick={handleFavoriteClick}
            aria-label={
              localIsFav
                ? `Remove ${painting.title || 'artwork'} from favorites`
                : `Add ${painting.title || 'artwork'} to favorites`
            }
            title={
              localIsFav
                ? 'Remove from favorites'
                : 'Add to favorites'
            }
          >
            {localIsFav ? (
              <FaHeart color="#ff477e" />
            ) : (
              <FaRegHeart />
            )}
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
            {painting.category && (
              <span className="tag category-tag">
                {painting.category}
              </span>
            )}

            {painting.colorMedium && (
              <span className="tag medium-tag">
                {painting.colorMedium}
              </span>
            )}
          </div>

          <h3 className="painting-card-title">
            {painting.title}
          </h3>

          {painting.artist && (
            <p className="painting-card-artist">
              {painting.artist}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}

