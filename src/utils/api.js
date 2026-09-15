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
 */
const PROXIED_IMAGE_HOSTS = new Set([
  'www.artic.edu',
  'images.metmuseum.org',
  'api.nga.gov',
  'i.pinimg.com',
  'artallin.com',
  'mdl.artvee.com',
  'cdn.dribbble.com',
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

// Simple in-memory cache for API responses
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Cached fetch with automatic cache invalidation
 */
export async function cachedFetch(url, options = {}) {
  const cacheKey = url + JSON.stringify(options);
  const cached = apiCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const response = await fetch(url, options);
  const data = await response.json();
  
  apiCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  return data;
}

/**
 * Debounce function to limit how often a function can be called
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Clear all cached data
 */
export function clearApiCache() {
  apiCache.clear();
}

export default API_BASE;
