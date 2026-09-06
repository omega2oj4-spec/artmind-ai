import React, { useState, useEffect } from 'react';
import { FaChartLine, FaEye, FaAward, FaLayerGroup, FaMagic, FaUserCheck, FaSyncAlt } from 'react-icons/fa';
import PaintingCard from '../PaintingCard.jsx';
import './Analytics.css';

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

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('artmind_token');
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      setError('');
      const res = await fetch('/api/analytics/trending', { headers });
      if (!res.ok) throw new Error('Analytics load failed');
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Analytics could not be refreshed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const visiblePaintings = selectedCategory === 'All'
    ? analytics.topPaintings
    : analytics.topPaintings.filter(painting => painting.category === selectedCategory);

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
            <section className="analytics-section personalized-analytics-box" style={{ background: 'rgba(212, 175, 55, 0.08)', padding: '24px', borderRadius: '12px', marginBottom: '36px', border: '1px solid rgba(212, 175, 55, 0.25)' }}>
              <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaUserCheck color="#d4af37" /> Personalized Behavior & AI Insights for {analytics.userStats.userName}
              </h2>
              <div className="analytics-stats-banner" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '16px' }}>
                <div className="stat-box">
                  <FaEye className="stat-icon" />
                  <div className="stat-data">
                    <span className="stat-number">{analytics.userStats.totalUserViews}</span>
                    <span className="stat-label">Artworks Viewed</span>
                  </div>
                </div>
                <div className="stat-box">
                  <FaLayerGroup className="stat-icon" />
                  <div className="stat-data">
                    <span className="stat-number">{analytics.userStats.topCategory}</span>
                    <span className="stat-label">Top Affinity Category</span>
                  </div>
                </div>
                <div className="stat-box">
                  <FaAward className="stat-icon" />
                  <div className="stat-data">
                    <span className="stat-number">{analytics.userStats.topStyle}</span>
                    <span className="stat-label">Favorite Art Style</span>
                  </div>
                </div>
              </div>
              <p style={{ fontStyle: 'italic', color: '#e0e0e0', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaMagic color="#d4af37" /> {analytics.userStats.personalizedInsight}
              </p>
            </section>
          )}

          {error && <p className="analytics-error" role="alert">{error}</p>}
          {analytics.usingBuiltInData && (
            <p className="analytics-data-note">Showing insights from the gallery collection. Views update as visitors explore artworks.</p>
          )}
          {/* High-level stats banner */}
          <div className="analytics-stats-banner">
            <div className="stat-box">
              <FaEye className="stat-icon" />
              <div className="stat-data">
                <span className="stat-number">{analytics.totalViews || 0}</span>
                <span className="stat-label">Total Artwork Views</span>
              </div>
            </div>

            <div className="stat-box">
              <FaLayerGroup className="stat-icon" />
              <div className="stat-data">
                <span className="stat-number">{analytics.totalArtworks || 0}</span>
                <span className="stat-label">Catalog Masterworks</span>
              </div>
            </div>

            <div className="stat-box">
              <FaAward className="stat-icon" />
              <div className="stat-data">
                <span className="stat-number">{analytics.categoryStats?.length || 0}</span>
                <span className="stat-label">Art Categories</span>
              </div>
            </div>
          </div>

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
