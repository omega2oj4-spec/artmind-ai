import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FaHeart,
  FaRegHeart,
  FaFilePdf,
  FaFileWord,
  FaMagic,
  FaArrowLeft,
  FaAward,
  FaPalette,
  FaEye
} from 'react-icons/fa';
import PaintingCard from '../PaintingCard.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import './PaintingDetails.css';

export default function PaintingDetails() {
  const { id } = useParams();
  const { favorites, toggleFavorite } = useContext(AuthContext);

  const [painting, setPainting] = useState(null);
  const [similarPaintings, setSimilarPaintings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  // AI Vision analysis
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const isFav = favorites?.includes(id);

  useEffect(() => {
    window.scrollTo(0, 0);

    fetchPaintingDetails();
    recordView();

    // Reset AI analysis when user opens another painting
    setAnalysis(null);
    setSummary('');
  }, [id]);

  /**
   * Load painting details
   */
  const fetchPaintingDetails = async () => {
    setLoading(true);

    try {
      const res = await fetch(`/api/paintings/${id}`);

      if (!res.ok) {
        throw new Error('Artwork not found');
      }

      const data = await res.json();

      setPainting(data.painting);
      setSimilarPaintings(data.similarPaintings || []);

      if (data.painting.aiSummary) {
        setSummary(data.painting.aiSummary);
      }
    } catch (err) {
      console.error('Error loading painting details:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Record that the user viewed this artwork
   */
  const recordView = async () => {
    try {
      const token = localStorage.getItem('artmind_token');

      const headers = {};

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`/api/views/${id}`, {
        method: 'POST',
        headers
      });

      if (res.ok) {
        // Tell dashboard that user activity has changed
        window.dispatchEvent(
          new CustomEvent('artmind:activity-updated')
        );
      }
    } catch (err) {
      console.error('Could not record artwork view:', err);
    }
  };

  /**
   * AI Vision analysis of the EXACT painting being viewed
   */
  const handleAnalyzeArtwork = async () => {
    setAnalysisLoading(true);

    try {
      const res = await fetch(
        `/api/analyze/painting/${id}`,
        {
          method: 'POST'
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));

        throw new Error(
          errorData.error || 'Artwork analysis failed'
        );
      }

      const data = await res.json();

      console.log('[PaintingDetails] AI Analysis:', data);

      setAnalysis(data.analysis || null);

      // Replace similar paintings with AI-ranked results
      setSimilarPaintings(
        data.similarPaintings || []
      );
    } catch (err) {
      console.error(
        'Error analyzing artwork:',
        err
      );

      alert(
        'Unable to analyze this artwork right now. Please try again.'
      );
    } finally {
      setAnalysisLoading(false);
    }
  };

  /**
   * Generate AI curator summary
   */
  const handleGenerateSummary = async () => {
    setSummaryLoading(true);

    try {
      const res = await fetch(
        `/api/paintings/${id}/summary`,
        {
          method: 'POST'
        }
      );

      if (!res.ok) {
        throw new Error(
          'Summary generation failed'
        );
      }

      const data = await res.json();

      setSummary(data.summary);
    } catch (err) {
      console.error(
        'Error generating summary:',
        err
      );

      setSummary(
        'This artwork displays distinctive artistic qualities, thoughtful composition, and a compelling visual character.'
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  /**
   * Add/remove artwork from favorites
   */
  const handleFavoriteToggle = async () => {
    const res = await toggleFavorite(id);

    if (res?.requireAuth) {
      alert(
        'Please sign in to save your favorite artworks.'
      );
      return;
    }

    // Refresh dashboard activity
    window.dispatchEvent(
      new CustomEvent('artmind:activity-updated')
    );
  };

  /**
   * Loading state
   */
  if (loading) {
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

  /**
   * Artwork not found
   */
  if (!painting) {
    return (
      <div className="details-error-container">
        <h2>Artwork Not Found</h2>

        <p>
          The requested artwork record could not be
          found in our catalog.
        </p>

        <Link
          to="/gallery"
          className="back-link"
        >
          <FaArrowLeft />
          Return to Gallery
        </Link>
      </div>
    );
  }

  return (
    <main className="painting-details-container">

      {/* Navigation */}
      <div className="details-navigation">
        <Link
          to="/gallery"
          className="back-link"
        >
          <FaArrowLeft />
          Back to Gallery
        </Link>
      </div>

      {/* Main artwork information */}
      <div className="painting-details-grid">

        {/* Artwork image */}
        <div className="details-image-section">
          <div className="details-image-wrapper">
            <img
              src={painting.imageUrl}
              alt={painting.title}
              referrerPolicy="no-referrer"
            />
            <button
              type="button"
              className={`painting-fav-btn ${isFav ? 'active' : ''}`}
              onClick={handleFavoriteToggle}
              aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
              title={isFav ? "Remove from favorites" : "Add to favorites"}
            >
              {isFav ? <FaHeart color="#ff477e" /> : <FaRegHeart />}
            </button>
          </div>

          {/* View count */}
          <div className="artwork-view-info">
            <FaEye />
            <span>
              {painting.viewsCount || 0} views
            </span>
          </div>
        </div>

        {/* Artwork information */}
        <div className="details-info-section">

          <div className="details-header">

            <div className="details-tags">
              {painting.category && (
                <span className="tag category-tag">
                  {painting.category}
                </span>
              )}

              {painting.style && (
                <span className="tag style-tag">
                  {painting.style}
                </span>
              )}

              {painting.colorMedium && (
                <span className="tag medium-tag">
                  {painting.colorMedium}
                </span>
              )}
            </div>

            <h1 className="details-title">
              {painting.title}
            </h1>

            <p className="details-artist">
              By <strong>{painting.artist}</strong>{' '}
              ({painting.dateDisplay})
            </p>
          </div>

          {/* Metadata */}
          <div className="details-meta-cards">

            <div className="meta-card">
              <span className="meta-label">
                Medium
              </span>

              <span className="meta-value">
                {painting.medium}
              </span>
            </div>

            <div className="meta-card">
              <span className="meta-label">
                Surface
              </span>

              <span className="meta-value">
                {painting.surface}
              </span>
            </div>

            <div className="meta-card">
              <span className="meta-label">
                Color Theme
              </span>

              <span className="meta-value">
                {painting.colorTheme}
              </span>
            </div>

            <div className="meta-card">
              <span className="meta-label">
                Popularity
              </span>

              <span className="meta-value">
                <FaAward color="#d4af37" />
                {painting.popularity || 0} Pts
              </span>
            </div>
          </div>

          {/* Artwork description */}
          {painting.description && (
            <div className="details-description">
              <h3>Artwork Overview</h3>

              <p>
                {painting.description}
              </p>
            </div>
          )}

          {/* ========================================
              AI VISION ANALYSIS
          ======================================== */}
          <div className="ai-analysis-block">

            <div className="summary-block-header">

              <div>
                <h3>
                  <FaPalette color="#d4af37" />
                  AI Artwork Analysis
                </h3>

                <p>
                  Let ArtMind Vision examine the
                  actual artwork and identify its
                  visual characteristics.
                </p>
              </div>

              <button
                type="button"
                className="generate-summary-btn"
                onClick={handleAnalyzeArtwork}
                disabled={analysisLoading}
              >
                {analysisLoading
                  ? 'Analyzing Artwork...'
                  : 'Analyze Artwork'}
              </button>
            </div>

            {/* Analysis results */}
            {analysis && (
              <div className="ai-analysis-results">

                {/* Category */}
                {analysis.category && (
                  <div className="analysis-item">
                    <strong>
                      Category
                    </strong>

                    <span>
                      {analysis.category}
                    </span>
                  </div>
                )}

                {/* Style */}
                {analysis.style && (
                  <div className="analysis-item">
                    <strong>
                      Style
                    </strong>

                    <span>
                      {analysis.style}
                    </span>
                  </div>
                )}

                {/* Medium */}
                {analysis.mediumGuess && (
                  <div className="analysis-item">
                    <strong>
                      Medium
                    </strong>

                    <span>
                      {analysis.mediumGuess}
                    </span>
                  </div>
                )}

                {/* Dominant colors */}
                {Array.isArray(
                  analysis.dominantColors
                ) &&
                  analysis.dominantColors.length >
                    0 && (
                    <div className="analysis-item">
                      <strong>
                        Dominant Colors
                      </strong>

                      <span>
                        {analysis.dominantColors.join(
                          ', '
                        )}
                      </span>
                    </div>
                  )}

                {/* Visual characteristics */}
                {Array.isArray(
                  analysis.visualCharacteristics
                ) &&
                  analysis.visualCharacteristics
                    .length > 0 && (
                    <div className="analysis-item">
                      <strong>
                        Visual Characteristics
                      </strong>

                      <span>
                        {analysis.visualCharacteristics.join(
                          ', '
                        )}
                      </span>
                    </div>
                  )}

                {/* AI summary */}
                {analysis.summary && (
                  <div className="analysis-summary">
                    <strong>
                      AI Interpretation
                    </strong>

                    <p>
                      {analysis.summary}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Before analysis */}
            {!analysis && !analysisLoading && (
              <p className="summary-placeholder">
                Click "Analyze Artwork" to have
                ArtMind Vision examine this specific
                painting.
              </p>
            )}

            {/* While analyzing */}
            {analysisLoading && (
              <p className="summary-placeholder">
                ArtMind Vision is examining the
                artwork...
              </p>
            )}
          </div>

          {/* ========================================
              AI CURATOR SUMMARY
          ======================================== */}
          <div className="ai-summary-block">

            <div className="summary-block-header">

              <h3>
                <FaMagic color="#d4af37" />
                AI Curator Insight
              </h3>

              {!summary && (
                <button
                  type="button"
                  className="generate-summary-btn"
                  onClick={handleGenerateSummary}
                  disabled={summaryLoading}
                >
                  {summaryLoading
                    ? 'Curating Insight...'
                    : 'Generate Curator Summary'}
                </button>
              )}
            </div>

            {summary ? (
              <p className="summary-text">
                {summary}
              </p>
            ) : (
              <p className="summary-placeholder">
                Click above to call Gemini AI and
                generate an exclusive curator analysis
                for this work.
              </p>
            )}
          </div>

          {/* ========================================
              ACTION BUTTONS
          ======================================== */}
          <div className="details-action-bar">

            <button
              type="button"
              className={`fav-action-btn ${
                isFav ? 'active' : ''
              }`}
              onClick={handleFavoriteToggle}
            >
              {isFav ? (
                <FaHeart color="#ff477e" />
              ) : (
                <FaRegHeart />
              )}

              {isFav
                ? 'In Your Favorites'
                : 'Add to Favorites'}
            </button>

            <a
              href={`/api/paintings/${id}/export/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="export-btn pdf-btn"
            >
              <FaFilePdf />
              Export PDF
            </a>

            <a
              href={`/api/paintings/${id}/export/docx`}
              target="_blank"
              rel="noopener noreferrer"
              className="export-btn docx-btn"
            >
              <FaFileWord />
              Export Word
            </a>
          </div>
        </div>
      </div>

      {/* ========================================
          SIMILAR PAINTINGS
      ======================================== */}
      {similarPaintings.length > 0 && (
        <section className="similar-paintings-section">

          <h2 className="section-title">
            Similar Masterworks
          </h2>

          <p className="section-subtitle">
            Related works selected using category,
            style, medium, colors, and visual
            characteristics.
          </p>

          <div className="similar-grid">
            {similarPaintings.map(sim => (
              <PaintingCard
                key={sim._id}
                painting={sim}
              />
            ))}
          </div>
        </section>
      )}

    </main>
  );
}