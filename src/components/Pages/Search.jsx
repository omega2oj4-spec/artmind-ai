import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaSearch, FaMagic, FaPalette } from 'react-icons/fa';
import PaintingCard from '../PaintingCard.jsx';
import API_BASE from '../../utils/api.js';
import './Search.css';

export default function Search({ embedded = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const lastUrlSearchRef = useRef('');

  const sampleQueries = [
    "Oil paintings with peaceful nature themes",
    "Post-Impressionism landscapes with blue skies",
    "Surrealism with warm dream colors",
    "Famous baroque portraits of women",
    "Watercolor floral studies in yellow tones"
  ];

  const executeSearch = async (searchQuery, updateUrl = true) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    const trimmedQuery = q.trim();
    if (!embedded && updateUrl) {
      lastUrlSearchRef.current = trimmedQuery;
      setSearchParams({ q: trimmedQuery });
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch(`${API_BASE}/api/search`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: trimmedQuery })
      });

      if (!res.ok) throw new Error('Search failed');

      const data = await res.json();
      setResults(data.results || []);
      window.dispatchEvent(new Event('artmind:activity-updated'));
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // A search URL is a durable source state: returning from Painting Details,
  // refreshing, or sharing the URL restores the user's previous query.
  useEffect(() => {
    if (embedded) return;

    const urlQuery = searchParams.get('q')?.trim() || '';
    if (!urlQuery || urlQuery === lastUrlSearchRef.current) return;

    lastUrlSearchRef.current = urlQuery;
    setQuery(urlQuery);
    executeSearch(urlQuery, false);
  }, [embedded, searchParams]);

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
