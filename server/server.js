/**
 * AETHERA AI PROXY & APPLICATION SERVER
 * Lightweight, zero-dependency Node.js HTTP server.
 * Proxies Google Gemini API calls using the server-side GEMINI_API_KEY (.env)
 * so the API key remains strictly on the backend and is never exposed to the client.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.resolve(__dirname, '..');
const DB_FILE = path.join(__dirname, 'db.json');

// Discover LAN IPv4 address for multi-device network testing
function getLocalNetworkIp() {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch (e) {}
  return '127.0.0.1';
}

// Load environment variables from .env file if present
function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.substring(0, idx).trim();
          let val = trimmed.substring(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
      console.log('[Server] Loaded environment variables from .env');
    } catch (e) {
      console.warn('[Server] Could not parse .env:', e.message);
    }
  }
}
loadEnv();

// Standard MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav'
};

function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Private-Network': 'true'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) { // 25MB limit for multimodal payloads
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

/* --------------------------------------------------------------------------
   SECURE JSON USER DATABASE & CROSS-DEVICE AUTH ENGINE
   -------------------------------------------------------------------------- */
function getDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = { users: {}, tokens: {} };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.users) parsed.users = {};
    if (!parsed.tokens) parsed.tokens = {};
    return parsed;
  } catch (err) {
    console.error('[DB] Read error:', err.message);
    return { users: {}, tokens: {} };
  }
}

function saveDB(data) {
  try {
    const tmp = DB_FILE + '.tmp.' + Date.now();
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    try {
      fs.renameSync(tmp, DB_FILE);
    } catch {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
      try { fs.unlinkSync(tmp); } catch (_) {}
    }
  } catch (err) {
    console.error('[DB] Save error:', err.message);
  }
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, storedHash) {
  const computed = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(storedHash, 'hex');
  return computed.length === stored.length && crypto.timingSafeEqual(computed, stored);
}

function getAuthUser(req, db) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token || !db.tokens[token]) return null;
  const username = db.tokens[token].username;
  if (!username || !db.users[username]) return null;
  return { username, user: db.users[username], token };
}

/* --------------------------------------------------------------------------
   GEMINI AI SECURE BACKEND PROXY
   Keeps the API key safely on the server and attaches it to outbound calls.
   -------------------------------------------------------------------------- */
const GEMINI_MODELS_CHAIN = [
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-flash-latest'
];

function resolveGeminiModel(requestedModel) {
  if (!requestedModel || typeof requestedModel !== 'string') {
    return 'gemini-3.6-flash';
  }
  const m = requestedModel.toLowerCase().trim();
  if (m === 'gemini-2.5-flash' || m.includes('2.0') || m.includes('1.5')) {
    return 'gemini-3.6-flash';
  }
  return requestedModel.trim();
}

function getNextFallbackModel(currentModel, triedModels = []) {
  const tried = Array.isArray(triedModels) ? triedModels : [triedModels];
  for (const m of GEMINI_MODELS_CHAIN) {
    if (m !== currentModel && !tried.includes(m)) {
      return m;
    }
  }
  return null;
}

function proxyGeminiGenerate(req, res, payload, attemptModel = null) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  if (!apiKey) {
    return sendJSON(res, 503, {
      error: { message: 'No Gemini API key configured on server. Set GEMINI_API_KEY in .env.' }
    });
  }

  const model = attemptModel || resolveGeminiModel(payload.model);
  const postData = JSON.stringify({
    contents: payload.contents || [],
    systemInstruction: payload.systemInstruction || payload.system_instruction,
    generationConfig: payload.generationConfig,
    safetySettings: payload.safetySettings
  });

  const urlObj = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`);

  const options = {
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let responseData = '';
    proxyRes.on('data', chunk => responseData += chunk);
    proxyRes.on('end', () => {
      // If 429 Quota Exceeded on this model, failover to next model
      if (proxyRes.statusCode === 429) {
        const nextModel = getNextFallbackModel(model);
        if (nextModel) {
          console.log(`[Proxy] Model ${model} hit 429 rate limit. Failing over to ${nextModel}...`);
          return proxyGeminiGenerate(req, res, payload, nextModel);
        }
      }

      try {
        const json = JSON.parse(responseData);
        return sendJSON(res, proxyRes.statusCode, json);
      } catch (e) {
        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(responseData);
      }
    });
  });

  proxyReq.on('error', (err) => {
    console.error('[Gemini Proxy Error]', err.message);
    return sendJSON(res, 502, { error: { message: `Backend proxy connection failed: ${err.message}` } });
  });

  proxyReq.write(postData);
  proxyReq.end();
}

function proxyGeminiStream(req, res, payload, attemptModel = null) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  if (!apiKey) {
    res.writeHead(503, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('data: {"error": {"message": "No Gemini API key configured on server. Set GEMINI_API_KEY in .env."}}\n\n');
    res.end();
    return;
  }

  const model = attemptModel || resolveGeminiModel(payload.model);
  const postData = JSON.stringify({
    contents: payload.contents || [],
    systemInstruction: payload.systemInstruction || payload.system_instruction,
    generationConfig: payload.generationConfig,
    safetySettings: payload.safetySettings
  });

  const urlObj = new URL(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`);

  const options = {
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    if (proxyRes.statusCode === 429) {
      const nextModel = getNextFallbackModel(model);
      if (nextModel) {
        console.log(`[Stream Proxy] Model ${model} hit 429 rate limit. Failing over to ${nextModel}...`);
        return proxyGeminiStream(req, res, payload, nextModel);
      }
    }

    if (proxyRes.statusCode < 200 || proxyRes.statusCode >= 300) {
      let errBody = '';
      proxyRes.on('data', chunk => errBody += chunk);
      proxyRes.on('end', () => {
        try {
          const errJson = JSON.parse(errBody);
          return sendJSON(res, proxyRes.statusCode, errJson);
        } catch (_) {
          return sendJSON(res, proxyRes.statusCode, { error: { message: errBody || `Google API error ${proxyRes.statusCode}` } });
        }
      });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });

    proxyRes.on('data', chunk => {
      res.write(chunk);
    });
    proxyRes.on('end', () => {
      res.end();
    });
  });

  proxyReq.on('error', (err) => {
    console.error('[Gemini Stream Proxy Error]', err.message);
    if (!res.headersSent) {
      sendJSON(res, 502, { error: { message: `Backend stream proxy failed: ${err.message}` } });
    } else {
      res.end();
    }
  });

  proxyReq.write(postData);
  proxyReq.end();
}

/* --------------------------------------------------------------------------
   YOUTUBE MUSIC SEARCH ENGINE (ACTUAL ARTIST PRIORITIZATION)
   -------------------------------------------------------------------------- */
async function resolveCanonicalArtist(query) {
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=5`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return {
          title: data.results[0].trackName,
          artist: data.results[0].artistName,
          artwork: data.results[0].artworkUrl100 ? data.results[0].artworkUrl100.replace('100x100bb', '500x500bb') : null
        };
      }
    }
  } catch (e) {
    console.warn('[Music Artist Resolver Note]', e.message);
  }
  return null;
}

function scoreTrackCandidate(candidate, expectedArtist, expectedTitle) {
  let score = 0;
  const cArtist = (candidate.artist || '').toLowerCase();
  const cTitle = (candidate.title || '').toLowerCase();
  const expArtistLower = (expectedArtist || '').toLowerCase();
  const expTitleLower = (expectedTitle || '').toLowerCase();

  const artistWords = expArtistLower.split(/[\s,&+]+/).filter(w => w.length > 2);
  const titleWords = expTitleLower.split(/[\s,&+]+/).filter(w => w.length > 2);

  // 1. Actual Artist Match (Crucial)
  if (expArtistLower) {
    const matchesArtistName = artistWords.some(w => cArtist.includes(w)) || cArtist.includes(expArtistLower);
    const titleMentionsArtist = artistWords.some(w => cTitle.includes(w));

    if (matchesArtistName) {
      score += 120;
    } else if (titleMentionsArtist) {
      score += 85;
    } else {
      // Different artist / cover artist -> massive penalty!
      score -= 100;
    }
  }

  // 2. Title Match
  if (expTitleLower) {
    if (cTitle.includes(expTitleLower)) {
      score += 50;
    } else {
      const matchedWords = titleWords.filter(w => cTitle.includes(w)).length;
      score += matchedWords * 15;
    }
  }

  // 3. Official Release / Audio Quality Boost
  if (/official (audio|music video|video)/i.test(cTitle)) score += 30;
  if (/remaster(ed)?/i.test(cTitle)) score += 15;
  if (/- topic$/i.test(cArtist) || /vevo$/i.test(cArtist)) score += 25; // Official Artist Topic / VEVO

  // 4. Heavy Penalties for Covers / Flashmobs / Parodies / Karaoke
  if (/\b(cover|tribute|karaoke|instrumental|reaction|flashmob|parody|acoustic cover)\b/i.test(cTitle)) score -= 85;
  if (/\b(live)\b/i.test(cTitle)) score -= 20;

  return score;
}

function cleanYtmArtist(subtitle) {
  if (!subtitle) return 'YouTube Music';
  let clean = subtitle.replace(/^(Song|Video)\s*•\s*/i, '');
  clean = clean.replace(/\s*•\s*[\d\.]+[KMB]?\s*views.*$/i, '');
  clean = clean.replace(/\s*•\s*\d+:\d+.*$/i, '');
  return clean.trim() || 'YouTube Music';
}

async function searchYouTubeMusic(query) {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return { success: false, error: 'Empty query' };
  }

  // 1. Direct YouTube or YouTube Music URL or 11-char Video ID
  const directIdMatch = trimmed.match(/(?:(?:music\.)?youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|^)([a-zA-Z0-9_-]{11})(?:[&?]|$)/);
  if (directIdMatch && directIdMatch[1]) {
    const directId = directIdMatch[1];
    return {
      success: true,
      videoId: directId,
      title: 'YouTube Music Track',
      artist: 'YouTube Music',
      thumbnail: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
      alternates: [],
      source: 'YouTube Music'
    };
  }

  const cleanQuery = trimmed
    .replace(/^(can\s+you\s+)?(please\s+)?(i\s+want\s+to\s+listen\s+to|i\s+want\s+to\s+hear|listen\s+to|put\s+on|play\s+me|play\s+a\s+music|play\s+music|play\s+the\s+song|play\s+song|play)\s+/i, '')
    .replace(/\s+(please|for\s+me)$/i, '')
    .trim();

  // 2. Resolve Canonical Actual Artist & Track Title
  const canonical = await resolveCanonicalArtist(cleanQuery);
  const expectedArtist = canonical?.artist || '';
  const expectedTitle = canonical?.title || cleanQuery;
  const searchTarget = expectedArtist ? `${expectedArtist} - ${expectedTitle}` : cleanQuery;

  const candidates = [];

  // 3. Query Official YouTube Music Innertube API (WEB_REMIX Client)
  try {
    const ytmRes = await fetch('https://music.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB_REMIX',
            clientVersion: '1.20231204.01.00',
            hl: 'en',
            gl: 'US'
          }
        },
        query: searchTarget
      })
    });

    if (ytmRes.ok) {
      const data = await ytmRes.json();

      function walk(obj) {
        if (!obj || typeof obj !== 'object') return;

        // Check Top Result Card (musicCardShelfRenderer)
        if (obj.musicCardShelfRenderer) {
          const shelf = obj.musicCardShelfRenderer;
          const title = shelf.title?.runs?.[0]?.text;
          const subtitle = shelf.subtitle?.runs?.map(r => r.text).join('') || '';
          const videoId = shelf.title?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId ||
                          shelf.onTap?.watchEndpoint?.videoId ||
                          shelf.buttons?.[0]?.menuRenderer?.topLevelButtons?.[0]?.likeButtonRenderer?.target?.videoId;
          const thumb = shelf.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url;
          if (videoId && title) {
            candidates.push({
              videoId,
              title: title.trim(),
              artist: cleanYtmArtist(subtitle),
              thumbnail: thumb || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              source: 'YouTube Music'
            });
          }
        }

        // Check Item List (musicResponsiveListItemRenderer)
        if (obj.musicResponsiveListItemRenderer) {
          const item = obj.musicResponsiveListItemRenderer;
          const flexCols = item.flexColumns || [];
          const title = flexCols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
          const subtitle = flexCols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.map(r => r.text).join('') || '';
          const videoId = item.playlistItemData?.videoId || item.navigationEndpoint?.watchEndpoint?.videoId;
          const thumb = item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url;

          if (videoId && title) {
            candidates.push({
              videoId,
              title: title.trim(),
              artist: cleanYtmArtist(subtitle),
              thumbnail: thumb || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              source: 'YouTube Music'
            });
          }
        }

        for (const k of Object.keys(obj)) {
          walk(obj[k]);
        }
      }

      walk(data);
    }
  } catch (err) {
    console.warn('[YTM Search Note]', err.message);
  }

  // 4. Query YouTube Search with Official Audio targeting the Actual Artist
  try {
    const ytQuery = `${searchTarget} official audio`;
    const ytRes = await fetch('https://www.youtube.com/results?search_query=' + encodeURIComponent(ytQuery), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    const html = await ytRes.text();
    const dataMatch = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/window\["ytInitialData"\] = ({.*?});<\/script>/s);

    if (dataMatch) {
      const ytData = JSON.parse(dataMatch[1]);
      function walkYt(o) {
        if (!o || typeof o !== 'object') return;
        if (o.videoRenderer) {
          const v = o.videoRenderer;
          const vid = v.videoId;
          const t = v.title?.runs?.[0]?.text;
          const owner = v.ownerText?.runs?.[0]?.text;
          const thumb = v.thumbnail?.thumbnails?.[0]?.url;
          if (vid && t) {
            candidates.push({
              videoId: vid,
              title: t.trim(),
              artist: owner || 'YouTube Music',
              thumbnail: thumb || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              source: 'YouTube Music'
            });
          }
        }
        for (const k of Object.keys(o)) walkYt(o[k]);
      }
      walkYt(ytData);
    } else {
      // Regex fallback
      const idMatch = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
      const titleMatch = html.match(/"title":\{"runs":\[\{"text":"([^"]+)"/);
      const ownerMatch = html.match(/"ownerText":\{"runs":\[\{"text":"([^"]+)"/);
      if (idMatch && idMatch[1]) {
        candidates.push({
          videoId: idMatch[1],
          title: titleMatch ? titleMatch[1] : searchTarget,
          artist: ownerMatch ? ownerMatch[1] : expectedArtist || 'YouTube Music',
          thumbnail: `https://i.ytimg.com/vi/${idMatch[1]}/hqdefault.jpg`,
          source: 'YouTube Music'
        });
      }
    }
  } catch (searchErr) {
    console.error('[Music Fallback Search Error]', searchErr.message);
  }

  // 5. Score & Prioritize Candidates matching the Actual Artist
  if (candidates.length > 0) {
    const scored = candidates.map(c => ({
      ...c,
      score: scoreTrackCandidate(c, expectedArtist, expectedTitle)
    })).sort((a, b) => b.score - a.score);

    const best = scored[0];
    const alternates = [...new Set(scored.slice(1).map(c => c.videoId))].slice(0, 5);

    const finalArtist = expectedArtist
      ? expectedArtist
      : (best.artist && best.artist !== 'YouTube Music' ? best.artist : 'YouTube Music');

    const finalTitle = canonical?.title || best.title.replace(/\s*(\(|\[)(Official Video|Official Audio|Official Music Video|HQ|Audio|Video|Lyrics|Lyric Video)(\)|\])/gi, '').trim();

    return {
      success: true,
      videoId: best.videoId,
      title: finalTitle,
      artist: `${finalArtist} • YouTube Music`,
      thumbnail: canonical?.artwork || best.thumbnail || `https://i.ytimg.com/vi/${best.videoId}/hqdefault.jpg`,
      alternates: alternates,
      source: 'YouTube Music'
    };
  }

  return { success: false, error: 'Track not found' };
}

async function getRelatedYouTubeMusic(videoId, title = '', artist = '') {
  const relatedTracks = [];

  // 1. Try YouTube Music Radio next endpoint (RDAMVM + videoId)
  if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    try {
      const ytmRes = await fetch('https://music.youtube.com/youtubei/v1/next', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        body: JSON.stringify({
          context: {
            client: { clientName: 'WEB_REMIX', clientVersion: '1.20231204.01.00', hl: 'en', gl: 'US' }
          },
          videoId: videoId,
          playlistId: 'RDAMVM' + videoId
        })
      });

      if (ytmRes.ok) {
        const data = await ytmRes.json();
        function walk(o) {
          if (!o || typeof o !== 'object') return;
          if (o.playlistPanelVideoRenderer) {
            const r = o.playlistPanelVideoRenderer;
            const vid = r.videoId;
            const t = r.title?.runs?.[0]?.text;
            const a = r.shortBylineText?.runs?.[0]?.text || r.longBylineText?.runs?.[0]?.text;
            const thumb = r.thumbnail?.thumbnails?.[0]?.url;
            if (vid && t && vid !== videoId) {
              if (!relatedTracks.some(trk => trk.videoId === vid)) {
                relatedTracks.push({
                  videoId: vid,
                  title: t.trim(),
                  artist: cleanYtmArtist(a),
                  thumbnail: thumb || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
                  source: 'YouTube Music'
                });
              }
            }
          }
          for (const k of Object.keys(o)) walk(o[k]);
        }
        walk(data);
      }
    } catch (err) {
      console.warn('[YTM Related Note]', err.message);
    }
  }

  // 2. If we found related tracks from YouTube Music Radio, return them!
  if (relatedTracks.length > 0) {
    return {
      success: true,
      match: relatedTracks[0],
      related: relatedTracks.slice(0, 10)
    };
  }

  // 3. Fallback: Search for other tracks by same artist or title
  const fallbackQuery = (artist && artist !== 'YouTube Music' ? artist : title).trim();
  if (fallbackQuery) {
    try {
      const searchResult = await searchYouTubeMusic(fallbackQuery + ' songs');
      if (searchResult && searchResult.success && searchResult.videoId !== videoId) {
        return {
          success: true,
          match: searchResult,
          related: [searchResult]
        };
      }
    } catch (err) {
      console.warn('[YTM Fallback Related Note]', err.message);
    }
  }

  return { success: false, error: 'No related tracks found' };
}

/* --------------------------------------------------------------------------
   HTTP SERVER & ROUTER
   -------------------------------------------------------------------------- */
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Private-Network': 'true'
    });
    res.end();
    return;
  }

  /* --- API ROUTES --- */
  if (pathname.startsWith('/api/')) {
    try {
      // 1. Config: Check AI Engine Status (NEVER leaks raw key to client)
      if (pathname === '/api/config/ai-key' && req.method === 'GET') {
        const envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
        return sendJSON(res, 200, {
          hasKey: !!envKey,
          serverConfigured: !!envKey,
          model: 'gemini-3.6-flash'
        });
      }

      // 2. Config: Save/Update AI API Key in .env and server process
      if (pathname === '/api/config/ai-key' && req.method === 'POST') {
        const body = await parseBody(req);
        let rawKey = body.key || '';
        if (typeof rawKey === 'string') {
          rawKey = rawKey.trim().replace(/^["'`]+|["'`]+$/g, '').trim();
          process.env.GEMINI_API_KEY = rawKey;
          try {
            const envPath = path.join(ROOT_DIR, '.env');
            let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
            if (/^GEMINI_API_KEY=.*$/m.test(envContent)) {
              envContent = envContent.replace(/^GEMINI_API_KEY=.*$/m, `GEMINI_API_KEY=${rawKey}`);
            } else {
              envContent += (envContent.endsWith('\n') || !envContent ? '' : '\n') + `GEMINI_API_KEY=${rawKey}\n`;
            }
            fs.writeFileSync(envPath, envContent, 'utf8');
            console.log('[Server] Saved GEMINI_API_KEY to .env');
          } catch (e) {
            console.warn('[Server] Could not write to .env:', e.message);
          }
          return sendJSON(res, 200, { success: true, saved: true, hasKey: !!rawKey });
        }
        return sendJSON(res, 400, { error: 'Invalid key payload' });
      }

      // 3. AI Proxy: Generate Content (Server-Side Inference)
      if (pathname === '/api/ai/generate' && req.method === 'POST') {
        const body = await parseBody(req);
        return proxyGeminiGenerate(req, res, body);
      }

      // 4. AI Proxy: Stream Generate Content (Server-Side SSE Stream)
      if (pathname === '/api/ai/stream' && req.method === 'POST') {
        const body = await parseBody(req);
        return proxyGeminiStream(req, res, body);
      }

      // 5. Auth: Register (No demo accounts, creates real salted scrypt user)
      if (pathname === '/api/auth/register' && req.method === 'POST') {
        const body = await parseBody(req);
        const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
          return sendJSON(res, 400, { error: 'Username must be 3-30 alphanumeric characters.' });
        }
        if (password.length < 6) {
          return sendJSON(res, 400, { error: 'Password must be at least 6 characters long.' });
        }
        const db = getDB();
        if (db.users[username]) {
          return sendJSON(res, 409, { error: 'Username is already registered.' });
        }
        const { salt, hash } = hashPassword(password);
        const token = 'tok_' + crypto.randomBytes(24).toString('hex');
        const newUser = {
          id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          username,
          displayName: body.displayName ? String(body.displayName).trim() : username,
          salt,
          hash,
          data: { calendar: [], chats: [] },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        db.users[username] = newUser;
        db.tokens[token] = { username, createdAt: new Date().toISOString() };
        saveDB(db);
        return sendJSON(res, 201, {
          success: true,
          token,
          user: { id: newUser.id, username: newUser.username, displayName: newUser.displayName }
        });
      }

      // 6. Auth: Login (Verifies salted scrypt hash with timing-safe check)
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const body = await parseBody(req);
        const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        if (!username || !password) {
          return sendJSON(res, 400, { error: 'Username and password required.' });
        }
        const db = getDB();
        const user = db.users[username];
        if (!user || !verifyPassword(password, user.salt, user.hash)) {
          return sendJSON(res, 401, { error: 'Invalid username or password.' });
        }
        const token = 'tok_' + crypto.randomBytes(24).toString('hex');
        db.tokens[token] = { username, createdAt: new Date().toISOString() };
        saveDB(db);
        return sendJSON(res, 200, {
          success: true,
          token,
          user: { id: user.id, username: user.username, displayName: user.displayName || user.username }
        });
      }

      // 7. Auth: Get Current Session Profile
      if (pathname === '/api/auth/me' && req.method === 'GET') {
        const db = getDB();
        const auth = getAuthUser(req, db);
        if (!auth) return sendJSON(res, 401, { error: 'Unauthorized.' });
        return sendJSON(res, 200, {
          user: { id: auth.user.id, username: auth.username, displayName: auth.user.displayName || auth.username }
        });
      }

      // 8. Auth: Logout
      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        const db = getDB();
        const header = req.headers['authorization'] || '';
        const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
        if (token && db.tokens[token]) {
          delete db.tokens[token];
          saveDB(db);
        }
        return sendJSON(res, 200, { success: true });
      }

      // 9. Cross-Device Sync: Fetch User Data (Calendar & Chats)
      if (pathname === '/api/user/data' && req.method === 'GET') {
        const db = getDB();
        const auth = getAuthUser(req, db);
        if (!auth) return sendJSON(res, 401, { error: 'Unauthorized. Log in to sync.' });
        return sendJSON(res, 200, {
          calendar: auth.user.data?.calendar || [],
          chats: auth.user.data?.chats || [],
          updatedAt: auth.user.updatedAt || auth.user.createdAt
        });
      }

      // 10. Cross-Device Sync: Save / Update User Data
      if (pathname === '/api/user/data' && req.method === 'POST') {
        const db = getDB();
        const auth = getAuthUser(req, db);
        if (!auth) return sendJSON(res, 401, { error: 'Unauthorized. Log in to sync.' });
        const body = await parseBody(req);
        if (!auth.user.data) auth.user.data = { calendar: [], chats: [] };
        if (Array.isArray(body.calendar)) auth.user.data.calendar = body.calendar;
        if (Array.isArray(body.chats)) auth.user.data.chats = body.chats;
        auth.user.updatedAt = new Date().toISOString();
        saveDB(db);
        return sendJSON(res, 200, { success: true, updatedAt: auth.user.updatedAt });
      }

      // 11. Full-Length Music Search (Full Song from Beginning to End via YouTube Music)
      if (pathname === '/api/music/search' && req.method === 'GET') {
        const query = (parsedUrl.query && parsedUrl.query.q) || '';
        if (!query.trim()) {
          return sendJSON(res, 400, { error: 'Missing query parameter q' });
        }
        const result = await searchYouTubeMusic(query.trim());
        if (result && result.success) {
          return sendJSON(res, 200, result);
        }
        return sendJSON(res, 404, { success: false, error: result ? result.error : 'Track not found' });
      }

      // 12. Music Autoplay Matching (Find matching song based on last played song)
      if (pathname === '/api/music/related' && req.method === 'GET') {
        const videoId = (parsedUrl.query && parsedUrl.query.videoId) || '';
        const title = (parsedUrl.query && parsedUrl.query.title) || '';
        const artist = (parsedUrl.query && parsedUrl.query.artist) || '';
        if (!videoId && !title && !artist) {
          return sendJSON(res, 400, { error: 'Missing videoId, title, or artist query parameters' });
        }
        const result = await getRelatedYouTubeMusic(videoId, title, artist);
        if (result && result.success) {
          return sendJSON(res, 200, result);
        }
        return sendJSON(res, 404, { success: false, error: result ? result.error : 'No matching tracks found' });
      }

      // Route Not Found
      return sendJSON(res, 404, { error: `Endpoint ${req.method} ${pathname} not found.` });
    } catch (apiErr) {
      console.error('[API Error]', apiErr);
      return sendJSON(res, 500, { error: apiErr.message || 'Internal Server Error' });
    }
  }

  /* --- STATIC FILE SERVER --- */
  let relativePath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
  const normalizedLower = safePath.toLowerCase().replace(/\\/g, '/');
  const cleanPath = normalizedLower.replace(/^[\/\\]+/, '');

  // Block sensitive files and server directories
  const isBlocked =
    cleanPath.startsWith('.') ||
    cleanPath.includes('/.') ||
    cleanPath === '.env' ||
    cleanPath.endsWith('.env') ||
    cleanPath.endsWith('db.json') ||
    cleanPath.startsWith('server/') ||
    cleanPath.startsWith('scratch/');

  if (isBlocked) {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: '403 Forbidden: Access to protected file is restricted.' }));
    return;
  }

  let filePath = path.join(ROOT_DIR, safePath);

  // Clean extensionless URLs (e.g. /ai -> /ai.html, /calendar -> /calendar.html)
  let targetFile = filePath;
  try {
    if (!fs.existsSync(targetFile) || fs.statSync(targetFile).isDirectory()) {
      if (fs.existsSync(filePath + '.html')) {
        targetFile = filePath + '.html';
      } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
        targetFile = path.join(filePath, 'index.html');
      }
    }
  } catch (e) {
    targetFile = filePath;
  }

  fs.stat(targetFile, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(targetFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Private-Network': 'true'
    });

    const stream = fs.createReadStream(targetFile);
    stream.pipe(res);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[Aethera Server] Port ${PORT} is already in use.`);
    process.exit(0);
  } else {
    console.error('[Aethera Server Error]', err);
    process.exit(1);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const lanIp = getLocalNetworkIp();
  const hasKey = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  console.log('====================================================');
  console.log(`⚡ Aethera AI Server is RUNNING`);
  console.log(`🌐 Local Web:         http://localhost:${PORT}`);
  console.log(`🌐 LAN Multi-Device:  http://${lanIp}:${PORT}`);
  console.log(`🔑 AI Key Configured: ${hasKey ? 'YES (Loaded from .env securely)' : 'NO'}`);
  console.log('====================================================');
});
