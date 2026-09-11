# ArtMind AI — Fix Tasks

## P0 Blockers
- [x] Fix missing `};` in `server/utils/openai.js` (line 146) — server won't start
- [x] Fix `openai.responses.create` → `openai.chat.completions.create` in chatWithOpenAI
- [x] Fix `response.output_text` → `response.choices[0].message.content` in chatWithOpenAI
- [x] Fix invalid model `gemini-3.6-flash` → `gemini-2.0-flash` (lines 35, 123, 212)
- [x] Fix crash on search in `Home.jsx` — `art.artist?.toLowerCase()`

## P1 High
- [x] Add missing `POST /search-history` route to `server/routes/dashboard.js`
- [x] Fix view tracking — update `server/index.js` `/api/views/:id` to use `optionalAuth` and save to `user.viewHistory`
- [x] Pass `userProfile` to `chatWithOpenAI` in `server/routes/chat.js`

## P2 Medium
- [x] Add ObjectId validation to `server/index.js` view route
- [x] Add ObjectId validation to `server/routes/paintings.js` `GET /:id`
- [x] Add ObjectId validation to `server/routes/favorites.js` POST + DELETE
- [x] Add ObjectId validation to `server/routes/dashboard.js` views route
- [x] Fix `painting.popularity` decrement on unfavorite in `server/routes/favorites.js`
- [x] Fix `homeArtworks.js` unsafe `...artwork.tags` spread
- [x] Fix React `key` prop in `Analytics.jsx`, `Dashboard.jsx`, `ChatBot.jsx`
- [x] Fix `AuthContext.jsx` favorites ID comparison for populated objects

## P3 Low
- [x] Fix `Navbar.jsx` `user.name.split` crash risk
- [x] Fix `server/index.js` redundant `dotenv` initialization
- [x] Fix `App.jsx` route with literal space `/AI vision`
- [x] Fix `ChatBot.jsx` missing auth header on image analysis
