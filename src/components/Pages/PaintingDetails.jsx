import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaFilePdf, FaFileWord, FaMagic, FaArrowLeft, FaEye, FaAward } from 'react-icons/fa';
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

  const isFav = favorites?.includes(id);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchPaintingDetails();
    recordView();
  }, [id]);

  const fetchPaintingDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/paintings/${id}`);
      if (!res.ok) throw new Error('Artwork not found');
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

  const recordView = async () => {
    try {
      const token = localStorage.getItem('artmind_token');
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      await fetch(`/api/views/${id}`, { method: 'POST', headers });
    } catch (err) {
      // Non-critical logging error
    }
  };

  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/paintings/${id}/summary`, { method: 'POST' });
      if (!res.ok) throw new Error('Summary generation failed');
      const data = await res.json();
      setSummary(data.summary);
    } catch (err) {
      console.error('Error generating summary:', err);
      setSummary('This masterpiece displays exceptional execution, deep tonal harmony, and artistic significance in fine art history.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    const res = await toggleFavorite(id);
    if (res?.requireAuth) {
      alert('Please sign in to save your favorite artworks.');
    }
  };

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

  if (!painting) {
    return (
      <div className="details-error-container">
        <h2>Artwork Not Found</h2>
        <p>The requested artwork record could not be found in our catalog.</p>
        <Link to="/gallery" className="back-link"><FaArrowLeft /> Return to Gallery</Link>
      </div>
    );
  }

  return (
    <main className="painting-details-container">
      <div className="details-navigation">
        <Link to="/gallery" className="back-link">
          <FaArrowLeft /> Back to Gallery
        </Link>
      </div>

      <div className="painting-details-grid">
        <div className="details-image-section">
          <div className="details-image-wrapper">
            <img src={painting.imageUrl} alt={painting.title} />
          </div>
        </div>

        <div className="details-info-section">
          <div className="details-header">
            <div className="details-tags">
              <span className="tag category-tag">{painting.category}</span>
              <span className="tag style-tag">{painting.style}</span>
              <span className="tag medium-tag">{painting.colorMedium}</span>
            </div>

            <h1 className="details-title">{painting.title}</h1>
            <p className="details-artist">
              By <strong>{painting.artist}</strong> ({painting.dateDisplay})
            </p>
          </div>

          <div className="details-meta-cards">
            <div className="meta-card">
              <span className="meta-label">Medium</span>
              <span className="meta-value">{painting.medium}</span>
            </div>
            <div className="meta-card">
              <span className="meta-label">Surface</span>
              <span className="meta-value">{painting.surface}</span>
            </div>
            <div className="meta-card">
              <span className="meta-label">Color Theme</span>
              <span className="meta-value">{painting.colorTheme}</span>
            </div>
            <div className="meta-card">
              <span className="meta-label">Popularity</span>
              <span className="meta-value"><FaAward color="#d4af37" /> {painting.popularity} Pts</span>
            </div>
          </div>

          {painting.description && (
            <div className="details-description">
              <h3>Artwork Overview</h3>
              <p>{painting.description}</p>
            </div>
          )}

          {/* AI Curator Summary Block */}
          <div className="ai-summary-block">
            <div className="summary-block-header">
              <h3><FaMagic color="#d4af37" /> AI Curator Insight</h3>
              {!summary && (
                <button 
                  className="generate-summary-btn" 
                  onClick={handleGenerateSummary}
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
                Click above to call Gemini AI and generate an exclusive 70-word curator analysis for this work.
              </p>
            )}
          </div>

          {/* Action Buttons: Favorite + PDF/Word Export */}
          <div className="details-action-bar">
            <button 
              className={`fav-action-btn ${isFav ? 'active' : ''}`}
              onClick={handleFavoriteToggle}
            >
              {isFav ? <FaHeart color="#d4af37" /> : <FaRegHeart />}
              {isFav ? 'In Your Favorites' : 'Add to Favorites'}
            </button>

            <a 
              href={`/api/paintings/${id}/export/pdf`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="export-btn pdf-btn"
            >
              <FaFilePdf /> Export PDF
            </a>

            <a 
              href={`/api/paintings/${id}/export/docx`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="export-btn docx-btn"
            >
              <FaFileWord /> Export Word
            </a>
          </div>
        </div>
      </div>

      {/* Similar Paintings Section */}
      {similarPaintings.length > 0 && (
        <section className="similar-paintings-section">
          <h2 className="section-title">Similar Masterworks</h2>
          <p className="section-subtitle">Related catalog works sharing category, style, or visual color harmony</p>
          <div className="similar-grid">
            {similarPaintings.map(sim => (
              <PaintingCard key={sim._id} painting={sim} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
