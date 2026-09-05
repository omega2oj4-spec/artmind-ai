import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('artmind_token') || null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Token invalid');
        })
        .then(data => {
          setUser(data.user);
          setFavorites(data.user.favorites || []);
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (authToken, userData) => {
    localStorage.setItem('artmind_token', authToken);
    setToken(authToken);
    setUser(userData);
    setFavorites(userData.favorites || []);
  };

  const register = (authToken, userData) => {
    login(authToken, userData);
  };

  const logout = () => {
    localStorage.removeItem('artmind_token');
    setToken(null);
    setUser(null);
    setFavorites([]);
  };

  const toggleFavorite = async (paintingId) => {
    if (!token) {
      return { success: false, requireAuth: true };
    }

    const isFav = favorites.includes(paintingId);
    const method = isFav ? 'DELETE' : 'POST';

    try {
      const res = await fetch(`/api/favorites/${paintingId}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites || []);
        return { success: true, isFavorite: !isFav };
      }
      return { success: false };
    } catch (err) {
      console.error('Error toggling favorite:', err);
      return { success: false };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, favorites, loading, login, register, logout, toggleFavorite }}>
      {children}
    </AuthContext.Provider>
  );
}
