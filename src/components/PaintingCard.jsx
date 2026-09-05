import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaArrowRight } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext.jsx';
import './PaintingCard.css';

export default function PaintingCard({ painting, onFavoriteClick }) {
  const { favorites, toggleFavorite } = useContext(AuthContext);
  if (!painting) return null;

  const paintingId = painting._id || painting.id;
  const isFavorited = favorites?.includes(paintingId);

  const handleFav = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onFavoriteClick) {
      onFavoriteClick(paintingId);
    } else {
      const res = await toggleFavorite(paintingId);
      if (res?.requireAuth) {
        alert('Please login to save your favorite artworks to your collection.');
      }
    }
  };

  return (
    <div className="painting-card">
      <div className="painting-card-image-wrapper">
        <img src={painting.imageUrl || painting.src} alt={painting.title} loading="lazy" />
        <div className="painting-card-overlay">
          <Link to={`/painting/${paintingId}`} className="view-details-btn">
            Explore <FaArrowRight />
          </Link>
        </div>
        <button 
          className={`favorite-toggle-btn ${isFavorited ? 'active' : ''}`} 
          onClick={handleFav}
          title={isFavorited ? "Remove from favorites" : "Save to favorites"}
          aria-label="Favorite button"
        >
          {isFavorited ? <FaHeart color="#d4af37" /> : <FaRegHeart />}
        </button>
      </div>

      <div className="painting-card-content">
        <div className="painting-card-tags">
          {painting.category && <span className="tag category-tag">{painting.category}</span>}
          {painting.colorMedium && <span className="tag medium-tag">{painting.colorMedium}</span>}
        </div>
        <h3 className="painting-card-title">
          <Link to={`/painting/${paintingId}`}>{painting.title}</Link>
        </h3>
        <p className="painting-card-artist">{painting.artist || 'Unknown Artist'}</p>
      </div>
    </div>
  );
}
