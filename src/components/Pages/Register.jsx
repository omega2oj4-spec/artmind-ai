import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaUserPlus,
  FaPalette,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import './AuthPages.css';
import { apiFetch } from '../../utils/api.js';

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

    // Make sure all required fields are filled
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please complete all required fields.');
      return;
    }

    // Make sure both passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password
        })
      });

      const responseText = await res.text();
      let data = {};

      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          throw new Error(
            'The registration service returned an invalid response. Please try again shortly.'
          );
        }
      }

      if (!res.ok) {
        throw new Error(
          data.error ||
          'The registration service is unavailable. Please try again shortly.'
        );
      }

      navigate('/login', {
        state: {
          registered: true
        }
      });
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

            <h1>
              Discover art
              <br />
              made for you.
            </h1>

            <p>
              Create your collection, explore new styles, and let AI guide
              your next find.
            </p>
          </div>

          <span className="auth-panel-label">
            AI CURATED COLLECTIONS
          </span>
        </aside>

        <section className="auth-form-panel">

          <div className="auth-header">
            <div className="auth-header-icon">
              <FaPalette />
            </div>

            <h2>Create account</h2>

            <p>
              Join ArtMind and start your art journey.
            </p>
          </div>

          {error && (
            <div
              id="register-form-error"
              className="auth-error-alert"
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">

            {/* Full Name */}
            <div className="auth-field">
              <label htmlFor="register-name">
                Full Name
              </label>

              <div className="auth-input-wrapper">
                <FaUser className="auth-input-icon" />

                <input
                  id="register-name"
                  name="name"
                  type="text"
                  placeholder="Ada Lovelace"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  aria-invalid={Boolean(error)}
                  aria-describedby={
                    error ? 'register-form-error' : undefined
                  }
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="auth-field">
              <label htmlFor="register-email">
                Email Address
              </label>

              <div className="auth-input-wrapper">
                <FaEnvelope className="auth-input-icon" />

                <input
                  id="register-email"
                  name="email"
                  type="email"
                  placeholder="ada@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  aria-invalid={Boolean(error)}
                  aria-describedby={
                    error ? 'register-form-error' : undefined
                  }
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="auth-field">
              <label htmlFor="register-password">
                Password
              </label>

              <div className="auth-input-wrapper">
                <FaLock className="auth-input-icon" />

                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={Boolean(error)}
                  aria-describedby={
                    error ? 'register-form-error' : undefined
                  }
                  required
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() =>
                    setShowPassword(previous => !previous)
                  }
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  aria-controls="register-password"
                  aria-pressed={showPassword}
                  title={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="auth-field">
              <label htmlFor="register-confirm-password">
                Confirm Password
              </label>

              <div className="auth-input-wrapper">
                <FaLock className="auth-input-icon" />

                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) =>
                    setConfirmPassword(e.target.value)
                  }
                  autoComplete="new-password"
                  aria-invalid={Boolean(error)}
                  aria-describedby={
                    error ? 'register-form-error' : undefined
                  }
                  required
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(previous => !previous)
                  }
                  aria-label={
                    showConfirmPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  aria-controls="register-confirm-password"
                  aria-pressed={showConfirmPassword}
                  title={
                    showConfirmPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showConfirmPassword
                    ? <FaEyeSlash />
                    : <FaEye />}
                </button>
              </div>
            </div>

            {/* Register Button */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              <FaUserPlus
                style={{ marginRight: '8px' }}
              />

              {loading
                ? 'Creating Account...'
                : 'Register Account'}
            </button>

          </form>

          <div className="auth-footer-link">
            <p>
              Already a member?{' '}
              <Link to="/login">
                Sign in
              </Link>
            </p>
          </div>

        </section>
      </div>
    </main>
  );
}
