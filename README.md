# 🎨 ArtMind AI

> A personalised AI-powered art gallery — discover, explore, and connect with masterworks from around the world.

## ✨ Features

| Feature | Description |
|---|---|
| 🖼️ **Art Gallery** | Browse 100+ curated masterworks with filters by category, style, medium & popularity |
| 🤖 **AI Chatbot** | Ask about any artwork, artist or style — powered by Gemini AI |
| 🎯 **Recommended For You** | Personalised artwork recommendations based on your views, saves & searches |
| 📊 **Analytics** | Real-time gallery engagement stats and trending artwork insights |
| ❤️ **Favourites** | Save artworks to your personal collection |
| 🕐 **Recently Viewed** | Track your artwork viewing history |
| 🔍 **Smart Search** | Search by title, artist, style, category or tags |
| 📱 **Mobile Friendly** | Responsive design — Show More / Show Less on mobile gallery |
| 🔐 **Auth** | Secure sign-up / sign-in with session-based authentication |

## 🛠️ Tech Stack

**Frontend** — React 18 + Vite, React Router v6, React Icons

**Backend** — Node.js + Express, MongoDB + Mongoose, Session-based auth

**AI & Data** — Google Gemini AI, Art Institute of Chicago Open API, AI-generated paintings

**Deployment** — Frontend: Vercel · Backend: Render · Database: MongoDB Atlas

## 🚀 Getting Started

```bash
# Clone the repo
git clone https://github.com/omega2oj4-spec/artmind-ai.git
cd artmind-ai

# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..
```

Create `server/.env`:

```env
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=your_session_secret
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
```

Create root `.env`:

```env
VITE_API_URL=http://localhost:5000
```

```bash
# Run frontend + backend together
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:5000

## 📁 Project Structure

```
artmind-ai/
├── public/artworks/       # Local painting images (AI-generated + classics)
├── src/
│   ├── components/Pages/  # Gallery, Dashboard, Analytics, Home, etc.
│   ├── context/           # AuthContext
│   ├── data/              # homeArtworks.js local catalog
│   └── utils/             # API helpers + image fallbacks
└── server/
    ├── models/            # Mongoose schemas (User, Painting)
    ├── routes/            # Express routes
    ├── middleware/        # Auth middleware
    └── utils/             # Catalog sync + thumbnail hydration
```

## 🎨 Gallery Paintings

Includes classic masterworks (Van Gogh, Vermeer, Monet, Friedrich, Dalí) plus original AI-generated oil paintings:

- Sunflower Field · Misty Mountains · Baroque Portrait · Starry Abstract
- Provençal Village · Floral Still Life · Autumn Forest · Venice Canal
- Poppy Field · Renaissance Angel · Chromatic Explosion · Cherry Blossom Garden

## 📱 Mobile Experience

On phones and tablets the gallery shows **5 paintings** at a time with a **▼ Show More** button to reveal the rest, and a **▲ Show Less** button to collapse — only in the gallery section.

## 📄 License

MIT — free to use and modify.

---
Made with ❤️ and 🎨 by ArtMind AI
