import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { FaUserCircle, FaHeart, FaHistory, FaMagic, FaGem, FaLayerGroup, FaSearch, FaEye, FaArrowUp, FaPalette, FaCompass } from 'react-icons/fa';
import PaintingCard from '../PaintingCard.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import './Dashboard.css';

export default function Dashboard() {
  const { user, token, loading: authLoading } = useContext(AuthContext);
  const [data, setData] = useState({
    recentlyViewed: [],
    favoriteCategories: [],
    recommended: [],
    aiCurated: [],
    activitySummary: null,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchDashboard();

    const refreshActivity = () => fetchDashboard();
    window.addEventListener('artmind:activity-updated', refreshActivity);
    return () => window.removeEventListener('artmind:activity-updated', refreshActivity);
  }, [authLoading, user, token]);
  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/dashboard', { headers });
      if (!res.ok) throw new Error('Dashboard load failed');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const summary = data.activitySummary || { viewedCount: 0, savedCount: 0, searchCount: 0, latestAction: { label: 'Start exploring the gallery to personalise this overview.' } };
  const categories = data.favoriteCategories?.length ? data.favoriteCategories.slice(0, 4) : ['Abstract', 'Landscape', 'Figurative', 'Nature'];
  const categoryShares = [42, 28, 18, 12];
  const activityRows = data.recentActivity?.length ? data.recentActivity : [
    { type: 'discover', label: 'Your art journey starts here', detail: 'Search or explore the gallery to build your profile.' }
  ];

  return (
    <main id="dashboard" className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-user-card">
          <FaUserCircle className="user-avatar-icon" />
          <div className="user-meta">
            <h1>Welcome back, {user ? user.name : 'Art Enthusiast'}</h1>
            <p>Here’s your personal art discovery overview.</p>
          </div>
        </div>
        <Link className="dashboard-explore-btn" to="/gallery"><FaCompass /> Explore gallery</Link>
      </div>

      {authLoading || loading ? (
        <div className="gallery-loading-skeleton" style={{ marginTop: '32px' }}>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
      ) : (
        <div className="dashboard-sections">
          <section className="dashboard-metrics" aria-label="Your art activity">
            <div className="dashboard-metric metric-viewed"><span className="metric-icon"><FaEye /></span><div><p>Artworks viewed</p><strong>{summary.viewedCount}</strong><small><FaArrowUp /> Your discovery activity</small></div></div>
            <div className="dashboard-metric metric-saved"><span className="metric-icon"><FaHeart /></span><div><p>Saved artworks</p><strong>{summary.savedCount}</strong><small><FaArrowUp /> Building your collection</small></div></div>
            <div className="dashboard-metric metric-search"><span className="metric-icon"><FaSearch /></span><div><p>Art searches</p><strong>{summary.searchCount}</strong><small><FaArrowUp /> Exploring new ideas</small></div></div>
            <div className="dashboard-metric metric-categories"><span className="metric-icon"><FaPalette /></span><div><p>Preferred styles</p><strong>{categories.length}</strong><small>Categories in your profile</small></div></div>
          </section>

          <section className="dashboard-insights-grid">
            <article className="insight-card engagement-card">
              <div className="insight-card-heading"><div><h2>Discovery overview</h2><p>Your recent engagement with Art Mind</p></div><span className="period-pill">This week</span></div>
              <div className="engagement-value"><strong>{summary.viewedCount + summary.searchCount + summary.savedCount}</strong><span>total interactions</span></div>
              <div className="trend-chart" aria-label="Art discovery activity trend"><svg viewBox="0 0 520 170" preserveAspectRatio="none" role="img"><defs><linearGradient id="artActivity" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#d4af37" stopOpacity=".38"/><stop offset="100%" stopColor="#d4af37" stopOpacity="0"/></linearGradient></defs><path className="chart-area" d="M0,140 C45,128 63,85 104,102 S158,142 202,92 S255,44 301,74 S363,138 405,105 S467,100 520,30 L520,170 L0,170 Z"/><path className="chart-line" d="M0,140 C45,128 63,85 104,102 S158,142 202,92 S255,44 301,74 S363,138 405,105 S467,100 520,30"/></svg></div>
              <p className="activity-last-action"><FaMagic /> {summary.latestAction?.label}</p>
            </article>

            <article className="insight-card interest-card">
              <div className="insight-card-heading"><div><h2>Art interests</h2><p>Categories shaping your recommendations</p></div></div>
              <div className="interest-content"><div className="interest-donut"><div><strong>{categories[0]}</strong><span>top interest</span></div></div><div className="interest-legend">{categories.map((category, index) => <Link key={category} to={`/gallery?category=${encodeURIComponent(category)}`}><i className={`legend-dot dot-${index}`} /><span>{category}</span><b>{categoryShares[index]}%</b></Link>)}</div></div>
            </article>
          </section>

          <section className="dashboard-lower-grid">
            <article className="dashboard-section recent-activity-card"><div className="section-header"><div><h2><FaHistory /> Recent activity</h2><p className="section-desc">Your latest art discoveries</p></div></div><div className="recent-activity-list">{activityRows.map((activity, index) => <div className="recent-activity-row" key={`${activity.label}-${index}`}><span className={`activity-type ${activity.type}`}>{activity.type === 'search' ? <FaSearch /> : activity.type === 'view' ? <FaEye /> : <FaMagic />}</span><div><strong>{activity.label}</strong><p>{activity.detail}</p></div><time>{activity.at ? new Date(activity.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'New'}</time></div>)}</div></article>
            <article className="dashboard-section preference-card"><div className="section-header"><div><h2><FaLayerGroup /> Your preferred categories</h2><p className="section-desc">Used to personalise your artwork recommendations</p></div></div><div className="category-pills-list">{categories.map((cat) => <Link key={cat} to={`/gallery?category=${encodeURIComponent(cat)}`} className="dashboard-cat-pill">{cat}</Link>)}</div></article>
          </section>
          {/* Favorite Categories Section */}
          {data.favoriteCategories && data.favoriteCategories.length > 0 && (
            <section className="dashboard-section">
              <div className="section-header">
                <h2><FaLayerGroup color="#d4af37" /> Your Preferred Categories</h2>
              </div>
              <div className="category-pills-list">
                {data.favoriteCategories.map((cat, idx) => (
                  <Link key={idx} to={`/gallery?category=${encodeURIComponent(cat)}`} className="dashboard-cat-pill">
                    {cat}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Recommended For You Section */}
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h2><FaMagic color="#d4af37" /> Recommended For You</h2>
                <p className="section-desc">Algorithmically scored based on your style affinities and preferred mediums</p>
              </div>
            </div>
            <div className="gallery-grid">
              {data.recommended.map(painting => (
                <PaintingCard key={painting._id} painting={painting} />
              ))}
            </div>
          </section>

          {/* Recently Viewed Section */}
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h2><FaHistory color="#8c7355" /> Recently Viewed Artworks</h2>
                <p className="section-desc">Your recent artwork view history across the gallery</p>
              </div>
            </div>
            {data.recentlyViewed.length > 0 ? (
              <div className="gallery-grid">
                {data.recentlyViewed.map(painting => (
                  <PaintingCard key={painting._id} painting={painting} />
                ))}
              </div>
            ) : (
              <div className="empty-dashboard-state">
                <p>No recently viewed artworks yet. <Link to="/gallery">Explore the Gallery</Link></p>
              </div>
            )}
          </section>

          {/* AI-Curated Collection Section */}
          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h2><FaGem color="#d4af37" /> AI-Curated Collection</h2>
                <p className="section-desc">Gemini AI selected highlights from the public domain catalog</p>
              </div>
            </div>
            <div className="gallery-grid">
              {data.aiCurated.map(painting => (
                <PaintingCard key={painting._id} painting={painting} />
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
