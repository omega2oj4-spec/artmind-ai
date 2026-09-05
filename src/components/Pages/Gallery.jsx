import React, { useState, useEffect } from 'react';
import PaintingCard from '../PaintingCard.jsx';
import { FaFilter, FaLayerGroup, FaSearch, FaPalette } from 'react-icons/fa';
import './Gallery.css';

const CATEGORIES = ['All', 'Abstract', 'Landscape', 'Flower', 'Nature', 'Figurative', 'Religious'];

export default function Gallery() {
  const [paintings, setPaintings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('All Styles');

  useEffect(() => {
    fetchPaintings();
  }, [activeCategory, selectedStyle]);

  const fetchPaintings = async () => {
    setLoading(true);
    try {
      let url = '/api/paintings?';
      if (activeCategory !== 'All') url += `category=${encodeURIComponent(activeCategory)}&`;
      if (selectedStyle !== 'All Styles') url += `style=${encodeURIComponent(selectedStyle)}&`;
      if (searchQuery.trim()) url += `search=${encodeURIComponent(searchQuery.trim())}&`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load gallery paintings');
      const data = await res.json();
      setPaintings(data);
    } catch (err) {
      console.error('Error loading gallery:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    fetchPaintings();
  };

  return (
    <main className="gallery-container" id="gallery">
      <div className="gallery-header">
        <h1 className="gallery-title">Smart Art Gallery</h1>
        <p className="gallery-subtitle">
          Discover public domain fine art curated from the Art Institute of Chicago, filtered by categories, artistic styles, and medium types.
        </p>
      </div>

      <div className="gallery-search-section">
        <form className="search-container" onSubmit={handleSearchSubmit}>
          <div className="search-input-wrapper">
            <FaSearch className="search-icon" />
            <input 
              type="text" 
              className="nl-search-input" 
              placeholder="Search artworks by title, artist, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="nl-search-btn" aria-label="Search">
            Search
          </button>
        </form>

        <div className="gallery-controls">
          <div className="gallery-categories">
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat === 'All' && <FaLayerGroup style={{ marginRight: '6px' }} />}
                {cat}
              </button>
            ))}
          </div>

          <button 
            className={`toggle-filter-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter style={{ marginRight: '6px' }} />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="gallery-filters-container">
            <div className="gallery-filters">
              <div className="filter-item">
                <label><FaPalette style={{ marginRight: '6px' }} /> Artistic Style</label>
                <select value={selectedStyle} onChange={(e) => setSelectedStyle(e.target.value)}>
                  <option>All Styles</option>
                  <option>Impressionism</option>
                  <option>Post-Impressionism</option>
                  <option>Surrealism</option>
                  <option>Expressionism</option>
                  <option>Romanticism</option>
                  <option>Baroque</option>
                  <option>Renaissance</option>
                  <option>Realism</option>
                  <option>Modern Art</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="gallery-results-info">
        <p>Showing <strong>{paintings.length}</strong> masterworks in <strong>{activeCategory}</strong></p>
      </div>

      {loading ? (
        <div className="gallery-loading-skeleton">
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
      ) : paintings.length > 0 ? (
        <div className="gallery-grid">
          {paintings.map((painting) => (
            <PaintingCard key={painting._id || painting.id} painting={painting} />
          ))}
        </div>
      ) : (
        <div className="empty-search-state">
          <FaPalette className="empty-icon" />
          <p>No artworks match your selected filters. Try choosing a different category or clearing filters!</p>
        </div>
      )}
    </main>
  );
}
