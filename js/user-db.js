/**
 * AETHERA CLIENT DATABASE & CROSS-DEVICE SYNC ENGINE
 * Lightweight local storage manager with automatic multi-device cloud sync.
 * Handles calendar events, AI chats, and secure session management.
 */

class AetheraClientDB {
  constructor() {
    this.tokenKey = 'aethera_auth_token';
    this.userKey = 'aethera_auth_user';

    // Clean up unpartitioned legacy keys so data from other sessions never leaks
    try {
      localStorage.removeItem('aethera_calendar_events_v1');
      localStorage.removeItem('aethera_saved_chats_v1');
    } catch (_) {}

    this.token = typeof localStorage !== 'undefined' ? localStorage.getItem(this.tokenKey) : null;
    this.currentUser = this._loadUser();
    this.isSyncing = false;

    if (typeof window !== 'undefined') {
      // Sync on load
      this.syncFromServer();
      // Render navbar auth widget on DOM load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.renderNavAuth());
      } else {
        this.renderNavAuth();
      }
    }
  }

  get calendarKey() {
    const uid = (this.token && this.currentUser?.username) ? this.currentUser.username : 'guest';
    return `aethera_calendar_${uid}`;
  }

  get chatsKey() {
    const uid = (this.token && this.currentUser?.username) ? this.currentUser.username : 'guest';
    return `aethera_chats_${uid}`;
  }

  _loadUser() {
    try {
      const raw = localStorage.getItem(this.userKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async ready() {
    return Promise.resolve(true);
  }

  isLoggedIn() {
    return !!this.token;
  }

  getUser() {
    return this.currentUser;
  }

  setSession(token, user) {
    this.token = token;
    this.currentUser = user;
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.syncFromServer();
    this.renderNavAuth();
    window.dispatchEvent(new CustomEvent('aethera:auth-change', { detail: { user, isLoggedIn: true } }));
  }

  async logout() {
    if (this.token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
      } catch (_) {}
    }
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.renderNavAuth();
    window.dispatchEvent(new CustomEvent('aethera:auth-change', { detail: { user: null, isLoggedIn: false } }));
    window.location.reload();
  }

  /* --------------------------------------------------------------------------
     CROSS-DEVICE SYNC
     -------------------------------------------------------------------------- */
  async syncFromServer() {
    if (!this.token || this.isSyncing) return;
    this.isSyncing = true;
    try {
      const res = await fetch('/api/user/data', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (res.status === 401) {
        // Token expired or invalid
        this.token = null;
        this.currentUser = null;
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
        this.renderNavAuth();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.calendar)) {
          localStorage.setItem(this.calendarKey, JSON.stringify(data.calendar));
          window.dispatchEvent(new CustomEvent('aethera:calendar-synced', { detail: data.calendar }));
        }
        if (Array.isArray(data.chats)) {
          localStorage.setItem(this.chatsKey, JSON.stringify(data.chats));
          window.dispatchEvent(new CustomEvent('aethera:chats-synced', { detail: data.chats }));
        }
      }
    } catch (e) {
      console.warn('[AetheraDB] Sync notice:', e.message);
    } finally {
      this.isSyncing = false;
    }
  }

  async _pushToServer() {
    if (!this.token) return;
    try {
      const calendar = this._getLocalCalendar();
      const chats = this._getLocalChats();
      await fetch('/api/user/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ calendar, chats })
      });
    } catch (e) {
      console.warn('[AetheraDB] Push sync notice:', e.message);
    }
  }

  /* --------------------------------------------------------------------------
     CALENDAR EVENTS
     -------------------------------------------------------------------------- */
  _getLocalCalendar() {
    try {
      const raw = localStorage.getItem(this.calendarKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  async getCalendarEvents() {
    return this._getLocalCalendar();
  }

  async saveCalendarEvent(event) {
    const events = this._getLocalCalendar();
    const newEvent = {
      id: event.id || 'evt_' + Math.random().toString(36).substr(2, 9),
      title: event.title || 'Untitled Event',
      date: event.date || new Date().toISOString().split('T')[0],
      startTime: event.startTime || '09:00',
      endTime: event.endTime || '10:00',
      category: event.category || 'work',
      priority: event.priority || 'Q2',
      quadrant: event.quadrant || 'Important, Not Urgent',
      notes: event.notes || '',
      completed: !!event.completed,
      createdAt: event.createdAt || new Date().toISOString()
    };
    events.push(newEvent);
    localStorage.setItem(this.calendarKey, JSON.stringify(events));
    window.dispatchEvent(new CustomEvent('aethera:calendar-event-saved', { detail: newEvent }));
    this._pushToServer();
    return newEvent;
  }

  async saveCalendarEventsBatch(batch) {
    if (!Array.isArray(batch) || batch.length === 0) return [];
    const events = this._getLocalCalendar();
    const added = [];
    for (const item of batch) {
      const newEvent = {
        id: item.id || 'evt_' + Math.random().toString(36).substr(2, 9),
        title: item.title || 'Untitled Event',
        date: item.date || new Date().toISOString().split('T')[0],
        startTime: item.startTime || '09:00',
        endTime: item.endTime || '10:00',
        category: item.category || 'work',
        priority: item.priority || 'Q2',
        quadrant: item.quadrant || 'Important, Not Urgent',
        notes: item.notes || '',
        completed: !!item.completed,
        createdAt: item.createdAt || new Date().toISOString()
      };
      events.push(newEvent);
      added.push(newEvent);
    }
    localStorage.setItem(this.calendarKey, JSON.stringify(events));
    window.dispatchEvent(new CustomEvent('aethera:calendar-batch-saved', { detail: added }));
    this._pushToServer();
    return added;
  }

  async updateCalendarEvent(id, updates) {
    const events = this._getLocalCalendar();
    const idx = events.findIndex(e => e.id === id);
    if (idx !== -1) {
      events[idx] = { ...events[idx], ...updates };
      localStorage.setItem(this.calendarKey, JSON.stringify(events));
      window.dispatchEvent(new CustomEvent('aethera:calendar-event-updated', { detail: events[idx] }));
      this._pushToServer();
      return events[idx];
    }
    return null;
  }

  async deleteCalendarEvent(id) {
    let events = this._getLocalCalendar();
    events = events.filter(e => e.id !== id);
    localStorage.setItem(this.calendarKey, JSON.stringify(events));
    window.dispatchEvent(new CustomEvent('aethera:calendar-event-deleted', { detail: { id } }));
    this._pushToServer();
    return true;
  }

  async clearAllCalendarEvents() {
    localStorage.setItem(this.calendarKey, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('aethera:calendar-events-cleared'));
    this._pushToServer();
    return true;
  }

  /* --------------------------------------------------------------------------
     AI SCHEDULE PARSER
     -------------------------------------------------------------------------- */
  parseAIScheduleText(text, defaultDate = null) {
    if (!text) return [];
    const dateStr = defaultDate || new Date().toISOString().split('T')[0];
    const lines = text.split('\n');
    const events = [];
    let currentQuadrant = 'Q2';
    let currentQuadrantName = 'Important, Not Urgent';

    const parseTime = (str) => {
      const match = str.trim().match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/i);
      if (!match) return '09:00';
      let h = parseInt(match[1], 10);
      const m = match[2] ? match[2] : '00';
      const ampm = match[3] ? match[3].toLowerCase() : null;
      if (ampm === 'pm' && h < 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${m}`;
    };

    const timeRangeRegex = /(\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))\s*(?:-|–|—|to)\s*(\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))/i;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (/q1|urgent\s*(&|and)\s*important/i.test(trimmed)) {
        currentQuadrant = 'Q1';
        currentQuadrantName = 'Urgent & Important';
      } else if (/q2|not\s*urgent\s*(&|and)\s*important|deep\s*work/i.test(trimmed)) {
        currentQuadrant = 'Q2';
        currentQuadrantName = 'Important, Not Urgent';
      } else if (/q3|urgent\s*(&|and)\s*not\s*important|delegate/i.test(trimmed)) {
        currentQuadrant = 'Q3';
        currentQuadrantName = 'Urgent, Not Important';
      } else if (/q4|not\s*urgent\s*(&|and)\s*not\s*important|eliminate/i.test(trimmed)) {
        currentQuadrant = 'Q4';
        currentQuadrantName = 'Not Urgent, Not Important';
      }

      const m = trimmed.match(timeRangeRegex);
      if (m) {
        const startTime = parseTime(m[1]);
        const endTime = parseTime(m[2]);
        let title = trimmed
          .replace(timeRangeRegex, '')
          .replace(/^[\s*•\-\d.)|:]+/, '')
          .replace(/[|*]+$/, '')
          .trim();

        if (title.length >= 2) {
          let cat = 'work';
          const lower = title.toLowerCase();
          if (/deep\s*work|code|program|architect|dev|build/i.test(lower)) cat = 'deep-work';
          else if (/meeting|sync|standup|call|review|discuss/i.test(lower)) cat = 'meeting';
          else if (/study|exam|calculus|math|reading|homework|learn|prep/i.test(lower)) cat = 'study';
          else if (/deadline|submit|due|critical|urgent|cve|deploy/i.test(lower)) cat = 'deadline';
          else if (/break|lunch|gym|workout|dinner|rest|walk|recovery/i.test(lower)) cat = 'personal';

          events.push({
            id: 'evt_' + Math.random().toString(36).substr(2, 9),
            title,
            date: dateStr,
            startTime,
            endTime,
            category: cat,
            priority: currentQuadrant,
            quadrant: currentQuadrantName,
            notes: 'Generated from Schedule & Task Planner AI',
            completed: false,
            createdAt: new Date().toISOString()
          });
        }
      }
    }
    return events;
  }

  /* --------------------------------------------------------------------------
     SAVED CHATS
     -------------------------------------------------------------------------- */
  _getLocalChats() {
    try {
      const raw = localStorage.getItem(this.chatsKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  async getUserChats() {
    return this._getLocalChats();
  }

  async saveUserChat(chatData) {
    const chats = this._getLocalChats();
    const newChat = {
      id: 'chat_' + Math.random().toString(36).substr(2, 9),
      toolKey: chatData.toolKey || 'general',
      title: chatData.title || 'AI Chat',
      prompt: chatData.prompt || '',
      response: chatData.response || '',
      timestamp: new Date().toISOString()
    };
    chats.unshift(newChat);
    if (chats.length > 50) chats.pop();
    localStorage.setItem(this.chatsKey, JSON.stringify(chats));
    window.dispatchEvent(new CustomEvent('aethera:chat-saved', { detail: newChat }));
    this._pushToServer();
    return newChat;
  }

  /* --------------------------------------------------------------------------
     NAVBAR AUTH WIDGET
     -------------------------------------------------------------------------- */
  renderNavAuth() {
    const slots = document.querySelectorAll('#navbar-auth-slot');
    if (!slots.length) return;

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    slots.forEach(slot => {
      if (this.isLoggedIn() && this.currentUser) {
        const username = this.currentUser.username || 'User';
        slot.innerHTML = `
          <div style="display: inline-flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 0.82rem; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 0.35rem; background: rgba(255,255,255,0.06); padding: 0.35rem 0.65rem; border-radius: 8px; border: 1px solid var(--border-color);">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>${username}</span>
            </span>
            <button type="button" class="btn btn-secondary" id="btn-logout" title="Sign Out" style="padding: 0.35rem 0.65rem; font-size: 0.78rem;">
              Sign Out
            </button>
          </div>
        `;
        const logoutBtn = slot.querySelector('#btn-logout');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', () => this.logout());
        }
      } else {
        slot.innerHTML = `
          <a href="login.html?redirect=${encodeURIComponent(currentPath)}" class="btn btn-secondary" style="padding: 0.45rem 0.85rem; font-size: 0.82rem; gap: 0.4rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            <span>Sign In</span>
          </a>
        `;
      }
    });
  }
}

// Global Singleton instance
window.aetheraDB = new AetheraClientDB();
