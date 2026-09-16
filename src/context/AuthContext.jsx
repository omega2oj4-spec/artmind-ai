import React, { createContext, useState, useEffect } from 'react';
import { apiFetch } from '../utils/api.js';

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/auth/me')
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Token invalid');
        })
        .then(data => {
          setUser(data.user);
          setFavorites((data.user.favorites || []).map((id) => String(id)));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
  }, []);

  const login = (userData) => {
    setUser(userData);
    setFavorites((userData.favorites || []).map((id) => String(id)));
  };

  const register = (userData) => {
    login(userData);
  };

  const logout = () => {
    apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setFavorites([]);
  };

  const toggleFavorite = async (paintingId) => {
    if (!user) {
      return { success: false, requireAuth: true };
    }

    const isFav = favorites.some((favoriteId) =>
      String(favoriteId) === String(paintingId)
    );
    const method = isFav ? 'DELETE' : 'POST';

    try {
      const res = await apiFetch(`/api/favorites/${paintingId}`, {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setFavorites((data.favorites || []).map((id) => String(id)));
        window.dispatchEvent(new CustomEvent('artmind:activity-updated'));
        return { success: true, isFavorite: !isFav };
      }
      return { success: false };
    } catch (err) {
      console.error('Error toggling favorite:', err);
      return { success: false };
    }
  };

  return (
    <AuthContext.Provider value={{ user, favorites, loading, login, register, logout, toggleFavorite }}>
      {children}
    </AuthContext.Provider>
  );
}
