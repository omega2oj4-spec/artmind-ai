import { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo-transparent.png';
import './Navbar.css';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="navbar-container">
      <nav className="navbar">
        <Link to="/" className="navbar-logo">
          <img src={logo} alt="ArtMind AI Portal" className="navbar-logo-img" />
        </Link>

        <div className={`hamburger ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(!isOpen)}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </div>

        <ul className={`navbar-links ${isOpen ? 'active' : ''}`}>
          <li><Link to="/" onClick={() => setIsOpen(false)}>Home</Link></li>
          <li><Link to="/Gallery" onClick={() => setIsOpen(false)}>Gallery</Link></li>
          <li><Link to="/Search" onClick={() => setIsOpen(false)}>Search</Link></li>
          <li><Link to="/Dashboard" onClick={() => setIsOpen(false)}>Dashboard</Link></li>
          <li><Link to="/Login" onClick={() => setIsOpen(false)}>Login</Link></li>
          <li><Link to="/Register" onClick={() => setIsOpen(false)}>Register</Link></li>
        </ul>
      </nav>
    </div>
  );
}