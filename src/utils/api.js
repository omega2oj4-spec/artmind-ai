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

/**
 * CDN hosts that block direct browser hotlink requests (403 / broken images).
 * These must be fetched server-side through the proxy endpoint.
 * Keep in sync with ALLOWED_IMAGE_HOSTS in server/routes/paintings.js.
 */
const PROXIED_IMAGE_HOSTS = new Set([
  'www.artic.edu',
  'images.metmuseum.org',
  'api.nga.gov',
  'i.pinimg.com',
  'artallin.com',
  'mdl.artvee.com',
  'cdn.dribbble.com',
  'images.unsplash.com',
  'upload.wikimedia.org',
  'lh3.googleusercontent.com',
]);

/**
 * Returns a proxied URL for image sources that need server-side fetching,
 * or the original URL for sources that load fine in the browser directly.
 */
export function proxyImageUrl(src) {
  if (!src) return '';
  try {
    const { hostname } = new URL(src);
    if (PROXIED_IMAGE_HOSTS.has(hostname)) {
      return API_BASE + '/api/paintings/proxy-image?url=' + encodeURIComponent(src);
    }
  } catch { /* not a valid absolute URL - use as-is */ }
  return src;
}

export function apiFetch(path, options = {}) {
  return fetch(`${API_BASE}${path}`, { credentials: 'include', ...options });
}

export default API_BASE;
