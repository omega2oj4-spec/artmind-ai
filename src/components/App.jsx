import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

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
import ChatBot from './ChatBot.jsx';


// ===============================
// MAIN SINGLE PAGE PORTAL
// ===============================
function PortalPage() {
  return (
    <>
      {/* HOME */}
      <Home />

      {/* DASHBOARD */}
      <Dashboard />

      {/* SEARCH — kept directly below the dashboard for quick discovery */}
      <Search embedded />

      {/* GALLERY */}
      <Gallery />

      {/* ANALYTICS */}
      <Analytics embedded />
    </>
  );
}


// ===============================
// APP
// ===============================
function App() {
  return (
    <AuthProvider>
      <Router>

        <div className="App">

          {/* NAVBAR */}
          <Navbar />

          {/* ROUTES */}
          <Routes>

            {/* DEFAULT */}
            <Route
              path="/"
              element={<Navigate to="/register" replace />}
            />

            {/* HOME */}
            <Route
              path="/home"
              element={<Navigate to="/dashboard" replace />}
            />

            {/* AUTH */}
            <Route
              path="/login"
              element={<Login />}
            />

            <Route
              path="/Login"
              element={<Login />}
            />

            <Route
              path="/register"
              element={<Register />}
            />

            <Route
              path="/Register"
              element={<Register />}
            />

            {/* MAIN PORTAL */}
            <Route
              path="/dashboard"
              element={<PortalPage />}
            />

            <Route
              path="/Dashboard"
              element={<Navigate to="/dashboard" replace />}
            />

            {/* GALLERY PAGE */}
            <Route
              path="/gallery"
              element={<Gallery />}
            />

            {/* PAINTING DETAILS */}
            <Route
              path="/painting/:id"
              element={<PaintingDetails />}
            />

            {/* SEARCH */}
            <Route
              path="/search"
              element={<Search />}
            />

            {/* AI VISION */}
            <Route
              path="/ai-vision"
              element={<AIVision />}
            />

            <Route
              path="/AI vision"
              element={<AIVision />}
            />

            <Route
              path="/upload"
              element={<AIVision />}
            />

            {/* ANALYTICS PAGE */}
            <Route
              path="/analytics"
              element={<Analytics />}
            />

            <Route
              path="/Analytics"
              element={<Analytics />}
            />

            {/* 404 */}
            <Route
              path="*"
              element={<Navigate to="/register" replace />}
            />

          </Routes>

          {/* FOOTER */}
          <Footer />

          {/* AI CHATBOT */}
          <ChatBot />

        </div>

      </Router>
    </AuthProvider>
  );
}

export default App;
