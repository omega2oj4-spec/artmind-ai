import React, { useContext } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import './App.css';

import AuthProvider, { AuthContext } from '../context/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

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

// Inline redirect for root route based on auth state
function RootRedirect() {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/register" replace />;
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
              element={<RootRedirect />}
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
              element={
                <ProtectedRoute>
                  <PortalPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/Dashboard"
              element={<Navigate to="/dashboard" replace />}
            />

            {/* GALLERY PAGE */}
            <Route
              path="/gallery"
              element={
                <ProtectedRoute>
                  <Gallery />
                </ProtectedRoute>
              }
            />

            {/* PAINTING DETAILS */}
            <Route
              path="/painting/:id"
              element={
                <ProtectedRoute>
                  <PaintingDetails />
                </ProtectedRoute>
              }
            />

            {/* SEARCH */}
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <Search />
                </ProtectedRoute>
              }
            />

            {/* AI VISION */}
            <Route
              path="/ai-vision"
              element={
                <ProtectedRoute>
                  <AIVision />
                </ProtectedRoute>
              }
            />

            <Route
              path="/AI vision"
              element={
                <ProtectedRoute>
                  <AIVision />
                </ProtectedRoute>
              }
            />

            <Route
              path="/upload"
              element={
                <ProtectedRoute>
                  <AIVision />
                </ProtectedRoute>
              }
            />

            {/* ANALYTICS PAGE */}
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />

            <Route
              path="/Analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
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
