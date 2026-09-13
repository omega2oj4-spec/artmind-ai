import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import './Navbar.css';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const { user, logout } = useContext(AuthContext);

  const navigate = useNavigate();
  const location = useLocation();

  // Hide navbar on login/register pages
  if (
    ['/login', '/Login', '/register', '/Register', '/'].includes(
      location.pathname
    )
  ) {
    return null;
  }

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    setIsOpen(false);

    // If not on dashboard, go there first
    if (window.location.pathname !== '/dashboard') {
      navigate('/dashboard');

      setTimeout(() => {
        const element = document.getElementById(targetId);

        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 150);
    } else {
      const element = document.getElementById(targetId);

      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    navigate('/');
  };

  return (
    <div className="navbar-container">
      <nav className="navbar">

        {/* LOGO */}
        <Link
          to="/dashboard"
          className="navbar-logo"
          onClick={(e) => handleNavClick(e, 'home')}
        >
          <span className="navbar-logo-script">
            Art Mind
          </span>

          <span className="navbar-logo-sub">
            AI Portal
          </span>
        </Link>

        {/* HAMBURGER */}
        <div
          className={`hamburger ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>

        {/* NAVIGATION LINKS */}
        <ul className={`navbar-links ${isOpen ? 'active' : ''}`}>

          {/* HOME */}
          <li>
            <a
              href="#home"
              onClick={(e) =>
                handleNavClick(e, 'home')
              }
            >
              Home
            </a>
          </li>

          {/* GALLERY */}
          <li>
            <a
              href="#gallery"
              onClick={(e) =>
                handleNavClick(e, 'gallery')
              }
            >
              Gallery
            </a>
          </li>

          {/* SEARCH */}
          <li>
            <a
              href="#dashboard-search"
              onClick={(e) => handleNavClick(e, 'dashboard-search')}
            >
              Search
            </a>
          </li>

          {/* DASHBOARD */}
          <li>
            <a
              href="#dashboard"
              onClick={(e) =>
                handleNavClick(e, 'dashboard')
              }
            >
              Dashboard
            </a>
          </li>

          {/* ANALYTICS */}
          <li>
            <a
              href="#analytics"
              onClick={(e) =>
                handleNavClick(e, 'analytics')
              }
            >
              Analytics
            </a>
          </li>

          {/* LOGIN / LOGOUT */}
          {user ? (
            <li>
              <button
                onClick={handleLogout}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#d4af37',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  fontWeight: '500'
                }}
              >
                Logout ({user.name.split(' ')[0]})
              </button>
            </li>
          ) : (
            <li>
              <Link
                to="/Login"
                onClick={() => setIsOpen(false)}
              >
                Login
              </Link>
            </li>
          )}

        </ul>

      </nav>
    </div>
  );
}
