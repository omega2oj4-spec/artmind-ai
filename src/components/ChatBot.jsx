import React, { useState, useRef, useEffect } from 'react';
import { FaTimes, FaPaperPlane, FaRobot, FaCamera, FaPlus } from 'react-icons/fa';
import { Link, useLocation } from 'react-router-dom';
import PaintingCard from './PaintingCard.jsx';
import './ChatBot.css';

export default function ChatBot() {
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am ArtMind, your AI Curator. Ask me about paintings, artists, styles, colors, or collections. I will remember the context while we chat.',
      paintings: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Hooks must always run before any conditional return
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Hide chatbot on login/register pages
  if (['/', '/login', '/Login', '/register', '/Register'].includes(location.pathname)) {
    return null;
  }

  const handleSend = async (e, suggestedMessage = '') => {
    if (e) e.preventDefault();

    const messageToSend = suggestedMessage || input;

    if (!messageToSend.trim() || loading) return;

    const userMsg = messageToSend.trim();

    setInput('');

    const newMessages = [
      ...messages,
      {
        role: 'user',
        text: userMsg,
        paintings: []
      }
    ];

    setMessages(newMessages);
    setLoading(true);

    try {
      const historyPayload = newMessages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const token = localStorage.getItem('artmind_token');

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: userMsg,
          history: historyPayload
        })
      });

      if (!res.ok) {
        throw new Error('Chat service error');
      }

      const data = await res.json();

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: data.reply || 'Here are some catalog recommendations.',
          paintings: data.paintings || []
        }
      ]);
    } catch (err) {
      console.error('Chat error:', err);

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'I am experiencing a momentary connection pause. Please try asking again!',
          paintings: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (suggestion) => {
    handleSend(null, suggestion);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file || loading) return;

    if (!file.type.startsWith('image/')) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'Please choose an image file (JPEG, PNG, WebP, or GIF).',
          paintings: []
        }
      ]);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'That image is larger than 10 MB. Please choose a smaller artwork image.',
          paintings: []
        }
      ]);
      return;
    }

    const imagePreview = URL.createObjectURL(file);

    setMessages(prev => [
      ...prev,
      {
        role: 'user',
        text: 'Please analyze this painting.',
        imagePreview,
        paintings: []
      }
    ]);

    setLoading(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error('Image analysis failed');
      }

      const data = await res.json();

      const analysis = data.analysis || {};

      const colors = analysis.dominantColors?.length
        ? analysis.dominantColors.join(', ')
        : 'not available';

      const responseText = `Here is what I see:
Style: ${analysis.style || 'Unknown'}
Category: ${analysis.category || 'Unknown'}
Medium: ${analysis.mediumGuess || 'Unknown'}
Dominant colors: ${colors}

${analysis.summary || 'I could not generate a full analysis for this artwork.'}`;

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: responseText,
          paintings: data.similarPaintings || []
        }
      ]);
    } catch (err) {
      console.error('Image analysis error:', err);

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'I could not analyze that image right now. Please try another artwork image.',
          paintings: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbot-wrapper">

      {!isOpen && (
        <div className="chatbot-launcher-actions">

          <Link
            to="/ai-vision"
            className="ai-vision-camera-btn"
            title="Open AI Vision artwork recognition"
            aria-label="Open AI Vision artwork recognition"
          >
            <FaCamera />
            <span>AI Vision</span>
          </Link>

          <button
            className="chatbot-toggle-btn"
            onClick={() => setIsOpen(true)}
            title="Ask ArtMind AI Curator"
          >
            <FaRobot className="chatbot-icon" />
            <span className="chatbot-toggle-label">
              Ask ArtMind
            </span>
          </button>

        </div>
      )}

      {isOpen && (
        <div className="chatbot-window">

          <div className="chatbot-header">

            <div className="chatbot-header-title">

              <FaRobot color="#d4af37" />

              <div>
                <h4>ArtMind Curator</h4>
                <span>AI Catalog Assistant</span>
              </div>

            </div>

            <button
              className="chatbot-close-btn"
              onClick={() => setIsOpen(false)}
            >
              <FaTimes />
            </button>

          </div>

          <div className="chatbot-messages">

            {messages.map((msg, index) => (

              <div
                key={index}
                className={`chat-bubble-container ${msg.role}`}
              >

                <div className={`chat-bubble ${msg.role}`}>

                  {msg.imagePreview && (
                    <img
                      className="chat-uploaded-image"
                      src={msg.imagePreview}
                      alt="Artwork submitted for analysis"
                    />
                  )}

                  <p>{msg.text}</p>

                  {msg.paintings && msg.paintings.length > 0 && (
                    <div className="chat-inline-paintings">

                      {msg.paintings.map(painting => (

                        <div
                          key={painting._id}
                          className="chat-inline-card"
                        >
                          <PaintingCard painting={painting} />
                        </div>

                      ))}

                    </div>
                  )}

                </div>

              </div>

            ))}

            {loading && (
              <div className="chat-bubble-container assistant">

                <div className="chat-bubble assistant loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>

              </div>
            )}

            <div ref={messagesEndRef} />

          </div>

          {messages.length === 1 && !loading && (
            <div
              className="chatbot-suggestions"
              aria-label="Suggested questions"
            >

              <button
                type="button"
                onClick={() =>
                  handleSuggestion(
                    'Show me modern abstract paintings with blue color themes.'
                  )
                }
              >
                Blue abstract art
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSuggestion(
                    'Explain Impressionism and show me related paintings.'
                  )
                }
              >
                About Impressionism
              </button>

              <button
                type="button"
                onClick={() =>
                  handleSuggestion(
                    'Show me popular landscape paintings.'
                  )
                }
              >
                Popular landscapes
              </button>

            </div>
          )}

          <form
            className="chatbot-input-area"
            onSubmit={handleSend}
          >

            <input
              ref={imageInputRef}
              className="chatbot-image-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageUpload}
              aria-label="Upload artwork image"
            />

            <button
              type="button"
              className="chatbot-upload-btn"
              onClick={() => imageInputRef.current?.click()}
              disabled={loading}
              title="Upload a painting for AI analysis"
              aria-label="Upload a painting for AI analysis"
            >
              <FaPlus />
            </button>

            <input
              type="text"
              placeholder="Ask about styles, themes, or artists..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
            >
              <FaPaperPlane />
            </button>

          </form>

        </div>
      )}

    </div>
  );
}
