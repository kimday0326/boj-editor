/**
 * Cloudflare Worker Proxy for Piston API
 * 
 * Functionality:
 * - Proxies requests from Chrome Extension to Piston API
 * - Implements IP-based rate limiting (10 requests/minute)
 * - Verifies chrome-extension:// origins
 * - Adds Authorization header with API key
 * - Handles CORS for Extension requests
 */

// In-memory rate limiting store: IP -> {count, resetAt}
const rateLimitStore = new Map();

// Configuration
const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 seconds
const PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute';

/**
 * Check if rate limit has been exceeded
 * @param {string} ip - Client IP address
 * @returns {boolean} - true if limit exceeded, false if allowed
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record) {
    // First request from this IP
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (now > record.resetAt) {
    // Window expired, reset counter
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  // Window still active
  record.count++;
  if (record.count > RATE_LIMIT_REQUESTS) {
    return true; // Limit exceeded
  }
  return false;
}

/**
 * Get client IP from request
 * @param {Request} request
 * @returns {string}
 */
function getClientIP(request) {
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  const xForwardedFor = request.headers.get('x-forwarded-for');
  
  if (cfConnectingIp) {
    return cfConnectingIp.split(',')[0].trim();
  }
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return '0.0.0.0';
}

/**
 * Verify request origin
 * @param {Request} request
 * @returns {boolean}
 */
function isValidOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  
  // Allow only chrome-extension:// origins
  return origin.startsWith('chrome-extension://');
}

/**
 * Create CORS headers for response
 * @param {string} origin - Request origin
 * @returns {object}
 */
function getCORSHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Handle OPTIONS preflight requests
 * @param {Request} request
 * @returns {Response}
 */
function handleOptions(request) {
  const origin = request.headers.get('origin');
  if (!isValidOrigin(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: getCORSHeaders(origin),
  });
}

/**
 * Main fetch handler
 * @param {Request} request
 * @param {object} env - Environment variables (PISTON_API_KEY)
 * @param {object} ctx - Cloudflare context
 * @returns {Response}
 */
export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    // Verify origin
    if (!isValidOrigin(request)) {
      return new Response(
        JSON.stringify({ error: 'Invalid origin' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const origin = request.headers.get('origin');
    const corsHeaders = getCORSHeaders(origin);

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Check rate limit
    const clientIP = getClientIP(request);
    if (checkRateLimit(clientIP)) {
      const record = rateLimitStore.get(clientIP);
      const retryAfter = Math.ceil((record.resetAt - Date.now()) / 1000);

      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            ...corsHeaders,
          },
        }
      );
    }

    try {
      // Parse request body
      const body = await request.json();

      // Build headers for Piston API
      const pistonHeaders = {
        'Content-Type': 'application/json',
      };

      // Add API key if available
      if (env.PISTON_API_KEY) {
        pistonHeaders['Authorization'] = env.PISTON_API_KEY;
      }

      // Forward request to Piston API
      const pistonResponse = await fetch(PISTON_API_URL, {
        method: 'POST',
        headers: pistonHeaders,
        body: JSON.stringify(body),
      });

      // Read response body
      const responseData = await pistonResponse.json();

      // Return proxied response with CORS headers
      return new Response(JSON.stringify(responseData), {
        status: pistonResponse.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    } catch (error) {
      console.error('Worker error:', error);

      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error.message,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }
  },
};
