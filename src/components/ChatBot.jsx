import React, { useState, useRef, useEffect } from 'react';
import { FaComments, FaTimes, FaPaperPlane, FaRobot } from 'react-icons/fa';
import PaintingCard from './PaintingCard.jsx';
import './ChatBot.css';

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Greetings! I am ArtMind, your AI Curator. How may I assist your art exploration today?',
      paintings: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');

    const newMessages = [
      ...messages,
      { role: 'user', text: userMsg, paintings: [] }
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      const historyPayload = newMessages.map(m => ({ role: m.role, text: m.text }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: historyPayload })
      });

      if (!res.ok) throw new Error('Chat service error');

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

  return (
    <div className="chatbot-wrapper">
      {!isOpen && (
        <button 
          className="chatbot-toggle-btn" 
          onClick={() => setIsOpen(true)}
          title="Ask ArtMind AI Curator"
        >
          <FaRobot className="chatbot-icon" />
          <span className="chatbot-toggle-label">Ask ArtMind</span>
        </button>
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
            <button className="chatbot-close-btn" onClick={() => setIsOpen(false)}>
              <FaTimes />
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`chat-bubble-container ${msg.role}`}>
                <div className={`chat-bubble ${msg.role}`}>
                  <p>{msg.text}</p>

                  {/* Inline Painting Cards rendering */}
                  {msg.paintings && msg.paintings.length > 0 && (
                    <div className="chat-inline-paintings">
                      {msg.paintings.map(painting => (
                        <div key={painting._id} className="chat-inline-card">
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
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chatbot-input-area" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Ask about styles, themes, or artists..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" disabled={!input.trim() || loading}>
              <FaPaperPlane />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
