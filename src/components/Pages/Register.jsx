import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock, FaUserPlus, FaPalette, FaEye, FaEyeSlash } from 'react-icons/fa';
import './AuthPages.css';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError('Please complete all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      navigate('/login', { state: { registered: true } });
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
            <h1>Discover art<br />made for you.</h1>
            <p>Create your collection, explore new styles, and let AI guide your next find.</p>
          </div>
          <span className="auth-panel-label">AI CURATED COLLECTIONS</span>
        </aside>

        <section className="auth-form-panel">
          <div className="auth-header">
            <div className="auth-header-icon"><FaPalette /></div>
            <h2>Create account</h2>
            <p>Join ArtMind and start your art journey.</p>
          </div>

        {error && <div className="auth-error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Full Name</label>
            <div className="auth-input-wrapper">
              <FaUser className="auth-input-icon" />
              <input
                type="text"
                placeholder="Ada Lovelace"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label>Email Address</label>
            <div className="auth-input-wrapper">
              <FaEnvelope className="auth-input-icon" />
              <input
                type="email"
                placeholder="ada@example.com"
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
                placeholder="At least 6 characters"
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

          <div className="auth-field">
            <label>Confirm Password</label>
            <div className="auth-input-wrapper">
              <FaLock className="auth-input-icon" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowConfirmPassword(previous => !previous)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            <FaUserPlus style={{ marginRight: '8px' }} />
            {loading ? 'Creating Account...' : 'Register Account'}
          </button>
        </form>

          <div className="auth-footer-link">
            <p>Already a member? <Link to="/login">Sign in</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}
