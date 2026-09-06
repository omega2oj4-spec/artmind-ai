import React, { useState, useEffect, useRef } from 'react';
import PaintingCard from '../PaintingCard.jsx';
import { FaFilter, FaLayerGroup, FaSearch, FaPalette } from 'react-icons/fa';
import { getHomeGalleryArtworks } from '../../data/homeArtworks.js';
import './Gallery.css';

const CATEGORIES = ['All', 'Abstract', 'Landscape', 'Flower', 'Nature', 'Figurative', 'Religious'];

export default function Gallery() {
  const [paintings, setPaintings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPaintingType, setSelectedPaintingType] = useState('All Types');
  const [selectedSurface, setSelectedSurface] = useState('All Surfaces');
  const [selectedColorMedium, setSelectedColorMedium] = useState('All Color Media');
  const [selectedStyle, setSelectedStyle] = useState('All Styles');
  const [selectedPopularity, setSelectedPopularity] = useState('Any Popularity');
  const [scrollToCategoryResults, setScrollToCategoryResults] = useState(false);
  const resultsRef = useRef(null);

  useEffect(() => {
    fetchPaintings();
  }, [activeCategory, selectedPaintingType, selectedSurface, selectedColorMedium, selectedStyle, selectedPopularity]);

  useEffect(() => {
    const paintingId = window.location.hash.slice(1);
    if (!paintingId || !document.getElementById(paintingId)) return;

    requestAnimationFrame(() => {
      document.getElementById(paintingId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [paintings]);

  useEffect(() => {
    if (!scrollToCategoryResults || loading) return;

    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setScrollToCategoryResults(false);
  }, [loading, paintings, scrollToCategoryResults]);

  const fetchPaintings = async () => {
    setLoading(true);
    try {
      const paintingType = selectedPaintingType === 'All Types' ? activeCategory : selectedPaintingType;
      const homePaintings = getHomeGalleryArtworks({
        category: paintingType,
        surface: selectedSurface,
        colorMedium: selectedColorMedium,
        style: selectedStyle,
        minPopularity: selectedPopularity,
        search: searchQuery
      });
      setPaintings(homePaintings);
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

  const handleCategorySelect = (category) => {
    setActiveCategory(category);
    setScrollToCategoryResults(true);
  };

  return (
    <main className="gallery-container" id="gallery">
      <div className="gallery-header">
        <h1 className="gallery-title">Smart Art Gallery</h1>
        <p className="gallery-subtitle">
          Browse a hand-picked collection of featured paintings, filtered by category, style, and medium.
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
                onClick={() => handleCategorySelect(cat)}
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
                <label><FaLayerGroup style={{ marginRight: '6px' }} /> Painting Type</label>
                <select value={selectedPaintingType} onChange={(e) => setSelectedPaintingType(e.target.value)}>
                  <option>All Types</option>
                  {CATEGORIES.slice(1).map((type) => <option key={type}>{type}</option>)}
                </select>
              </div>
              <div className="filter-item">
                <label>Surface Material</label>
                <select value={selectedSurface} onChange={(e) => setSelectedSurface(e.target.value)}>
                  <option>All Surfaces</option><option>Canvas</option><option>Paper</option><option>Wood Panel</option><option>Board</option>
                </select>
              </div>
              <div className="filter-item">
                <label>Color Medium</label>
                <select value={selectedColorMedium} onChange={(e) => setSelectedColorMedium(e.target.value)}>
                  <option>All Color Media</option><option>Oil</option><option>Watercolor</option><option>Pastel</option><option>Acrylic</option><option>Ink</option><option>Tempera</option>
                </select>
              </div>
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
              <div className="filter-item">
                <label>Popularity</label>
                <select value={selectedPopularity} onChange={(e) => setSelectedPopularity(e.target.value)}>
                  <option value="Any Popularity">Any Popularity</option><option value="60">Popular (60+)</option><option value="85">Most Popular (85+)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="gallery-results-info" ref={resultsRef}>
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
