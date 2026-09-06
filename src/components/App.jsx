import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import './App.css';

import AuthProvider from '../context/AuthContext.jsx';
import Home from './Pages/Home.jsx';
import Gallery from './Pages/Gallery.jsx';
import PaintingDetails from './Pages/PaintingDetails.jsx';
import Search from './Pages/Search.jsx';
import AIVision from './Pages/AIVision.jsx';
import Dashboard from './Pages/Dashboard.jsx';
import Login from './Pages/Login.jsx';
import Register from './Pages/Register.jsx';
import Analytics from './Pages/Analytics.jsx';

import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/" element={<Navigate to="/register" replace />} />
            <Route path="/home" element={
              <>
                <Dashboard />
                <Home />
                <Analytics embedded />
                <Gallery />
              </>
            } />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="*" element={<Navigate to="/register" replace />} />
            <Route path="/painting/:id" element={<PaintingDetails />} />
            <Route path="/search" element={<Search />} />
            
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/Dashboard" element={<Dashboard />} />

            <Route path="/login" element={<Login />} />
            <Route path="/Login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/Register" element={<Register />} />

            <Route path="/ai-vision" element={<AIVision />} />
            <Route path="/AI vision" element={<AIVision />} />
            <Route path="/upload" element={<AIVision />} />

            <Route path="/analytics" element={<Analytics />} />
            <Route path="/Analytics" element={<Analytics />} />
          </Routes>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
