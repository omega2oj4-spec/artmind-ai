import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { FaUserCircle, FaHeart, FaHistory, FaMagic, FaGem, FaArrowRight, FaLayerGroup } from 'react-icons/fa';
import PaintingCard from '../PaintingCard.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState({
    recentlyViewed: [],
    favoriteCategories: [],
    recommended: [],
    aiCurated: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('artmind_token');
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

  return (
    <main className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-user-card">
          <FaUserCircle className="user-avatar-icon" />
          <div className="user-meta">
            <h1>Welcome back, {user ? user.name : 'Art Enthusiast'}</h1>
            <p>Personalized Art Intelligence & Curator Portfolio</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="gallery-loading-skeleton" style={{ marginTop: '32px' }}>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
      ) : (
        <div className="dashboard-sections">
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
