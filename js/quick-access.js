/**
 * AETHERA - QUICK ACCESS FLOATING DOCK CONTROLLER
 * Implements user's quick-access right sidebar:
 * 1. AI Tools Page (ai.html)
 * 2. Calendar (calendar.html)
 * 3. Music Player (toggles top music player notification)
 * 4. Aethera Chat (toggles floating chatbot dialog)
 */

(function () {
  'use strict';

  class AetheraQuickAccess {
    constructor() {
      this.init();
    }

    init() {
      if (document.getElementById('aethera-quick-access')) return;
      this.render();
      this.bindEvents();
      this.highlightCurrentPage();
      this.monitorActiveStates();
    }

    render() {
      const dock = document.createElement('div');
      dock.id = 'aethera-quick-access';
      dock.className = 'quick-access-dock';
      dock.setAttribute('role', 'toolbar');
      dock.setAttribute('aria-label', 'Quick Access Bar');

      dock.innerHTML = `
        <div class="quick-access-header">
          <span class="quick-access-badge-title">Quick Access</span>
        </div>

        <div class="quick-access-items">
          <!-- 1. AI Tools Page -->
          <a href="ai.html" id="qa-ai-btn" class="quick-access-btn" aria-label="AI Tools Page">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 10v2h2a3 3 0 0 1 3 3v1a2 2 0 0 1-2 2h-1v2a2 2 0 0 1-4 0v-2H9a2 2 0 0 1-2-2v-1a3 3 0 0 1 3-3h2v-2l-.75-.07C9.4 9.58 8 7.95 8 6a4 4 0 0 1 4-4z"/>
              <circle cx="12" cy="6" r="1.5" fill="currentColor"/>
            </svg>
            <span class="quick-access-tooltip">AI Tools Page</span>
          </a>

          <!-- 2. Calendar -->
          <a href="calendar.html" id="qa-cal-btn" class="quick-access-btn" aria-label="Interactive Calendar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span class="quick-access-tooltip">Calendar</span>
          </a>

          <!-- 3. Music Player Notification Trigger -->
          <button type="button" id="qa-music-btn" class="quick-access-btn" aria-label="Music Player">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
            <span id="qa-music-dot" class="quick-access-dot"></span>
            <span class="quick-access-tooltip">Music Player</span>
          </button>

          <!-- 4. Aethera Chat Trigger -->
          <button type="button" id="qa-chat-btn" class="quick-access-btn" aria-label="Aethera Chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span id="qa-chat-dot" class="quick-access-dot"></span>
            <span class="quick-access-tooltip">Aethera Chat</span>
          </button>
        </div>
      `;

      document.body.appendChild(dock);
    }

    bindEvents() {
      const musicBtn = document.getElementById('qa-music-btn');
      const chatBtn = document.getElementById('qa-chat-btn');

      // 3. Music Player Toggle
      if (musicBtn) {
        musicBtn.addEventListener('click', () => {
          if (window.toggleMusicPlayer) {
            window.toggleMusicPlayer();
          } else if (window.openMusicPlayer) {
            window.openMusicPlayer();
          } else {
            // Scroll to top or fallback
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
      }

      // 4. Aethera Chat Toggle
      if (chatBtn) {
        chatBtn.addEventListener('click', () => {
          if (window.aetheraChatbot) {
            window.aetheraChatbot.toggleWindow();
          } else if (window.openChatbot) {
            window.openChatbot();
          } else {
            // If on a page without chatbot loaded, redirect to ai.html
            window.location.href = 'ai.html';
          }
        });
      }
    }

    highlightCurrentPage() {
      const path = window.location.pathname.toLowerCase();
      const aiBtn = document.getElementById('qa-ai-btn');
      const calBtn = document.getElementById('qa-cal-btn');

      if (path.includes('ai.html') && aiBtn) {
        aiBtn.classList.add('active');
      } else if (path.includes('calendar.html') && calBtn) {
        calBtn.classList.add('active');
      }
    }

    monitorActiveStates() {
      const musicDot = document.getElementById('qa-music-dot');
      const chatDot = document.getElementById('qa-chat-dot');

      // Update music dot if audio is playing
      setInterval(() => {
        const audio = document.getElementById('aethera-native-audio');
        if (musicDot) {
          if (audio && !audio.paused && audio.currentTime > 0) {
            musicDot.classList.add('active');
          } else {
            musicDot.classList.remove('active');
          }
        }
      }, 500);

      // Chat dot when window is open
      setInterval(() => {
        const chatWin = document.getElementById('chatbot-window');
        if (chatDot) {
          if (chatWin && chatWin.classList.contains('open')) {
            chatDot.classList.add('active');
          } else {
            chatDot.classList.remove('active');
          }
        }
      }, 300);
    }
  }

  // Auto-init on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new AetheraQuickAccess());
  } else {
    new AetheraQuickAccess();
  }
})();
