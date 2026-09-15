import React, { useState } from 'react';
import { FaSearch, FaMagic, FaPalette } from 'react-icons/fa';
import PaintingCard from '../PaintingCard.jsx';
import API_BASE from '../../utils/api.js';
import { getHomeGalleryArtworks } from '../../data/homeArtworks.js';
import './Search.css';

export default function Search({ embedded = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const sampleQueries = [
    "Oil paintings with peaceful nature themes",
    "Post-Impressionism landscapes with blue skies",
    "Surrealism with warm dream colors",
    "Famous baroque portraits of women",
    "Watercolor floral studies in yellow tones"
  ];

  const executeSearch = async (searchQuery) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const token = localStorage.getItem('artmind_token');
      const res = await fetch(`${API_BASE}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ query: q })
      });

      if (!res.ok) throw new Error('Search failed');

      const data = await res.json();
      const apiResults = data.results || [];
      const homeResults = getHomeGalleryArtworks({ search: q });
      const seen = new Set(
        apiResults.map((painting) => `${painting.title}|${painting.artist}`.toLowerCase())
      );
      const merged = [
        ...homeResults.filter((painting) => {
          const key = `${painting.title}|${painting.artist}`.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }),
        ...apiResults
      ];
      setResults(merged);
      window.dispatchEvent(new Event('artmind:activity-updated'));
    } catch (err) {
      console.error('Search error:', err);
      setResults(getHomeGalleryArtworks({ search: q }));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeSearch();
  };

  const matchingSuggestions = sampleQueries.filter((sampleQuery) =>
    sampleQuery.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <main id={embedded ? 'dashboard-search' : undefined} className={`search-page-container ${embedded ? 'search-page-embedded' : ''}`}>
      <div className="search-page-header">
        <h1 className="search-page-title"><FaMagic color="#d4af37" /> Intelligent Art Search</h1>
        <p className="search-page-subtitle">
          Inquire in natural language. Gemini AI interprets intent, style, medium, and color palette to find matching artworks.
        </p>
      </div>

      <div className="search-page-input-wrapper">
        <form className="search-page-form" onSubmit={handleSubmit}>
          <div className="search-page-field">
            <FaSearch className="field-icon" />
            <input
              type="text"
              placeholder="e.g. 'Show me warm oil paintings with flower themes'..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
              aria-expanded={showSuggestions}
              aria-controls="art-search-suggestions"
            />
          </div>
          <button type="submit" className="search-page-btn" disabled={loading || !query.trim()}>
            {loading ? 'Analyzing...' : 'Search'}
          </button>
        </form>

        {showSuggestions && matchingSuggestions.length > 0 && (
          <div className="search-suggestions-dropdown" id="art-search-suggestions">
            <p>Try searching for:</p>
            {matchingSuggestions.map((sq) => (
              <button
                type="button"
                key={sq}
                onMouseDown={() => {
                  setQuery(sq);
                  setShowSuggestions(false);
                  executeSearch(sq);
                }}
              >
                {sq}
              </button>
            ))}
          </div>
        )}
      </div>

      {hasSearched && (
        <div className="search-results-section">
          <div className="results-count">
            <p>Found <strong>{results.length}</strong> matching artwork records</p>
          </div>

          {loading ? (
            <div className="gallery-loading-skeleton">
              <div className="skeleton-card"></div>
              <div className="skeleton-card"></div>
              <div className="skeleton-card"></div>
            </div>
          ) : results.length > 0 ? (
            <div className="gallery-grid">
              {results.map((painting) => (
                <PaintingCard key={painting._id || painting.id} painting={painting} />
              ))}
            </div>
          ) : (
            <div className="empty-search-state">
              <FaPalette className="empty-icon" />
              <p>No artworks matched your query. Try searching with alternative art terms or keywords!</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
