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

    const rawToken = typeof localStorage !== 'undefined' ? localStorage.getItem(this.tokenKey) : null;
    this.token = (rawToken && rawToken !== 'undefined' && rawToken !== 'null' && rawToken.trim() !== '') ? rawToken.trim() : null;
    this.currentUser = this._loadUser();
    if (!this.token) {
      this.currentUser = null;
    }
    this.isSyncing = false;

    if (typeof window !== 'undefined') {
      // Sync on load
      this.syncFromServer();
      // Render navbar auth widget on DOM load and window load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.renderNavAuth());
      } else {
        this.renderNavAuth();
      }
      window.addEventListener('load', () => this.renderNavAuth());
      setTimeout(() => this.renderNavAuth(), 100);
      // Re-render when language changes
      window.addEventListener('aethera:language-change', () => this.renderNavAuth());
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

  get notesKey() {
    const uid = (this.token && this.currentUser?.username) ? this.currentUser.username : 'guest';
    return `aethera_notes_${uid}`;
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

  isAuthenticated() {
    return this.isLoggedIn();
  }

  getUser() {
    return this.currentUser;
  }

  getCurrentUser() {
    return this.getUser();
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
        if (Array.isArray(data.notes)) {
          const cleanNotes = data.notes.filter(n => {
            const title = (n.title || '').trim().toLowerCase();
            return title !== 'jadwal mapel' && title !== 'nerdy coding competition';
          });
          localStorage.setItem(this.notesKey, JSON.stringify(cleanNotes));
          window.dispatchEvent(new CustomEvent('aethera:notes-synced', { detail: cleanNotes }));
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
      const notes = this._getLocalNotes();
      await fetch('/api/user/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ calendar, chats, notes })
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

  getCalendarEvents() {
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

  getUserChats() {
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
     NOTES (NOTION-STYLE WORKSPACE)
     -------------------------------------------------------------------------- */
  _getLocalNotes() {
    try {
      const raw = localStorage.getItem(this.notesKey);
      let notes = raw ? JSON.parse(raw) : [];
      if (Array.isArray(notes) && notes.length > 0) {
        const filtered = notes.filter(n => {
          const title = (n.title || '').trim().toLowerCase();
          return title !== 'jadwal mapel' && title !== 'nerdy coding competition';
        });
        if (filtered.length !== notes.length) {
          notes = filtered;
          localStorage.setItem(this.notesKey, JSON.stringify(notes));
          this._pushToServer();
        }
      }
      return notes;
    } catch { return []; }
  }

  getNotes() {
    let notes = this._getLocalNotes();
    if (!notes || notes.length === 0) {
      notes = this._getDefaultStarterNotes();
      localStorage.setItem(this.notesKey, JSON.stringify(notes));
    }
    return notes;
  }

  getNoteById(id) {
    const notes = this.getNotes();
    return notes.find(n => n.id === id) || null;
  }

  saveNote(note) {
    if (!note || typeof note !== 'object') return null;
    const notes = this._getLocalNotes();
    const now = new Date().toISOString();
    const id = note.id || 'note_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    const idx = notes.findIndex(n => n.id === id);
    const existing = idx >= 0 ? notes[idx] : null;

    const fullNote = {
      id,
      title: note.title !== undefined ? note.title : (existing ? existing.title : 'Untitled'),
      icon: note.icon || (existing ? existing.icon : '📝'),
      cover: note.cover !== undefined ? note.cover : (existing ? existing.cover : ''),
      folder: note.folder || (existing ? existing.folder : 'Private'),
      tags: Array.isArray(note.tags) ? note.tags : (existing && Array.isArray(existing.tags) ? existing.tags : []),
      pinned: note.pinned !== undefined ? !!note.pinned : (existing ? !!existing.pinned : false),
      favorite: note.favorite !== undefined ? !!note.favorite : (existing ? !!existing.favorite : false),
      blocks: Array.isArray(note.blocks) && note.blocks.length > 0 ? note.blocks : (existing && Array.isArray(existing.blocks) && existing.blocks.length > 0 ? existing.blocks : [{ id: 'b_' + Math.random().toString(36).slice(2, 7), type: 'p', text: '' }]),
      createdAt: note.createdAt || (existing && existing.createdAt ? existing.createdAt : now),
      updatedAt: now,
      lastOpenedAt: note.lastOpenedAt || (existing && existing.lastOpenedAt ? existing.lastOpenedAt : now)
    };

    if (idx >= 0) {
      notes[idx] = fullNote;
    } else {
      notes.unshift(fullNote);
    }

    localStorage.setItem(this.notesKey, JSON.stringify(notes));
    window.dispatchEvent(new CustomEvent('aethera:note-saved', { detail: fullNote }));
    this._pushToServer();
    return fullNote;
  }

  deleteNote(id) {
    let notes = this._getLocalNotes();
    notes = notes.filter(n => n.id !== id);
    localStorage.setItem(this.notesKey, JSON.stringify(notes));
    window.dispatchEvent(new CustomEvent('aethera:note-deleted', { detail: { id } }));
    this._pushToServer();
    return true;
  }

  setNotes(notes) {
    if (!Array.isArray(notes)) return;
    localStorage.setItem(this.notesKey, JSON.stringify(notes));
    window.dispatchEvent(new CustomEvent('aethera:notes-synced', { detail: notes }));
    this._pushToServer();
  }

  _getDefaultStarterNotes() {
    const now = new Date().toISOString();
    return [
      {
        id: 'note_welcome_' + Date.now().toString(36),
        title: 'Welcome to Aethera Notes',
        icon: '✨',
        cover: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        folder: 'Private',
        tags: ['Guide', 'Getting Started'],
        pinned: true,
        favorite: true,
        blocks: [
          { id: 'b1', type: 'callout', icon: '💡', text: 'Welcome to your synced workspace! Everything you write here syncs automatically across all your devices logged into Aethera.' },
          { id: 'b2', type: 'h1', text: 'Quick Start Features' },
          { id: 'b3', type: 'todo', text: 'Type / anywhere in a note to open the Notion slash menu', checked: true },
          { id: 'b4', type: 'todo', text: 'Try creating to-do items, code blocks, or callouts', checked: true },
          { id: 'b5', type: 'todo', text: 'Click "AI Assistant" to generate summaries or brainstorm ideas', checked: false },
          { id: 'b6', type: 'todo', text: 'Check the left sidebar for your synced upcoming calendar events', checked: false },
          { id: 'b7', type: 'h2', text: 'Keyboard Shortcuts' },
          { id: 'b8', type: 'bullet', text: 'Ctrl + K: Quick search across all notes' },
          { id: 'b9', type: 'bullet', text: 'Ctrl + S: Instant force cloud sync' },
          { id: 'b10', type: 'bullet', text: '/ : Open block command palette' }
        ],
        createdAt: now,
        updatedAt: now
      }
    ];
  }

  /* --------------------------------------------------------------------------
     NAVBAR AUTH WIDGET
     -------------------------------------------------------------------------- */
  renderNavAuth() {
    const slots = document.querySelectorAll('#navbar-auth-slot, #auth-status-slot');
    if (!slots.length) return;

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const isId = !!(window.aetheraI18n && window.aetheraI18n.getLang() === 'id');
    const signOutLabel = isId ? 'Keluar' : 'Sign Out';
    const signInLabel = isId ? 'Masuk' : 'Sign In';

    slots.forEach(slot => {
      const isMobileSlot = slot.classList.contains('mobile-auth-status-slot') || slot.id === 'auth-status-slot' || slot.closest('.mobile-nav-actions');
      if (this.isLoggedIn() && this.currentUser) {
        const username = this.currentUser.username || 'User';
        if (isMobileSlot) {
          slot.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%;">
              <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; justify-content: center; gap: 0.45rem; background: rgba(255,255,255,0.06); padding: 0.65rem 0.9rem; border-radius: 9px; border: 1px solid var(--border-glass);">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>${username}</span>
              </div>
              <button type="button" class="btn btn-secondary btn-logout-action" title="${signOutLabel}" data-i18n="nav.sign_out" data-i18n-title="nav.sign_out" style="width: 100%; justify-content: center; padding: 0.65rem; font-size: 0.82rem;">
                ${signOutLabel}
              </button>
            </div>
          `;
        } else {
          slot.innerHTML = `
            <div style="display: inline-flex; align-items: center; gap: 0.45rem; flex-shrink: 0;">
              <span style="font-size: 0.82rem; font-weight: 600; color: var(--text-primary); display: inline-flex; align-items: center; gap: 0.35rem; background: rgba(255,255,255,0.06); padding: 0.32rem 0.6rem; border-radius: 8px; border: 1px solid var(--border-glass); white-space: nowrap; flex-shrink: 0;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>${username}</span>
              </span>
              <button type="button" class="btn btn-secondary btn-logout-action" title="${signOutLabel}" data-i18n="nav.sign_out" data-i18n-title="nav.sign_out" style="padding: 0.32rem 0.6rem; font-size: 0.78rem; white-space: nowrap; flex-shrink: 0; height: 32px;">
                ${signOutLabel}
              </button>
            </div>
          `;
        }
        const logoutBtn = slot.querySelector('.btn-logout-action');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', () => this.logout());
        }
      } else {
        if (isMobileSlot) {
          slot.innerHTML = `
            <a href="login.html?redirect=${encodeURIComponent(currentPath)}" class="btn btn-secondary" title="${signInLabel}" data-i18n-title="nav.sign_in" style="width: 100%; justify-content: center; padding: 0.75rem 1rem; font-size: 0.88rem; display: flex; align-items: center; gap: 0.45rem;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              <span data-i18n="nav.sign_in">${signInLabel}</span>
            </a>
          `;
        } else {
          slot.innerHTML = `
            <a href="login.html?redirect=${encodeURIComponent(currentPath)}" class="btn btn-secondary" title="${signInLabel}" data-i18n-title="nav.sign_in" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; gap: 0.35rem; white-space: nowrap; flex-shrink: 0; height: 32px; display: inline-flex; align-items: center;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              <span data-i18n="nav.sign_in">${signInLabel}</span>
            </a>
          `;
        }
      }
      if (window.aetheraI18n) {
        window.aetheraI18n.applyTranslations(slot);
      }
    });
  }
}

// Global Singleton instance
window.aetheraDB = new AetheraClientDB();
