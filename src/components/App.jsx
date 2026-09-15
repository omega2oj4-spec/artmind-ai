import React, { useContext, lazy, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import './App.css';

import AuthProvider, { AuthContext } from '../context/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

const Home = lazy(() => import('./Pages/Home.jsx'));
const Gallery = lazy(() => import('./Pages/Gallery.jsx'));
const PaintingDetails = lazy(() => import('./Pages/PaintingDetails.jsx'));
const Search = lazy(() => import('./Pages/Search.jsx'));
const AIVision = lazy(() => import('./Pages/AIVision.jsx'));
const Dashboard = lazy(() => import('./Pages/Dashboard.jsx'));
const Login = lazy(() => import('./Pages/Login.jsx'));
const Register = lazy(() => import('./Pages/Register.jsx'));
const Analytics = lazy(() => import('./Pages/Analytics.jsx'));

import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import ChatBot from './ChatBot.jsx';

const LoadingSpinner = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '200px',
    color: '#d4af37'
  }}>
    <div style={{ 
      width: '40px', 
      height: '40px', 
      border: '3px solid #f3f3f3', 
      borderTop: '3px solid #d4af37', 
      borderRadius: '50%', 
      animation: 'spin 1s linear infinite' 
    }}></div>
  </div>
);

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
          <Suspense fallback={<LoadingSpinner />}>
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
          </Suspense>

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
