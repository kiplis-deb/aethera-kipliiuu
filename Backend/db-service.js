/**
 * AETHERA UNIFIED DATABASE & AUTH SERVICE
 * 
 * Supports:
 * 1. Supabase PostgreSQL (Production / Cloud) via @supabase/supabase-js
 * 2. Local JSON file (Backend/db.json) (Local Development / Offline Fallback)
 * 
 * When SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY/SUPABASE_ANON_KEY)
 * are present in the environment (.env or Vercel Environment Variables),
 * this service automatically persists users, tokens, notes, and calendar events
 * into Supabase. Otherwise, it uses Backend/db.json seamlessly.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const DB_FILE = path.join(__dirname, 'db.json');

// Auto-load .env if not already loaded into process.env
function autoLoadEnv() {
  if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY)) return;
  const envCandidates = [path.join(__dirname, '.env'), path.join(ROOT_DIR, '.env')];
  for (const envPath of envCandidates) {
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
            if (!process.env[key]) process.env[key] = val;
          }
        });
      } catch (_) {}
    }
  }
}
autoLoadEnv();

// Node.js < 22 WebSocket compatibility stub for Supabase Realtime initialization
globalThis.WebSocket = globalThis.WebSocket || class WebSocketStub {};

// Initialize Supabase Client if credentials exist
let supabase = null;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false }
    });
    console.log(`[DB Service] Supabase active. Target: ${SUPABASE_URL}`);
  } catch (err) {
    console.warn('[DB Service] Supabase init failed, falling back to db.json:', err.message);
    supabase = null;
  }
} else {
  console.log('[DB Service] Running in Local Mode (db.json). Supabase env variables not detected.');
}

function isSupabaseEnabled() {
  return !!supabase;
}

function getSupabaseClient() {
  return supabase;
}

/* --------------------------------------------------------------------------
   LOCAL DB.JSON STORAGE (ROBUST READ / WRITE WITH ATOMIC RENAME)
   -------------------------------------------------------------------------- */
function getLocalDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = { users: {}, tokens: {} };
      try { fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8'); } catch (_) {}
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.users) parsed.users = {};
    if (!parsed.tokens) parsed.tokens = {};
    return parsed;
  } catch (err) {
    return { users: {}, tokens: {} };
  }
}

function saveLocalDB(data) {
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
    // In serverless environments (e.g. Vercel), the local filesystem is read-only.
    // Suppress warning to keep logs clean when Supabase handles persistence.
    if (!supabase) {
      console.warn('[DB Service] Local storage write warning:', err.message);
    }
  }
}

/* --------------------------------------------------------------------------
   PASSWORD CRYPTOGRAPHY (SALTED SCRYPT + TIMING-SAFE VERIFICATION)
   -------------------------------------------------------------------------- */
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, storedHash) {
  try {
    const computed = crypto.scryptSync(password, salt, 64);
    const stored = Buffer.from(storedHash, 'hex');
    return computed.length === stored.length && crypto.timingSafeEqual(computed, stored);
  } catch (e) {
    return false;
  }
}

/* --------------------------------------------------------------------------
   USER CRUD (SUPABASE WITH LOCAL FALLBACK)
   -------------------------------------------------------------------------- */
async function findUser(username) {
  if (!username) return null;
  const uname = String(username).trim().toLowerCase();

  // Try Supabase first if active
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('aethera_users')
        .select('*')
        .eq('username', uname)
        .maybeSingle();

      if (data && !error) {
        return {
          id: data.id,
          username: data.username,
          displayName: data.display_name || data.username,
          salt: data.salt,
          hash: data.hash,
          data: data.data || { calendar: [], chats: [], notes: [] },
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      }
    } catch (e) {
      console.warn('[DB Service] Supabase findUser fallback warning:', e.message);
    }
  }

  // Fallback to local DB
  const localDB = getLocalDB();
  return localDB.users[uname] || null;
}

async function saveUser(user) {
  if (!user || !user.username) return false;
  const uname = String(user.username).trim().toLowerCase();

  // Keep local DB updated for offline consistency
  const localDB = getLocalDB();
  localDB.users[uname] = user;
  saveLocalDB(localDB);

  // Sync to Supabase if active
  if (supabase) {
    try {
      const { error } = await supabase
        .from('aethera_users')
        .upsert({
          username: uname,
          id: user.id,
          display_name: user.displayName || uname,
          salt: user.salt,
          hash: user.hash,
          data: user.data || { calendar: [], chats: [], notes: [] },
          created_at: user.createdAt || new Date().toISOString(),
          updated_at: user.updatedAt || new Date().toISOString()
        });

      if (error) {
        console.error('[DB Service] Supabase saveUser error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.error('[DB Service] Supabase saveUser exception:', e.message);
      return false;
    }
  }

  return true;
}

/* --------------------------------------------------------------------------
   TOKEN CRUD (SUPABASE WITH LOCAL FALLBACK)
   -------------------------------------------------------------------------- */
async function findToken(token) {
  if (!token) return null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('aethera_tokens')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (data && !error) {
        return {
          token: data.token,
          username: data.username,
          createdAt: data.created_at
        };
      }
    } catch (e) {
      console.warn('[DB Service] Supabase findToken fallback warning:', e.message);
    }
  }

  const localDB = getLocalDB();
  const rec = localDB.tokens[token];
  if (!rec) return null;
  return {
    token,
    username: rec.username,
    createdAt: rec.createdAt
  };
}

async function saveToken(token, username) {
  if (!token || !username) return false;
  const uname = String(username).trim().toLowerCase();

  const localDB = getLocalDB();
  localDB.tokens[token] = { username: uname, createdAt: new Date().toISOString() };
  saveLocalDB(localDB);

  if (supabase) {
    try {
      const { error } = await supabase
        .from('aethera_tokens')
        .upsert({
          token,
          username: uname,
          created_at: new Date().toISOString()
        });
      if (error) console.error('[DB Service] Supabase saveToken error:', error.message);
    } catch (e) {
      console.error('[DB Service] Supabase saveToken exception:', e.message);
    }
  }
  return true;
}

async function deleteToken(token) {
  if (!token) return false;

  const localDB = getLocalDB();
  if (localDB.tokens && localDB.tokens[token]) {
    delete localDB.tokens[token];
    saveLocalDB(localDB);
  }

  if (supabase) {
    try {
      const { error } = await supabase
        .from('aethera_tokens')
        .delete()
        .eq('token', token);
      if (error) console.warn('[DB Service] Supabase deleteToken error:', error.message);
    } catch (e) {
      console.warn('[DB Service] Supabase deleteToken exception:', e.message);
    }
  }
  return true;
}

/* --------------------------------------------------------------------------
   SESSION AUTH RESOLVER
   -------------------------------------------------------------------------- */
async function getAuthUser(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return null;

  const tokenRec = await findToken(token);
  if (!tokenRec || !tokenRec.username) return null;

  const userRec = await findUser(tokenRec.username);
  if (!userRec) return null;

  return { username: tokenRec.username, user: userRec, token };
}

module.exports = {
  isSupabaseEnabled,
  getSupabaseClient,
  getLocalDB,
  saveLocalDB,
  hashPassword,
  verifyPassword,
  findUser,
  saveUser,
  findToken,
  saveToken,
  deleteToken,
  getAuthUser
};
