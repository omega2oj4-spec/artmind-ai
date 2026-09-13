/**
 * Base URL for all API requests.
 *
 * In development: empty string -> Vite proxy handles /api -> localhost:5000
 * In production (Vercel): set VITE_API_URL=https://your-app.onrender.com
 */
const API_BASE = import.meta.env.VITE_API_URL || '';

export default API_BASE;

