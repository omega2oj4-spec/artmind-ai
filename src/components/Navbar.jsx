import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import './Navbar.css';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  if (['/login', '/Login', '/register', '/Register', '/'].includes(location.pathname)) {
    return null;
  }

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    setIsOpen(false);
    
    if (window.location.pathname !== '/home') {
      navigate('/home');
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
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
        <Link to="/home" className="navbar-logo" onClick={(e) => handleNavClick(e, 'home')}>
          <span className="navbar-logo-script">Art Mind</span>
          <span className="navbar-logo-sub">AI Portal</span>
        </Link>
        
        <div className={`hamburger ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(!isOpen)}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>
        
        <ul className={`navbar-links ${isOpen ? 'active' : ''}`}>
          <li><a href="#home" onClick={(e) => handleNavClick(e, 'home')}>Home</a></li>
          <li><a href="#gallery" onClick={(e) => handleNavClick(e, 'gallery')}>Gallery</a></li>
          <li><Link to="/search" onClick={() => setIsOpen(false)}>Search</Link></li>
          <li><a href="#dashboard" onClick={(e) => handleNavClick(e, 'dashboard')}>Dashboard</a></li>
          <li><a href="#analytics" onClick={(e) => handleNavClick(e, 'analytics')}>Analytics</a></li>
          
          {user ? (
            <li>
              <button 
                onClick={handleLogout} 
                style={{ background: 'transparent', border: 'none', color: '#d4af37', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: '500' }}
              >
                Logout ({user.name.split(' ')[0]})
              </button>
            </li>
          ) : (
            <li><Link to="/Login" onClick={() => setIsOpen(false)}>Login</Link></li>
          )}
          
          <li className="mobile-only-btn">
            <button className="navbar-contact-btn">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                <path d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 493.2 160 480V396.4c0-4 1.5-7.8 4.2-10.7L331.8 202.8c5.8-6.3 5.6-16-.4-22s-15.7-6.4-22-.7L106 360.8 17.7 316.6C7.1 311.3 .3 300.7 0 288.9s5.9-22.8 16.1-28.7l448-256c10.7-6.1 23.9-5.5 34 1.4z"/>
              </svg>
              Contact
            </button>
          </li>
        </ul>
        
        <button className="navbar-contact-btn desktop-only-btn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <path d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 493.2 160 480V396.4c0-4 1.5-7.8 4.2-10.7L331.8 202.8c5.8-6.3 5.6-16-.4-22s-15.7-6.4-22-.7L106 360.8 17.7 316.6C7.1 311.3 .3 300.7 0 288.9s5.9-22.8 16.1-28.7l448-256c10.7-6.1 23.9-5.5 34 1.4z"/>
          </svg>
          Contact
        </button>
      </nav>
    </div>
  );
}
