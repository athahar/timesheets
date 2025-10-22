/**
 * TrackPay Marketing Waitlist - Netlify Function
 *
 * Handles waitlist signups with Supabase storage
 * Captures: email, name, language, UTM params, IP, user-agent, geolocation
 *
 * @version 2.0.0
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * CORS helper - returns Response with proper headers
 */
function corsResponse(json, status = 200) {
  return new Response(JSON.stringify(json), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
  });
}

/**
 * Fetch with timeout (prevents slow geolocation from blocking form submit)
 */
async function fetchWithTimeout(url, opts = {}, ms = 1500) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { ...opts, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Main handler
 */
export default async (req) => {
  // Handle preflight CORS
  if (req.method === 'OPTIONS') {
    return corsResponse({ ok: true });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return corsResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // Verify Supabase config
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return corsResponse({ error: 'Server configuration error' }, 500);
    }

    // Initialize Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request body
    const body = await req.json();
    const {
      email,
      name = null,
      language = 'en',
      utm_source = null,
      utm_campaign = null
    } = body || {};

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return corsResponse({ error: 'Invalid email address' }, 400);
    }

    // Capture request metadata
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('client-ip')
      || null;
    const user_agent = req.headers.get('user-agent') || null;

    // Optional GeoIP enrichment (best-effort, won't slow down form)
    let geo = {};
    if (ip) {
      try {
        const geoResponse = await fetchWithTimeout(
          `https://ipwho.is/${encodeURIComponent(ip)}`,
          {},
          1500
        );
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (geoData && geoData.success !== false) {
            geo = {
              country: geoData.country || null,
              country_code: geoData.country_code || null,
              region: geoData.region || null,
              city: geoData.city || null,
              latitude: typeof geoData.latitude === 'number' ? geoData.latitude : null,
              longitude: typeof geoData.longitude === 'number' ? geoData.longitude : null,
              timezone: (geoData.timezone && geoData.timezone.id) || geoData.timezone || null
            };
          }
        }
      } catch (err) {
        // Swallow geo errors - form submission should always succeed
        console.log('Geolocation lookup failed (non-critical):', err.message);
      }
    }

    // Insert into Supabase (upsert to handle duplicates gracefully)
    const { error } = await supabase
      .from('marketing_waitlist')
      .upsert(
        {
          email: email.toLowerCase().trim(),
          name,
          language,
          utm_source,
          utm_campaign,
          ip,
          user_agent,
          ...geo
        },
        { onConflict: 'email' }
      );

    if (error) {
      console.error('Supabase error:', error);
      return corsResponse({ error: error.message }, 400);
    }

    // Success
    return corsResponse({ ok: true });

  } catch (err) {
    console.error('Unexpected error:', err);
    return corsResponse({ error: err.message || 'Unexpected error' }, 500);
  }
};
