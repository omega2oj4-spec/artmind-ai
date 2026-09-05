import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import './App.css';

import Home from './Pages/Home';
import Gallery from './Pages/Gallery';
import Navbar from './Navbar';
import Footer from './Footer';


function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={
            <>
              <Home />
              <Gallery />
            </>
          } />
        </Routes>
        <Navbar />
        <Footer />
      </div>
    </Router>
  );
}

export default App




