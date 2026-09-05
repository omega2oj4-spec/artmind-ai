import React, { useState, useEffect } from 'react';
import { FaChartLine, FaEye, FaAward, FaLayerGroup } from 'react-icons/fa';
import PaintingCard from '../PaintingCard.jsx';
import './Analytics.css';

export default function Analytics() {
  const [analytics, setAnalytics] = useState({
    topPaintings: [],
    categoryStats: [],
    totalViews: 0,
    totalArtworks: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/trending');
      if (!res.ok) throw new Error('Analytics load failed');
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="analytics-container">
      <div className="analytics-header">
        <h1 className="analytics-title"><FaChartLine color="#d4af37" /> Catalog Analytics & Trending Insights</h1>
        <p className="analytics-subtitle">
          Real-time metrics tracking gallery engagement, view counts, popular artwork categories, and trending masterworks.
        </p>
      </div>

      {loading ? (
        <div className="gallery-loading-skeleton" style={{ marginTop: '32px' }}>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
      ) : (
        <>
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
                      <tr key={idx}>
                        <td className="cat-name">{stat._id}</td>
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
            <h2 className="section-title">Trending Artworks</h2>
            <div className="gallery-grid">
              {analytics.topPaintings.map(painting => (
                <PaintingCard key={painting._id} painting={painting} />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
