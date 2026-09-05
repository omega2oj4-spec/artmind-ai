import React, { useState } from 'react';
import { FaCloudUploadAlt, FaEye, FaPalette, FaCheckCircle, FaSpinner } from 'react-icons/fa';
import PaintingCard from '../PaintingCard.jsx';
import './AIVision.css';

export default function AIVision() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [similarPaintings, setSimilarPaintings] = useState([]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysis(null);
      setSimilarPaintings([]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setAnalysis(null);
      setSimilarPaintings([]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleAnalyze = async () => {
    if (!selectedFile || loading) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Analysis failed');

      const data = await res.json();
      setAnalysis(data.analysis);
      setSimilarPaintings(data.similarPaintings || []);
    } catch (err) {
      console.error('Error during image analysis:', err);
      alert('An error occurred while analyzing the artwork image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="ai-vision-container">
      <div className="vision-header">
        <h1 className="vision-title"><FaEye color="#d4af37" /> AI Vision Artwork Recognition</h1>
        <p className="vision-subtitle">
          Upload any artwork image. Gemini Multimodal Vision will inspect its composition, medium, style, dominant colors, and recommend 5 matching works from our catalog.
        </p>
      </div>

      <div className="vision-upload-layout">
        <div 
          className={`upload-dropzone ${previewUrl ? 'has-preview' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {previewUrl ? (
            <div className="image-preview-wrapper">
              <img src={previewUrl} alt="Uploaded Artwork Preview" />
              <button className="change-image-btn" onClick={() => { setSelectedFile(null); setPreviewUrl(null); setAnalysis(null); }}>
                Choose Different Image
              </button>
            </div>
          ) : (
            <label htmlFor="artwork-file-input" className="dropzone-label">
              <FaCloudUploadAlt className="upload-icon" />
              <h3>Drag & Drop Artwork Image Here</h3>
              <p>or click to browse your device (JPEG, PNG, WebP up to 10MB)</p>
              <input 
                id="artwork-file-input" 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>

        {selectedFile && (
          <div className="analyze-action-bar">
            <button 
              className="analyze-submit-btn" 
              onClick={handleAnalyze} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <FaSpinner className="spinner-icon" /> Analyzing Artwork with Gemini Vision...
                </>
              ) : (
                'Analyze Image & Match Catalog'
              )}
            </button>
          </div>
        )}
      </div>

      {analysis && (
        <section className="vision-results-section">
          <div className="analysis-panel">
            <h2 className="panel-title"><FaCheckCircle color="#2e7d32" /> Gemini Vision Analysis Results</h2>

            <div className="analysis-grid">
              <div className="analysis-card">
                <span className="card-label">Detected Category</span>
                <span className="card-value highlight-category">{analysis.category}</span>
              </div>
              <div className="analysis-card">
                <span className="card-label">Artistic Style</span>
                <span className="card-value">{analysis.style}</span>
              </div>
              <div className="analysis-card">
                <span className="card-label">Medium Guess</span>
                <span className="card-value">{analysis.mediumGuess}</span>
              </div>
              <div className="analysis-card">
                <span className="card-label">Dominant Colors</span>
                <div className="color-pills">
                  {(analysis.dominantColors || []).map((color, idx) => (
                    <span key={idx} className="color-pill">{color}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="analysis-summary-box">
              <h3>Artistic Composition & Emotional Tone</h3>
              <p>{analysis.summary}</p>
            </div>
          </div>

          {similarPaintings.length > 0 && (
            <div className="vision-similar-section">
              <h2 className="section-title">5 Catalog Matches Based on Vision Analysis</h2>
              <p className="section-subtitle">Catalog works sharing detected category ({analysis.category}) and style ({analysis.style})</p>
              <div className="gallery-grid">
                {similarPaintings.map(painting => (
                  <PaintingCard key={painting._id} painting={painting} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
