/**
 * Base URL for all API requests.
 *
 * In development: empty string -> Vite proxy handles /api -> localhost:5000
 * In production (Vercel): VITE_API_URL should point to the Render API.
 * The fallback keeps the deployed frontend connected if Vercel has not
 * injected that build-time variable yet.
 */
const API_BASE = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? 'https://artmind-ai-1.onrender.com' : '');

export default API_BASE;

