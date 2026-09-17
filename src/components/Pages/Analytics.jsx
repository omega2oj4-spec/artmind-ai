import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaChartLine, FaEye, FaAward, FaLayerGroup, FaMagic, FaUserCheck, FaSyncAlt, FaArrowRight } from 'react-icons/fa';
import PaintingCard from '../PaintingCard.jsx';
import { getHomeGalleryArtworks } from '../../data/homeArtworks.js';
import API_BASE from '../../utils/api.js';
import './Analytics.css';

function buildLocalAnalytics() {
  const paintings = getHomeGalleryArtworks();
  const categories = new Map();

  paintings.forEach((painting) => {
    const category = painting.category || 'Other';
    const current = categories.get(category) || { _id: category, totalViews: 0, count: 0, popularityTotal: 0 };
    current.count += 1;
    current.popularityTotal += Number(painting.popularity || 0);
    categories.set(category, current);
  });

  const categoryStats = [...categories.values()]
    .map(({ popularityTotal, ...category }) => ({
      ...category,
      avgPopularity: category.count ? popularityTotal / category.count : 0
    }))
    .sort((a, b) => b.count - a.count);

  return {
    topPaintings: [...paintings].sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 8),
    categoryStats,
    totalViews: 0,
    totalArtworks: paintings.length,
    userStats: null,
    usingBuiltInData: true,
    localFallback: true
  };
}

export default function Analytics({ embedded = false }) {
  const [analytics, setAnalytics] = useState({
    topPaintings: [],
    categoryStats: [],
    totalViews: 0,
    totalArtworks: 0,
    userStats: null
  });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [error, setError] = useState('');
  const [hoveredStat, setHoveredStat] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      setError('');
      const res = await fetch(`${API_BASE}/api/analytics/trending`, { credentials: 'include' });
      if (!res.ok) throw new Error('Analytics load failed');
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      // Keep the page useful when the optional API service is not running.
      setAnalytics(buildLocalAnalytics());
      setError('');
    } finally {
      setLoading(false);
    }
  };

  const visiblePaintings = selectedCategory === 'All'
    ? analytics.topPaintings
    : analytics.topPaintings.filter(painting => painting.category === selectedCategory);

  const handleStatClick = (statType) => {
    // Handle different stat types with appropriate navigation
    switch(statType) {
      case 'views':
        // Could navigate to recently viewed or popular artworks
        break;
      case 'category':
        // Filter by top category
        if (analytics.userStats?.topCategory) {
          setSelectedCategory(analytics.userStats.topCategory);
        }
        break;
      case 'style':
        // Could filter by style or show style-based recommendations
        break;
      case 'searches':
        // Navigate to search page
        break;
      default:
        break;
    }
  };

  const getStatAction = (statType) => {
    switch(statType) {
      case 'views':
        return 'View your history';
      case 'category':
        return 'Explore top category';
      case 'style':
        return 'Discover similar art';
      case 'searches':
        return 'Start new search';
      default:
        return 'Learn more';
    }
  };

  return (
    <main id="analytics" className={`analytics-container ${embedded ? 'analytics-embedded' : ''}`}>
      <div className="analytics-header">
        <h1 className="analytics-title"><FaChartLine color="#d4af37" /> Catalog Analytics & Trending Insights</h1>
        <p className="analytics-subtitle">
          Real-time metrics tracking gallery engagement, view counts, popular artwork categories, and trending masterworks.
        </p>
        <button className="analytics-refresh-btn" type="button" onClick={fetchAnalytics} disabled={loading}>
          <FaSyncAlt className={loading ? 'analytics-refreshing' : ''} /> Refresh insights
        </button>
      </div>

      {loading ? (
        <div className="gallery-loading-skeleton" style={{ marginTop: '32px' }}>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
      ) : (
        <>
          {/* Personalized User Insights Section (when authenticated) */}
          {analytics.userStats && (
            <section className="analytics-section personalized-analytics-box">
              <h2 className="section-title analytics-personalized-title">
                <FaUserCheck color="#d4af37" /> Personalized Behavior & AI Insights for {analytics.userStats.userName}
              </h2>
              <div className="analytics-stats-banner">
                <div 
                  className={`stat-box ${hoveredStat === 'views' ? 'stat-box-hovered' : ''}`}
                  onClick={() => handleStatClick('views')}
                  onMouseEnter={() => setHoveredStat('views')}
                  onMouseLeave={() => setHoveredStat(null)}
                >
                  <FaEye className="stat-icon" />
                  <div className="stat-data">
                    <span className="stat-number">{analytics.userStats.totalUserViews}</span>
                    <span className="stat-label">Artworks Viewed</span>
                  </div>
                  <div className="stat-action">
                    <span>{getStatAction('views')}</span>
                    <FaArrowRight className="stat-action-icon" />
                  </div>
                </div>
                <div 
                  className={`stat-box ${hoveredStat === 'category' ? 'stat-box-hovered' : ''}`}
                  onClick={() => handleStatClick('category')}
                  onMouseEnter={() => setHoveredStat('category')}
                  onMouseLeave={() => setHoveredStat(null)}
                >
                  <FaLayerGroup className="stat-icon" />
                  <div className="stat-data">
                    <span className="stat-number">{analytics.userStats.topCategory}</span>
                    <span className="stat-label">Top Affinity Category</span>
                  </div>
                  <div className="stat-action">
                    <span>{getStatAction('category')}</span>
                    <FaArrowRight className="stat-action-icon" />
                  </div>
                </div>
                <div 
                  className={`stat-box ${hoveredStat === 'style' ? 'stat-box-hovered' : ''}`}
                  onClick={() => handleStatClick('style')}
                  onMouseEnter={() => setHoveredStat('style')}
                  onMouseLeave={() => setHoveredStat(null)}
                >
                  <FaAward className="stat-icon" />
                  <div className="stat-data">
                    <span className="stat-number">{analytics.userStats.topStyle}</span>
                    <span className="stat-label">Favorite Art Style</span>
                  </div>
                  <div className="stat-action">
                    <span>{getStatAction('style')}</span>
                    <FaArrowRight className="stat-action-icon" />
                  </div>
                </div>
                <div 
                  className={`stat-box ${hoveredStat === 'searches' ? 'stat-box-hovered' : ''}`}
                  onClick={() => handleStatClick('searches')}
                  onMouseEnter={() => setHoveredStat('searches')}
                  onMouseLeave={() => setHoveredStat(null)}
                >
                  <FaMagic className="stat-icon" />
                  <div className="stat-data">
                    <span className="stat-number">{analytics.userStats.searchesCount}</span>
                    <span className="stat-label">Art Searches</span>
                  </div>
                  <div className="stat-action">
                    <span>{getStatAction('searches')}</span>
                    <FaArrowRight className="stat-action-icon" />
                  </div>
                </div>
              </div>
              <p className="personalized-insight">
                <FaMagic color="#d4af37" /> {analytics.userStats.personalizedInsight}
              </p>
            </section>
          )}

          {error && <p className="analytics-error" role="alert">{error}</p>}
          {analytics.usingBuiltInData && (
            <p className="analytics-data-note">
              {analytics.localFallback
                ? 'Showing catalog insights while the analytics service is offline. Start the API server to see live account usage.'
                : 'Showing insights from the gallery collection. Views update as visitors explore artworks.'}
            </p>
          )}

          {/* Category Engagement Table / Breakdown */}
          {analytics.categoryStats && analytics.categoryStats.length > 0 && (
            <section className="analytics-section">
              <h2 className="section-title">Category Engagement Breakdown</h2>
              <div className="category-table-wrapper">
                <table className="category-stats-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Artworks Count</th>
                      <th>Total Views</th>
                      <th>Avg Popularity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.categoryStats.map((stat, idx) => (
                      <tr key={idx} className={selectedCategory === stat._id ? 'selected-category-row' : ''}>
                        <td className="cat-name"><button type="button" onClick={() => setSelectedCategory(stat._id)}>{stat._id}</button></td>
                        <td>{stat.count} Works</td>
                        <td>{stat.totalViews} Views</td>
                        <td>{Math.round(stat.avgPopularity || 0)} Pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Trending Paintings Section */}
          <section className="analytics-section">
            <div className="analytics-trending-header">
              <h2 className="section-title">{selectedCategory === 'All' ? 'Trending Artworks' : `Trending ${selectedCategory} Artworks`}</h2>
              {selectedCategory !== 'All' && <button type="button" className="analytics-clear-filter" onClick={() => setSelectedCategory('All')}>Show all</button>}
            </div>
            <div className="gallery-grid">
              {visiblePaintings.map(painting => (
                <PaintingCard key={painting._id} painting={painting} />
              ))}
            </div>
            {visiblePaintings.length === 0 && <p className="analytics-empty-state">No current top results in this category. Choose another category or show all trends.</p>}
          </section>
        </>
      )}
    </main>
  );
}
