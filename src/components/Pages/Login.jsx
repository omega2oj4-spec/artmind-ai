import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaEnvelope, FaLock, FaSignInAlt, FaPalette, FaEye, FaEyeSlash } from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext.jsx';
import './AuthPages.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      login(data.token, data.user);
      window.scrollTo(0, 0);
      navigate('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page-container">
      <div className="auth-card">
        <aside className="auth-art-panel">
          <div className="auth-art-orb auth-art-orb-one"></div>
          <div className="auth-art-orb auth-art-orb-two"></div>
          <div className="auth-art-content">
            <span className="auth-brand">ART MIND</span>
            <h1>Your personal<br />art journey.</h1>
            <p>Save artworks you love and receive recommendations shaped by your taste.</p>
          </div>
          <span className="auth-panel-label">AI CURATED COLLECTIONS</span>
        </aside>

        <section className="auth-form-panel">
          <div className="auth-header">
            <div className="auth-header-icon"><FaPalette /></div>
            <h2>Welcome back</h2>
            <p>Sign in to continue curating your collection.</p>
          </div>

        {location.state?.registered && <p className="auth-success-alert">Account created successfully. Please sign in to continue.</p>}

        {error && <div className="auth-error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Email Address</label>
            <div className="auth-input-wrapper">
              <FaEnvelope className="auth-input-icon" />
              <input
                type="email"
                placeholder="curator@artmind.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label>Password</label>
            <div className="auth-input-wrapper">
              <FaLock className="auth-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(previous => !previous)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            <FaSignInAlt style={{ marginRight: '8px' }} />
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

          <div className="auth-footer-link">
            <p>New to ArtMind? <Link to="/register">Create an account</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}
