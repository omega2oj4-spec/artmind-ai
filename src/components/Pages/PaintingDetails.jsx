import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaHeart,
  FaRegHeart,
  FaFilePdf,
  FaFileWord,
  FaMagic,
  FaArrowLeft,
  FaAward,
  FaEye,
  FaExternalLinkAlt
} from 'react-icons/fa';
import PaintingCard from '../PaintingCard.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import API_BASE, { proxyImageUrl } from '../../utils/api.js';
import { getArtworkImageUrl } from '../../utils/artworkImages.js';
import {
  getHomeArtworkById,
  getSimilarHomeArtworks
} from '../../data/homeArtworks.js';
import './PaintingDetails.css';

function paintingKeys(painting) {
  return [painting?._id, painting?.id, painting?.catalogId]
    .filter(Boolean)
    .map((value) => String(value));
}

function mergeSimilarPaintings(groups, currentIds, limit = 6) {
  const seen = new Set(currentIds.map(String));
  const merged = [];

  for (const painting of groups.flat().filter(Boolean)) {
    const keys = paintingKeys(painting);
    if (!keys.length || keys.some((key) => seen.has(key))) continue;
    keys.forEach((key) => seen.add(key));
    merged.push(painting);
    if (merged.length >= limit) break;
  }

  return merged;
}

export default function PaintingDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { favorites, toggleFavorite } = useContext(AuthContext);

  const [painting, setPainting] = useState(null);
  const [similarPaintings, setSimilarPaintings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [localIsFav, setLocalIsFav] = useState(false);
  const isTogglingRef = useRef(false);

  const currentIds = [id, ...(painting ? paintingKeys(painting) : [])];
  const isFav = favorites?.some((favoriteId) =>
    currentIds.some((key) => String(favoriteId) === String(key))
  );

  const fallbackDestination = location.state?.from
    ? `${location.state.from.pathname || '/gallery'}${location.state.from.search || ''}${location.state.from.hash || ''}`
    : '/gallery';

  const handleBack = () => {
    // Cards provide `from` in location state. Going back one history entry
    // restores the exact source route, including its gallery/search URL state.
    // The fallback also supports a directly opened or refreshed detail page.
    if (location.state?.from) {
      navigate(-1);
      return;
    }

    navigate(fallbackDestination, { replace: true });
  };

  useEffect(() => {
    // Only sync if we're not in the middle of a toggle operation
    if (!isTogglingRef.current) {
      setLocalIsFav(isFav);
    }
  }, [isFav]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchPaintingDetails();
    recordView();
    setSummary('');
  }, [id]);

  const fetchPaintingDetails = async () => {
    setLoading(true);

    const localPainting = getHomeArtworkById(id);
    if (localPainting) {
      setPainting(localPainting);
      setSimilarPaintings(getSimilarHomeArtworks(localPainting));
    }

    try {
      const res = await fetch(`${API_BASE}/api/paintings/${id}`);

      if (!res.ok) {
        if (!localPainting) {
          throw new Error('Artwork not found');
        }
        return;
      }

      const data = await res.json();
      const apiPainting = data.painting;
      const mergedPainting = {
        ...(localPainting || {}),
        ...apiPainting,
        artistDetails: apiPainting.artistDetails || localPainting?.artistDetails,
        description: apiPainting.description || localPainting?.description,
        colorMedium: apiPainting.colorMedium || localPainting?.colorMedium,
        surface: apiPainting.surface || localPainting?.surface
      };

      setPainting(mergedPainting);
      setSimilarPaintings(
        mergeSimilarPaintings(
          [data.similarPaintings || [], localPainting ? getSimilarHomeArtworks(localPainting) : []],
          [id, ...paintingKeys(mergedPainting)]
        )
      );

      if (apiPainting.aiSummary) {
        setSummary(apiPainting.aiSummary);
      } else {
        generateSummary(id);
      }
    } catch (err) {
      console.error('Error loading painting details:', err);
      if (localPainting) {
        generateSummary(id);
      }
    } finally {
      setLoading(false);
    }
  };

  const recordView = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/paintings/${id}/view`, {
        method: 'POST',
        credentials: 'include'
      });

      if (res.ok) {
        window.dispatchEvent(new CustomEvent('artmind:activity-updated'));
      }
    } catch (err) {
      console.error('Could not record artwork view:', err);
    }
  };

  const generateSummary = async (paintingId = id) => {
    setSummaryLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/paintings/${paintingId}/summary`, {
        method: 'POST'
      });

      if (!res.ok) {
        throw new Error('Summary generation failed');
      }

      const data = await res.json();
      setSummary(data.summary);
    } catch (err) {
      console.error('Error generating summary:', err);
      const fallbackPainting = getHomeArtworkById(paintingId) || painting;
      setSummary(
        fallbackPainting
          ? `${fallbackPainting.title} by ${fallbackPainting.artist} is a ${String(fallbackPainting.style || 'contemporary').toLowerCase()} ${String(fallbackPainting.category || 'art').toLowerCase()} work in ${String(fallbackPainting.colorMedium || 'mixed media').toLowerCase()} on ${String(fallbackPainting.surface || 'canvas').toLowerCase()}. ${fallbackPainting.description || ''}`.trim()
          : 'This artwork displays distinctive artistic qualities, thoughtful composition, and a compelling visual character.'
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    // Mark that we're toggling to prevent useEffect from overriding
    isTogglingRef.current = true;

    // Optimistic UI update - immediately change heart color
    setLocalIsFav(!localIsFav);

    const res = await toggleFavorite(id);

    if (res?.requireAuth) {
      alert('Please sign in to save your favorite artworks.');
      setLocalIsFav(isFav); // Revert if authentication required
      isTogglingRef.current = false;
      return;
    }

    if (res && !res.success) {
      setLocalIsFav(isFav); // Revert if API call failed
    }

    // Allow useEffect to sync again after a short delay
    setTimeout(() => {
      isTogglingRef.current = false;
    }, 100);

    window.dispatchEvent(new CustomEvent('artmind:activity-updated'));
  };

  if (loading && !painting) {
    return (
      <div className="details-loading-container">
        <div className="details-skeleton-image"></div>
        <div className="details-skeleton-content">
          <div className="skeleton-line title"></div>
          <div className="skeleton-line subtitle"></div>
          <div className="skeleton-line text"></div>
        </div>
      </div>
    );
  }

  if (!painting) {
    return (
      <div className="details-error-container">
        <h2>Artwork Not Found</h2>
        <p>The requested artwork record could not be found in our catalog.</p>
        <Link to={fallbackDestination} className="back-link">
          <FaArrowLeft />
          Return to Gallery
        </Link>
      </div>
    );
  }

  return (
    <main className="painting-details-container">
      <div className="details-navigation">
        <button type="button" className="back-link details-back-button" onClick={handleBack}>
          <FaArrowLeft />
          Back
        </button>
      </div>

      <div className="painting-details-grid">
        <div className="details-image-section">
          <div className="details-image-wrapper">
            <img
              src={proxyImageUrl(getArtworkImageUrl(painting))}
              alt={painting.title}
              referrerPolicy="no-referrer"
              onError={(event) => {
                const image = event.currentTarget;
                const thumbnailUrl = painting.thumbnailUrl || painting.thumbnail;
                const fallbackImageUrl = thumbnailUrl ? proxyImageUrl(thumbnailUrl) : '';
                const rawUrl = getArtworkImageUrl(painting);

                if (
                  !image.dataset.triedThumbnail &&
                  fallbackImageUrl &&
                  image.src !== fallbackImageUrl
                ) {
                  console.warn(
                    `[PaintingDetails] Primary image load failed for "${painting.title || 'Untitled'}": ${image.src}, trying thumbnail`
                  );
                  image.dataset.triedThumbnail = 'true';
                  image.src = fallbackImageUrl;
                  return;
                }

                if (
                  !image.dataset.triedDirect &&
                  rawUrl &&
                  image.src !== rawUrl
                ) {
                  console.warn(
                    `[PaintingDetails] Thumbnail fallback load failed for "${painting.title || 'Untitled'}": ${image.src}, trying direct URL`
                  );
                  image.dataset.triedDirect = 'true';
                  image.src = rawUrl;
                  return;
                }

                console.warn(
                  `[PaintingDetails] All image attempts failed for "${painting.title || 'Untitled'}": ${image.src}, using local fallback`
                );
                image.onerror = null;
                image.src = '/artwork-fallback.svg';
              }}
            />
            <button
              type="button"
              className={`painting-fav-btn ${localIsFav ? 'active' : ''}`}
              onClick={handleFavoriteToggle}
              aria-label={localIsFav ? 'Remove from favorites' : 'Add to favorites'}
              title={localIsFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              {localIsFav ? <FaHeart color="#ff477e" /> : <FaRegHeart />}
            </button>
          </div>

          <div className="artwork-view-info">
            <FaEye />
            <span>{painting.viewsCount || 0} views</span>
          </div>

          <div className="ai-summary-block">
            <div className="summary-block-header">
              <h3>
                <FaMagic color="#d4af37" />
                AI-Generated Artwork Summary
              </h3>
              {!summary && (
                <button
                  type="button"
                  className="generate-summary-btn"
                  onClick={() => generateSummary(id)}
                  disabled={summaryLoading}
                >
                  {summaryLoading ? 'Curating Insight...' : 'Generate Curator Summary'}
                </button>
              )}
            </div>
            {summary ? (
              <p className="summary-text">{summary}</p>
            ) : (
              <p className="summary-placeholder">
                {summaryLoading
                  ? 'Generating an exclusive curator analysis for this work...'
                  : 'Click above to generate an AI curator summary for this artwork.'}
              </p>
            )}
          </div>
        </div>

        <div className="details-info-section">
          <div className="details-header">
            <div className="details-tags">
              {painting.category && (
                <span className="tag category-tag">{painting.category}</span>
              )}
              {painting.style && (
                <span className="tag style-tag">{painting.style}</span>
              )}
              {painting.colorMedium && (
                <span className="tag medium-tag">{painting.colorMedium}</span>
              )}
            </div>

            <h1 className="details-title">{painting.title}</h1>
            <p className="details-artist">
              By <strong>{painting.artist}</strong> ({painting.dateDisplay || 'Undated'})
            </p>
          </div>

          {painting.artistDetails && (
            <div className="details-artist-bio">
              <h3>Artist Details</h3>
              <p>{painting.artistDetails}</p>
            </div>
          )}

          <div className="details-meta-cards">
            <div className="meta-card">
              <span className="meta-label">Surface Type</span>
              <span className="meta-value">{painting.surface || 'Canvas'}</span>
            </div>
            <div className="meta-card">
              <span className="meta-label">Color Medium</span>
              <span className="meta-value">{painting.colorMedium || painting.medium || 'Mixed media'}</span>
            </div>
            <div className="meta-card">
              <span className="meta-label">Medium</span>
              <span className="meta-value">{painting.medium || `${painting.colorMedium || 'Mixed media'} on ${painting.surface || 'Canvas'}`}</span>
            </div>
            {painting.dimensions && (
              <div className="meta-card">
                <span className="meta-label">Dimensions</span>
                <span className="meta-value">{painting.dimensions}</span>
              </div>
            )}
            {painting.placeOfOrigin && (
              <div className="meta-card">
                <span className="meta-label">Place of Origin</span>
                <span className="meta-value">{painting.placeOfOrigin}</span>
              </div>
            )}
            {painting.department && (
              <div className="meta-card">
                <span className="meta-label">Collection</span>
                <span className="meta-value">{painting.department}</span>
              </div>
            )}
            <div className="meta-card">
              <span className="meta-label">Popularity</span>
              <span className="meta-value">
                <FaAward color="#d4af37" />
                {painting.popularity || 0} Pts
              </span>
            </div>
          </div>

          {painting.description && (
            <div className="details-description">
              <h3>Painting Description</h3>
              <p>{painting.description}</p>
            </div>
          )}

          <div className="details-action-bar">
            <button
              type="button"
              className={`fav-action-btn ${localIsFav ? 'active' : ''}`}
              onClick={handleFavoriteToggle}
            >
              {localIsFav ? <FaHeart color="#ff477e" /> : <FaRegHeart />}
              {localIsFav ? 'In Your Favorites' : 'Save Favorite'}
            </button>

            <a
              href={`${API_BASE}/api/paintings/${id}/export/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="export-btn pdf-btn"
            >
              <FaFilePdf />
              Download PDF
            </a>

            <a
              href={`${API_BASE}/api/paintings/${id}/export/docx`}
              target="_blank"
              rel="noopener noreferrer"
              className="export-btn docx-btn"
            >
              <FaFileWord />
              Download Word
            </a>

            {painting.sourceUrl && (
              <a
                href={painting.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="export-btn source-btn"
              >
                <FaExternalLinkAlt />
                View Original Source
              </a>
            )}
          </div>
        </div>
      </div>

      {similarPaintings.length > 0 && (
        <section className="similar-paintings-section">
          <h2 className="section-title">Similar Artwork Recommendations</h2>
          <p className="section-subtitle">
            Related works selected using category, style, colour medium, surface, and visual characteristics.
          </p>
          <div className="similar-grid">
            {similarPaintings.map((sim) => (
              <PaintingCard
                key={sim._id || sim.id || sim.catalogId}
                painting={sim}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
