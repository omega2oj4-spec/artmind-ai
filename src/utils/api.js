/**
 * Base URL for all API requests.
 *
 * DEVELOPMENT:
 * Empty string means Vite handles /api requests through
 * the proxy configured in vite.config.js.
 *
 * PRODUCTION:
 * Uses VITE_API_URL if it exists.
 * Otherwise, uses the Render backend URL.
 */

const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://artmind-ai-1.onrender.com'
    : '');

/**
 * Image hosts that may block direct browser requests.
 *
 * These images are fetched through the ArtMind backend
 * image proxy instead.
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

  // Europeana
  'iiif.europeana.eu',
  'europeana-images.s3.amazonaws.com',
  'api.europeana.eu',
]);

/**
 * Returns a backend-proxied URL for image sources
 * that cannot be loaded directly by the browser.
 *
 * Local images such as:
 * /artworks/sunflowers.jpg
 *
 * are returned unchanged.
 */
export function proxyImageUrl(src) {
  if (!src) return '';

  try {
    const { hostname } = new URL(src);

    if (PROXIED_IMAGE_HOSTS.has(hostname)) {
      return (
        API_BASE +
        '/api/paintings/proxy-image?url=' +
        encodeURIComponent(src)
      );
    }
  } catch {
    // Not an absolute URL.
    // Return local paths unchanged.
  }

  return src;
}

/**
 * Make an API request.
 *
 * In localhost development:
 *
 *   /api/auth/register
 *
 * is sent to Vite, which proxies it to:
 *
 *   http://127.0.0.1:5000
 *
 * In production:
 *
 *   https://artmind-ai-1.onrender.com/api/...
 */
export function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;

  console.log('[ArtMind API Request]', {
    method: options.method || 'GET',
    url,
  });

  return fetch(url, {
    credentials: 'include',
    ...options,
  });
}

export default API_BASE;
