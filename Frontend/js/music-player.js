/**
 * AETHERA - FLOATING NOTIFICATION MUSIC PLAYER
 * Implements "Example one" (Input state: "Play a music")
 * and "Example two" (Playing state: Now Playing view)
 * - Plays full-length songs from the beginning (0:00) to the end (full track length).
 * - Disappears after 5 seconds of idling, except when the user is typing.
 * - Re-appears/appears when the user clicks the quick access music tab with a notification entrance animation.
 * - Powered by YouTube Embedded Audio Engine with iTunes Preview and Web Audio API synthesis fallback.
 */

(function () {
  'use strict';

  class AetheraMusicPlayer {
    constructor() {
      this.currentTrack = null;
      this.isPlaying = false;
      this.playbackMode = 'youtube'; // 'youtube' | 'native' | 'synth'
      this.audio = null;
      this.synthContext = null;
      this.synthOscillators = [];
      this.synthInterval = null;

      // Full-Length Track YouTube Player Engine
      this.ytPlayer = null;
      this.ytReady = false;
      this.pendingTrack = null;
      this.ytProgressInterval = null;

      // Notification Idle & Animation Controller
      this.idleTimeoutMs = 5000;
      this.idleTimer = null;
      this.isTyping = false;
      this.isCardVisible = false;
      this.isDismissing = false;

      // Music Queue State
      this.queue = [];
      this.isQueueOpen = false;
      this.toastTimeout = null;

      // Autoplay Controller State
      let savedAutoplay = null;
      try {
        savedAutoplay = localStorage.getItem('aethera_music_autoplay');
      } catch (e) {}
      this.isAutoplayEnabled = savedAutoplay !== 'false'; // Default ON
      this.recentPlayedIds = [];
      this.lastPlayedTrack = null;
      this.isAutoplayLoading = false;

      this.init();
    }

    isId() {
      return !!(window.aetheraI18n && window.aetheraI18n.getLang() === 'id');
    }

    init() {
      if (document.getElementById('aethera-music-wrapper')) return;
      this.render();
      this.bindElements();
      this.bindEvents();
      this.initYouTube();
      if (window.aetheraI18n && this.card) {
        window.aetheraI18n.applyTranslations(this.card);
      }
    }

    render() {
      const wrapper = document.createElement('div');
      wrapper.id = 'aethera-music-wrapper';
      wrapper.className = 'music-notification-wrapper';

      wrapper.innerHTML = `
        <!-- Full Notification Card with Entrance Animation (Initially hidden until user clicks feature) -->
        <div id="music-card" class="music-notification-card notification-hidden" role="region" aria-label="Music Player Notification" style="display: none;">
          <!-- Card Header -->
          <div class="music-card-header">
            <div class="music-card-title-wrap">
              <span id="music-header-title" class="music-card-heading">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M9 18V5l12-2v13"></path>
                  <circle cx="6" cy="18" r="3"></circle>
                  <circle cx="18" cy="16" r="3"></circle>
                </svg>
                <span id="music-header-text" data-i18n="music.title">Play a music</span>
              </span>
            </div>
            <div class="music-card-header-actions">
              <button id="music-minimize-btn" class="music-header-btn" title="Dismiss Notification" aria-label="Dismiss">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <button id="music-close-btn" class="music-header-btn" title="Close Notification" aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
              </button>
            </div>
          </div>

          <!-- EXAMPLE ONE: Input View -->
          <div id="music-input-view" class="music-input-view">
            <form id="music-form" class="music-input-form" onsubmit="return false;">
              <div class="music-input-box-wrapper">
                <svg class="music-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input 
                  type="text" 
                  id="music-prompt-input" 
                  class="music-prompt-input" 
                  placeholder="Type any music title from YouTube Music..." 
                  data-i18n-placeholder="music.placeholder"
                  value=""
                  autocomplete="off"
                  spellcheck="false"
                />
                <button type="submit" id="music-play-btn" class="music-submit-btn">
                  <span data-i18n="music.play">Play</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                </button>
                <button type="button" id="music-add-queue-btn" class="music-queue-input-btn" title="Add to Queue">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span data-i18n="music.queue">Queue</span>
                </button>
              </div>
            </form>

          </div>

          <!-- EXAMPLE TWO: Now Playing View -->
          <div id="music-playing-view" class="music-playing-view" style="display: none;">
            <div class="music-track-banner">
              <div class="music-art-wrapper">
                <img id="music-art-img" class="music-art-img" src="" alt="Album Artwork" />
              </div>
              <div class="music-info-meta">
                <div id="music-now-playing-title" class="music-now-playing-text" data-i18n="music.no_track">No track selected</div>
                <div id="music-artist-name" class="music-artist-name">YouTube Music</div>
              </div>
              <div class="music-sound-waves" id="music-sound-waves" title="Audio Visualizer">
                <span class="music-wave-bar"></span>
                <span class="music-wave-bar"></span>
                <span class="music-wave-bar"></span>
                <span class="music-wave-bar"></span>
              </div>
            </div>

            <!-- Scrubber / Progress (Full Song Beginning to End) -->
            <div class="music-scrubber-row">
              <span id="music-cur-time" class="music-timestamp">0:00</span>
              <div id="music-track-bar" class="music-progress-track">
                <div id="music-progress-fill" class="music-progress-fill"></div>
              </div>
              <span id="music-tot-time" class="music-timestamp">--:--</span>
            </div>

            <!-- Playback Controls -->
            <div class="music-controls-row">
              <div class="music-controls-left">
                <button id="music-toggle-btn" class="music-play-toggle-btn" title="Play/Pause">
                  <svg id="music-play-svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  <svg id="music-pause-svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display: none;"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                </button>
                <button id="music-restart-btn" class="music-action-btn" title="Replay from start (0:00)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                </button>
                <button id="music-next-btn" class="music-action-btn" title="Skip to next queued song" disabled style="opacity: 0.4; cursor: not-allowed;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><rect x="17" y="5" width="2.5" height="14" rx="0.5"/></svg>
                </button>
                <button id="music-volume-btn" class="music-action-btn" title="Mute/Unmute">
                  <svg id="music-vol-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                </button>
              </div>
              <div class="music-controls-right">
                <button id="music-autoplay-btn" class="music-autoplay-toggle-btn active" title="Autoplay: ON (Auto-plays similar songs when ended)">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
                    <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
                    <line x1="19" y1="4" x2="19" y2="20" stroke="currentColor"/>
                  </svg>
                  <span data-i18n="music.autoplay">Autoplay</span>
                  <span id="music-autoplay-badge" class="music-autoplay-badge active">ON</span>
                </button>
                <button id="music-queue-btn" class="music-queue-toggle-btn" title="View / Manage Music Queue">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                  <span data-i18n="music.queue">Queue</span>
                  <span id="music-queue-counter" class="music-queue-badge">0</span>
                </button>
                <button id="music-switch-btn" class="music-change-track-btn" title="Search another song">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <span data-i18n="music.search">Search</span>
                </button>
              </div>
            </div>

            <!-- Expandable Queue Drawer -->
            <div id="music-queue-drawer" class="music-queue-drawer" style="display: none;">
              <div class="music-queue-drawer-header">
                <div class="music-queue-drawer-title">
                  <span data-i18n="music.up_next">Up Next in Queue</span>
                  <span id="music-queue-subcount" class="music-queue-subcount">(0 songs)</span>
                </div>
                <div class="music-queue-header-actions">
                  <button type="button" id="music-drawer-autoplay-btn" class="music-drawer-autoplay-btn active" title="Toggle Autoplay">
                    Autoplay: <span id="music-drawer-autoplay-status">ON</span>
                  </button>
                  <button type="button" id="music-queue-clear-btn" class="music-queue-clear-btn" title="Clear all queued songs" data-i18n="music.clear">Clear</button>
                </div>
              </div>

              <!-- Inline Quick Add Input inside Drawer -->
              <form id="music-queue-quick-add-form" class="music-queue-quick-add-form" onsubmit="return false;">
                <input type="text" id="music-queue-quick-input" class="music-queue-quick-input" placeholder="Queue next song..." data-i18n-placeholder="music.queue_placeholder" autocomplete="off" spellcheck="false" />
                <button type="submit" id="music-queue-quick-submit" class="music-queue-quick-submit" title="Add to Queue">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span data-i18n="music.add">Add</span>
                </button>
              </form>

              <!-- Dynamic Queue Items -->
              <div id="music-queue-items" class="music-queue-items">
                <div class="music-queue-empty" data-i18n="music.queue_empty">Queue is empty. Add songs above!</div>
              </div>
            </div>

            <!-- Toast Feedback Notification -->
            <div id="music-toast" class="music-toast" style="display: none;"></div>
          </div>
        </div>

        <!-- Minimized Dynamic Island Capsule (Hidden in favor of Quick Access Dock) -->
        <div id="music-island" class="music-island-pill" role="button" aria-label="Expand Music Player" style="display: none;">
          <span id="music-island-label" class="music-island-label">YouTube Music</span>
          <button id="music-island-toggle" class="music-header-btn" style="padding: 2px;" title="Play/Pause">
            <svg id="music-island-play-svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <svg id="music-island-pause-svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="display: none;"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          </button>
        </div>

        <!-- Floating Reopen Trigger when closed -->
        <button id="music-fab-trigger" class="music-fab-trigger" title="Open Music Player" aria-label="Open Music Player" style="display: none;">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
        </button>

        <!-- Native Audio Element (Preview Fallback) -->
        <audio id="aethera-native-audio" preload="auto"></audio>

        <!-- Embedded Full Track Audio Engine (YouTube IFrame API) -->
        <div id="music-yt-container" class="music-yt-container">
          <div id="aethera-yt-player"></div>
        </div>
      `;

      document.body.appendChild(wrapper);
    }

    bindElements() {
      this.card = document.getElementById('music-card');
      this.island = document.getElementById('music-island');
      this.headerText = document.getElementById('music-header-text');
      this.inputView = document.getElementById('music-input-view');
      this.playingView = document.getElementById('music-playing-view');
      this.promptInput = document.getElementById('music-prompt-input');
      this.form = document.getElementById('music-form');
      this.playBtn = document.getElementById('music-play-btn');
      this.minimizeBtn = document.getElementById('music-minimize-btn');
      this.closeBtn = document.getElementById('music-close-btn');

      this.nowPlayingTitle = document.getElementById('music-now-playing-title');
      this.artistName = document.getElementById('music-artist-name');
      this.artImg = document.getElementById('music-art-img');
      this.soundWaves = document.getElementById('music-sound-waves');
      this.curTime = document.getElementById('music-cur-time');
      this.totTime = document.getElementById('music-tot-time');
      this.progressBar = document.getElementById('music-track-bar');
      this.progressFill = document.getElementById('music-progress-fill');

      this.toggleBtn = document.getElementById('music-toggle-btn');
      this.playSvg = document.getElementById('music-play-svg');
      this.pauseSvg = document.getElementById('music-pause-svg');
      this.restartBtn = document.getElementById('music-restart-btn');
      this.volumeBtn = document.getElementById('music-volume-btn');
      this.switchBtn = document.getElementById('music-switch-btn');
      this.controlsRow = this.card ? this.card.querySelector('.music-controls-row') : document.querySelector('.music-controls-row');

      // Music Queue Elements
      this.addQueueBtn = document.getElementById('music-add-queue-btn');
      this.nextBtn = document.getElementById('music-next-btn');
      this.queueBtn = document.getElementById('music-queue-btn');
      this.queueCounter = document.getElementById('music-queue-counter');
      this.queueDrawer = document.getElementById('music-queue-drawer');
      this.queueSubcount = document.getElementById('music-queue-subcount');
      this.queueClearBtn = document.getElementById('music-queue-clear-btn');
      this.queueQuickForm = document.getElementById('music-queue-quick-add-form');
      this.queueQuickInput = document.getElementById('music-queue-quick-input');
      this.queueItems = document.getElementById('music-queue-items');
      this.toast = document.getElementById('music-toast');

      // Autoplay Elements
      this.autoplayBtn = document.getElementById('music-autoplay-btn');
      this.autoplayBadge = document.getElementById('music-autoplay-badge');
      this.drawerAutoplayBtn = document.getElementById('music-drawer-autoplay-btn');
      this.drawerAutoplayStatus = document.getElementById('music-drawer-autoplay-status');
      this.updateAutoplayUI();

      this.islandLabel = document.getElementById('music-island-label');
      this.islandToggle = document.getElementById('music-island-toggle');
      this.islandPlaySvg = document.getElementById('music-island-play-svg');
      this.islandPauseSvg = document.getElementById('music-island-pause-svg');
      this.fabTrigger = document.getElementById('music-fab-trigger');

      this.audio = document.getElementById('aethera-native-audio');
    }

    bindEvents() {
      // Typing Detection: Never disappear while the user is typing
      const onUserTyping = () => {
        this.isTyping = true;
        this.clearIdleTimer();
      };

      this.promptInput.addEventListener('focus', onUserTyping);
      this.promptInput.addEventListener('input', onUserTyping);
      this.promptInput.addEventListener('keydown', onUserTyping);

      this.promptInput.addEventListener('blur', () => {
        this.isTyping = false;
        this.resetIdleTimer();
      });

      // Queue Quick-Add input typing detection
      if (this.queueQuickInput) {
        this.queueQuickInput.addEventListener('focus', onUserTyping);
        this.queueQuickInput.addEventListener('input', onUserTyping);
        this.queueQuickInput.addEventListener('keydown', onUserTyping);
        this.queueQuickInput.addEventListener('blur', () => {
          this.isTyping = false;
          this.resetIdleTimer();
        });
      }

      // Submit Song Request (Play Immediately)
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.isTyping = false;
        this.handlePlayRequest(this.promptInput.value);
        this.resetIdleTimer();
      });

      // Add to Queue from Input View Search Bar
      if (this.addQueueBtn) {
        this.addQueueBtn.addEventListener('click', (e) => {
          e.preventDefault();
          const query = this.promptInput.value.trim();
          if (!query) return;
          this.addToQueue(query);
          this.resetIdleTimer();
        });
      }

      // Quick-Add from Queue Drawer Form
      if (this.queueQuickForm) {
        this.queueQuickForm.addEventListener('submit', (e) => {
          e.preventDefault();
          if (!this.queueQuickInput) return;
          const query = this.queueQuickInput.value.trim();
          if (!query) return;
          this.queueQuickInput.value = '';
          this.addToQueue(query);
          this.resetIdleTimer();
        });
      }

      // Toggle Queue Drawer
      if (this.queueBtn) {
        this.queueBtn.addEventListener('click', () => {
          this.toggleQueueDrawer();
          this.resetIdleTimer();
        });
      }

      // Skip to Next Queued Song
      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', () => {
          this.playNextInQueue();
          this.resetIdleTimer();
        });
      }

      // Clear All in Queue
      if (this.queueClearBtn) {
        this.queueClearBtn.addEventListener('click', () => {
          this.clearQueue();
          this.resetIdleTimer();
        });
      }

      // Autoplay Toggle Events
      if (this.autoplayBtn) {
        this.autoplayBtn.addEventListener('click', () => {
          this.toggleAutoplay();
          this.resetIdleTimer();
        });
      }
      if (this.drawerAutoplayBtn) {
        this.drawerAutoplayBtn.addEventListener('click', () => {
          this.toggleAutoplay();
          this.resetIdleTimer();
        });
      }

      // Mouse Hover / Activity on Notification Card
      this.card.addEventListener('mouseenter', () => {
        this.clearIdleTimer();
      });

      this.card.addEventListener('mouseleave', () => {
        if (!this.isTyping && document.activeElement !== this.promptInput && document.activeElement !== this.queueQuickInput) {
          this.resetIdleTimer();
        }
      });

      this.card.addEventListener('click', () => {
        if (!this.isTyping && document.activeElement !== this.promptInput && document.activeElement !== this.queueQuickInput) {
          this.resetIdleTimer();
        }
      });

      // Controls Row Horizontal Scrolling (Mouse Wheel, Touch, Drag, & Edge Masks)
      if (this.controlsRow) {
        this.controlsRow.addEventListener('wheel', (e) => {
          if (this.controlsRow.scrollWidth > this.controlsRow.clientWidth) {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              e.preventDefault();
              this.controlsRow.scrollLeft += e.deltaY * 0.9;
              this.updateControlsScroll();
            }
          }
        }, { passive: false });

        this.controlsRow.addEventListener('scroll', () => {
          this.updateControlsScroll();
        }, { passive: true });

        window.addEventListener('resize', () => {
          this.updateControlsScroll();
        }, { passive: true });

        // Mouse Drag to Scroll (When dragging between buttons)
        let isDragging = false;
        let dragStartX = 0;
        let dragScrollStart = 0;

        this.controlsRow.addEventListener('mousedown', (e) => {
          if (e.target.closest('button')) return;
          isDragging = true;
          dragStartX = e.pageX - this.controlsRow.offsetLeft;
          dragScrollStart = this.controlsRow.scrollLeft;
        });

        window.addEventListener('mouseup', () => {
          if (isDragging) isDragging = false;
        });

        this.controlsRow.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          e.preventDefault();
          const x = e.pageX - this.controlsRow.offsetLeft;
          const walk = (x - dragStartX) * 1.2;
          this.controlsRow.scrollLeft = dragScrollStart - walk;
        });
      }

      // Play / Pause Toggle
      this.toggleBtn.addEventListener('click', () => {
        this.togglePlayPause();
        this.resetIdleTimer();
      });

      if (this.islandToggle) {
        this.islandToggle.addEventListener('click', (e) => {
          e.stopPropagation();
          this.togglePlayPause();
        });
      }

      // Replay from Start (0:00)
      this.restartBtn.addEventListener('click', () => {
        this.resetIdleTimer();
        if (this.playbackMode === 'youtube' && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
          this.ytPlayer.seekTo(0, true);
          this.ytPlayer.playVideo();
          this.curTime.textContent = '0:00';
          this.progressFill.style.width = '0%';
          this.setPlayingUIState(true);
          return;
        }

        if (this.audio && this.audio.src) {
          this.audio.currentTime = 0;
          this.audio.play();
        }
      });

      // Volume / Mute
      this.volumeBtn.addEventListener('click', () => {
        this.resetIdleTimer();
        if (this.playbackMode === 'youtube' && this.ytPlayer) {
          if (typeof this.ytPlayer.isMuted === 'function' && this.ytPlayer.isMuted()) {
            this.ytPlayer.unMute();
            this.volumeBtn.style.opacity = '1';
          } else if (typeof this.ytPlayer.mute === 'function') {
            this.ytPlayer.mute();
            this.volumeBtn.style.opacity = '0.45';
          }
          return;
        }

        if (this.audio) {
          this.audio.muted = !this.audio.muted;
          this.volumeBtn.style.opacity = this.audio.muted ? '0.45' : '1';
        }
      });

      // Progress Bar Click Seek across full duration
      this.progressBar.addEventListener('click', (e) => {
        this.resetIdleTimer();
        const rect = this.progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

        if (this.playbackMode === 'youtube' && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
          const duration = this.ytPlayer.getDuration() || 0;
          if (duration > 0) {
            const targetSec = percent * duration;
            this.ytPlayer.seekTo(targetSec, true);
            this.progressFill.style.width = `${percent * 100}%`;
            this.curTime.textContent = this.formatTime(targetSec);
            if (typeof this.ytPlayer.playVideo === 'function') {
              this.ytPlayer.playVideo();
            }
          }
          return;
        }

        if (this.audio && this.audio.duration) {
          this.audio.currentTime = percent * this.audio.duration;
        }
      });

      // Change Music Button -> Back to Example one input
      this.switchBtn.addEventListener('click', () => {
        this.showInputView();
      });

      // Minimize / Dismiss button
      this.minimizeBtn.addEventListener('click', () => {
        this.dismissCardWithAnimation();
      });

      // Close Notification & Stop Audio
      this.closeBtn.addEventListener('click', () => {
        this.dismissCardWithAnimation();
        this.stopAudio();
      });

      // Native Audio Events
      this.audio.addEventListener('timeupdate', () => this.onTimeUpdate());
      this.audio.addEventListener('ended', () => this.onAudioEnded());
      this.audio.addEventListener('play', () => this.setPlayingUIState(true));
      this.audio.addEventListener('pause', () => this.setPlayingUIState(false));
      this.audio.addEventListener('error', () => this.onAudioError());

      // Language change reactive listener
      window.addEventListener('aethera:language-change', () => {
        if (window.aetheraI18n && this.card) {
          window.aetheraI18n.applyTranslations(this.card);
        }
        const isPlaying = this.playingView && this.playingView.style.display !== 'none';
        if (isPlaying) {
          if (this.headerText) {
            this.headerText.textContent = this.isId() ? 'Sedang Diputar' : 'Now Playing';
          }
          if (this.currentTrack && this.currentTrack.title) {
            const prefix = this.isId() ? 'Memutar' : 'Playing';
            this.nowPlayingTitle.textContent = `${prefix} ${this.currentTrack.title}`;
            if (this.islandLabel) this.islandLabel.textContent = `${prefix} ${this.currentTrack.title}`;
          }
        } else if (this.headerText) {
          this.headerText.textContent = this.isId() ? 'Putar Musik' : 'Play a music';
        }
        this.updateQueueUI();
      });
    }

    /* --- NOTIFICATION IDLE & ANIMATION CONTROLLER --- */
    startIdleTimer() {
      this.clearIdleTimer();
      if (this.isTyping) return;
      if (!this.isCardVisible) return;

      this.idleTimer = setTimeout(() => {
        // Double check: if user is typing or search/queue input currently has focus, do NOT dismiss!
        if (
          this.isTyping ||
          (this.promptInput && document.activeElement === this.promptInput) ||
          (this.queueQuickInput && document.activeElement === this.queueQuickInput)
        ) {
          return;
        }
        this.dismissCardWithAnimation();
      }, this.idleTimeoutMs);
    }

    clearIdleTimer() {
      if (this.idleTimer) {
        clearTimeout(this.idleTimer);
        this.idleTimer = null;
      }
    }

    resetIdleTimer() {
      this.clearIdleTimer();
      this.startIdleTimer();
    }

    dismissCardWithAnimation() {
      if (!this.card || !this.isCardVisible || this.isDismissing) return;
      if (
        this.isTyping ||
        (this.promptInput && document.activeElement === this.promptInput) ||
        (this.queueQuickInput && document.activeElement === this.queueQuickInput)
      ) return;

      this.isDismissing = true;
      this.clearIdleTimer();

      this.card.classList.remove('notification-appear');
      this.card.classList.add('notification-disappear');

      const finalizeDismiss = () => {
        if (!this.isDismissing) return;
        this.card.classList.remove('notification-disappear');
        this.card.classList.add('notification-hidden');
        this.card.style.display = 'none';
        this.isCardVisible = false;
        this.isDismissing = false;
      };

      this.card.addEventListener('animationend', finalizeDismiss, { once: true });
      setTimeout(finalizeDismiss, 420);
    }

    showCard() {
      if (!this.card) return;
      this.isDismissing = false;
      this.clearIdleTimer();

      // Remove hidden / disappear classes
      this.card.classList.remove('notification-disappear', 'notification-hidden');
      this.card.style.display = 'flex';

      // Trigger reflow to restart entrance drop animation reliably
      void this.card.offsetWidth;

      this.card.classList.add('notification-appear');
      this.isCardVisible = true;

      if (this.island) this.island.style.display = 'none';
      if (this.fabTrigger) this.fabTrigger.style.display = 'none';

      // Start 5-second countdown to auto-dismiss when idle
      this.resetIdleTimer();
    }

    toggleCard() {
      if (!this.card) return;
      const isVisible =
        this.isCardVisible &&
        this.card.style.display !== 'none' &&
        !this.card.classList.contains('notification-hidden');

      if (isVisible) {
        this.dismissCardWithAnimation();
      } else {
        this.showCard();
      }
    }

    /* --- YOUTUBE EMBEDDED AUDIO ENGINE --- */
    loadYouTubeApi() {
      if (window.YT && window.YT.Player) {
        return Promise.resolve(window.YT);
      }
      if (window._aetheraYtPromise) {
        return window._aetheraYtPromise;
      }
      window._aetheraYtPromise = new Promise((resolve) => {
        const prevOnReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (typeof prevOnReady === 'function') {
            try {
              prevOnReady();
            } catch (e) {}
          }
          resolve(window.YT);
        };

        if (!document.getElementById('aethera-yt-script')) {
          const tag = document.createElement('script');
          tag.id = 'aethera-yt-script';
          tag.src = 'https://www.youtube.com/iframe_api';
          document.head.appendChild(tag);
        }

        const safetyPoll = setInterval(() => {
          if (window.YT && window.YT.Player) {
            clearInterval(safetyPoll);
            resolve(window.YT);
          }
        }, 150);
      });
      return window._aetheraYtPromise;
    }

    initYouTube() {
      this.loadYouTubeApi()
        .then(() => {
          if (this.ytPlayer) return;
          const container = document.getElementById('aethera-yt-player');
          if (!container) return;

          try {
            const origin =
              window.location.origin &&
              window.location.origin !== 'null' &&
              window.location.protocol.startsWith('http')
                ? window.location.origin
                : undefined;

            const playerVars = {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              fs: 0,
              modestbranding: 1,
              rel: 0,
              playsinline: 1,
              enablejsapi: 1
            };
            if (origin) playerVars.origin = origin;

            this.ytPlayer = new YT.Player('aethera-yt-player', {
              width: '200',
              height: '200',
              playerVars: playerVars,
              events: {
                onReady: () => {
                  this.ytReady = true;
                  if (this.pendingTrack) {
                    const trk = this.pendingTrack;
                    this.pendingTrack = null;
                    this.playYouTubeTrack(trk);
                  }
                },
                onStateChange: (e) => this.onYouTubeStateChange(e),
                onError: (e) => this.onYouTubeError(e)
              }
            });
          } catch (e) {
            console.warn('[Aethera Music] YouTube Player setup note:', e);
          }
        })
        .catch((err) => {
          console.warn('[Aethera Music] YouTube API could not load:', err);
        });
    }

    onYouTubeStateChange(event) {
      // YT.PlayerState: UNSTARTED (-1), ENDED (0), PLAYING (1), PAUSED (2), BUFFERING (3), CUED (5)
      if (event.data === 1) {
        // PLAYING
        // Guarantee song plays strictly from the beginning (0:00), overriding any YouTube watch-history resume point
        if (!this.hasEnforcedBeginning && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
          this.hasEnforcedBeginning = true;
          const cur = (typeof this.ytPlayer.getCurrentTime === 'function') ? this.ytPlayer.getCurrentTime() : 0;
          if (cur > 1.2) {
            this.ytPlayer.seekTo(0, true);
          }
        }
        this.setPlayingUIState(true);
        this.startProgressTracker();
      } else if (event.data === 2) {
        // PAUSED
        this.setPlayingUIState(false);
        this.stopProgressTracker();
      } else if (event.data === 0) {
        // ENDED (Finished full song from beginning to end)
        this.setPlayingUIState(false);
        this.stopProgressTracker();
        this.onTrackFinished();
      } else if (event.data === 3) {
        // BUFFERING
      }
    }

    onTrackFinished() {
      if (this.ytPlayer && typeof this.ytPlayer.getDuration === 'function') {
        const dur = this.ytPlayer.getDuration();
        this.curTime.textContent = this.formatTime(dur);
        this.totTime.textContent = this.formatTime(dur);
      }
      this.progressFill.style.width = '100%';

      // Automatically play next song in queue if available, else trigger Autoplay
      if (this.queue && this.queue.length > 0) {
        setTimeout(() => {
          this.playNextInQueue();
        }, 500);
      } else if (this.isAutoplayEnabled) {
        setTimeout(() => {
          this.triggerAutoplay();
        }, 600);
      }
    }

    onYouTubeError(event) {
      console.warn('[Aethera Music] YouTube embed error code:', event.data);
      // If error 101 or 150 (not allowed to be embedded) or 100 (not found)
      if (
        this.currentTrack &&
        this.currentTrack.alternates &&
        this.currentTrack.currentAlternateIndex < this.currentTrack.alternates.length
      ) {
        const nextId = this.currentTrack.alternates[this.currentTrack.currentAlternateIndex++];
        console.log('[Aethera Music] Trying alternate video ID:', nextId);
        this.currentTrack.videoId = nextId;
        this.currentTrack.art = `https://i.ytimg.com/vi/${nextId}/hqdefault.jpg`;
        this.artImg.src = this.currentTrack.art;
        if (this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
          this.ytPlayer.loadVideoById({ videoId: nextId, startSeconds: 0 });
          this.ytPlayer.playVideo();
        }
        return;
      }

      // If all alternates exhausted, fallback to iTunes preview or synth
      if (this.currentTrack && this.currentTrack.query) {
        this.fallbackToItunes(this.currentTrack.query);
      }
    }

    startProgressTracker() {
      this.stopProgressTracker();
      this.ytProgressInterval = setInterval(() => {
        if (!this.ytPlayer || typeof this.ytPlayer.getCurrentTime !== 'function') return;
        const current = this.ytPlayer.getCurrentTime() || 0;
        const duration = this.ytPlayer.getDuration() || 0;

        if (duration > 0) {
          const percent = Math.min(100, (current / duration) * 100);
          this.progressFill.style.width = `${percent}%`;
          this.curTime.textContent = this.formatTime(current);
          this.totTime.textContent = this.formatTime(duration);
        } else {
          this.curTime.textContent = this.formatTime(current);
        }
      }, 250);
    }

    stopProgressTracker() {
      if (this.ytProgressInterval) {
        clearInterval(this.ytProgressInterval);
        this.ytProgressInterval = null;
      }
    }

    cleanSongQuery(raw) {
      if (!raw) return '';
      let clean = raw.trim();
      clean = clean
        .replace(/^(can\s+you\s+)?(please\s+)?(i\s+want\s+to\s+listen\s+to|i\s+want\s+to\s+hear|listen\s+to|put\s+on|play\s+me|play\s+a\s+music|play\s+music|play\s+the\s+song|play\s+song|play)\s+/i, '')
        .replace(/\s+(please|for\s+me)$/i, '')
        .trim();
      return clean || '';
    }

    async handlePlayRequest(rawQuery) {
      const songQuery = this.cleanSongQuery(rawQuery);
      if (!songQuery) {
        this.showToast('Please enter a music title');
        return;
      }
      this.playBtn.disabled = true;
      this.playBtn.innerHTML = `<span>Loading...</span>`;

      try {
        // 1. Try our YouTube Music backend search (Full track from beginning to end)
        const res = await fetch(`/api/music/search?q=${encodeURIComponent(songQuery)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.videoId) {
            this.playYouTubeTrack({
              title: data.title,
              artist: data.artist ? `${data.artist} • YouTube Music` : 'YouTube Music',
              art: data.thumbnail || `https://i.ytimg.com/vi/${data.videoId}/hqdefault.jpg`,
              videoId: data.videoId,
              alternates: data.alternates || [],
              query: songQuery,
              source: 'YouTube Music'
            });
            return;
          }
        }
        // Fallback to iTunes preview
        await this.fallbackToItunes(songQuery);
      } catch (err) {
        console.warn('[Aethera Music] Full track search error, falling back to iTunes:', err);
        await this.fallbackToItunes(songQuery);
      } finally {
        this.playBtn.disabled = false;
        this.playBtn.innerHTML = `<span>Play</span><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
      }
    }

    async fallbackToItunes(songQuery) {
      try {
        const response = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(songQuery)}&entity=song&limit=5`
        );
        if (!response.ok) throw new Error('iTunes Search network error');
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const track = data.results[0];
          this.playNativeTrack({
            title: track.trackName,
            artist: track.artistName ? `${track.artistName} • Preview` : 'Preview Stream',
            art: track.artworkUrl100
              ? track.artworkUrl100.replace('100x100bb', '300x300bb')
              : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FFFFFF"><circle cx="12" cy="12" r="10"/></svg>',
            previewUrl: track.previewUrl,
            query: songQuery
          });
        } else {
          this.fallbackSynthesizer(songQuery);
        }
      } catch (err) {
        console.warn('[Aethera Music] iTunes query fallback:', err);
        this.fallbackSynthesizer(songQuery);
      }
    }

    playYouTubeTrack(track) {
      this.playbackMode = 'youtube';
      this.stopSynth();
      if (this.audio) {
        this.audio.pause();
        this.audio.currentTime = 0;
      }
      this.currentTrack = {
        ...track,
        currentAlternateIndex: 0
      };
      this.lastPlayedTrack = this.currentTrack;
      if (track.videoId && !this.recentPlayedIds.includes(track.videoId)) {
        this.recentPlayedIds.push(track.videoId);
        if (this.recentPlayedIds.length > 25) this.recentPlayedIds.shift();
      }

      // Reset beginning enforcement flag
      this.hasEnforcedBeginning = false;

      // Update UI matching "Example two: Playing [Song Name]"
      const playPrefix = this.isId() ? 'Memutar' : 'Playing';
      this.nowPlayingTitle.textContent = `${playPrefix} ${track.title}`;
      this.artistName.textContent = track.artist || 'YouTube Music';
      this.artImg.src = track.art || track.thumbnail;
      this.islandLabel.textContent = `${playPrefix} ${track.title}`;
      this.curTime.textContent = '0:00';
      this.totTime.textContent = '--:--';
      this.progressFill.style.width = '0%';

      // Switch to Playing View
      this.showPlayingView();

      if (this.ytReady && this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
        this.ytPlayer.loadVideoById({
          videoId: track.videoId,
          startSeconds: 0
        });
        if (typeof this.ytPlayer.unMute === 'function' && this.ytPlayer.isMuted()) {
          this.ytPlayer.unMute();
        }
        if (typeof this.ytPlayer.setVolume === 'function') {
          this.ytPlayer.setVolume(100);
        }
        if (typeof this.ytPlayer.seekTo === 'function') {
          this.ytPlayer.seekTo(0, true);
        }
        this.ytPlayer.playVideo();
      } else {
        this.pendingTrack = track;
        this.initYouTube();
      }

      // Reset idle timer from the moment track starts
      this.resetIdleTimer();
    }

    playNativeTrack(track) {
      this.playbackMode = 'native';
      this.stopSynth();
      this.stopProgressTracker();
      if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
        this.ytPlayer.pauseVideo();
      }
      this.currentTrack = track;
      this.lastPlayedTrack = track;

      // Update UI matching "Example two: Playing [Song Name]"
      const playPrefix = this.isId() ? 'Memutar' : 'Playing';
      this.nowPlayingTitle.textContent = `${playPrefix} ${track.title}`;
      this.artistName.textContent = track.artist || 'Aethera Music';
      this.artImg.src = track.art;
      this.islandLabel.textContent = `${playPrefix} ${track.title}`;

      // Switch to Playing View
      this.showPlayingView();

      // Audio playback
      this.audio.src = track.previewUrl;
      this.audio.currentTime = 0;
      this.audio.play().catch((e) => {
        console.warn('[Aethera Music] Autoplay intercepted:', e);
      });

      this.resetIdleTimer();
    }

    fallbackSynthesizer(songName) {
      this.playbackMode = 'synth';
      this.stopProgressTracker();
      if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
        this.ytPlayer.pauseVideo();
      }
      if (this.audio) {
        this.audio.pause();
      }

      this.currentTrack = {
        title: songName,
        artist: 'Aethera Sound System // Ambient Harmonic Synthesis',
        art: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23111827"/><circle cx="50" cy="50" r="32" fill="none" stroke="%23FFFFFF" stroke-width="4"/><polygon points="50,26 68,62 32,62" fill="%23FFFFFF"/></svg>',
        previewUrl: null,
        query: songName
      };

      const playPrefix = this.isId() ? 'Memutar' : 'Playing';
      this.nowPlayingTitle.textContent = `${playPrefix} ${songName}`;
      this.artistName.textContent = 'Aethera Ambient Harmonic Flow';
      this.artImg.src = this.currentTrack.art;
      this.islandLabel.textContent = `${playPrefix} ${songName}`;
      this.curTime.textContent = '0:00';
      this.totTime.textContent = '∞';
      this.progressFill.style.width = '100%';

      this.showPlayingView();
      this.startSynth();
      this.setPlayingUIState(true);
      this.resetIdleTimer();
    }

    startSynth() {
      this.stopSynth();
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.synthContext = new AudioCtx();
        const notes = [261.63, 329.63, 392.0, 523.25, 659.25]; // C major pentatonic
        let noteIndex = 0;

        this.synthInterval = setInterval(() => {
          if (!this.synthContext || this.synthContext.state === 'closed') return;
          const osc = this.synthContext.createOscillator();
          const gain = this.synthContext.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(notes[noteIndex % notes.length], this.synthContext.currentTime);
          noteIndex++;

          gain.gain.setValueAtTime(0.08, this.synthContext.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.synthContext.currentTime + 1.2);

          osc.connect(gain);
          gain.connect(this.synthContext.destination);

          osc.start();
          osc.stop(this.synthContext.currentTime + 1.2);
        }, 600);
      } catch (e) {
        console.warn('Web Audio synthesis error:', e);
      }
    }

    stopSynth() {
      if (this.synthInterval) {
        clearInterval(this.synthInterval);
        this.synthInterval = null;
      }
      if (this.synthContext) {
        try {
          this.synthContext.close();
        } catch (e) {}
        this.synthContext = null;
      }
    }

    showPlayingView() {
      this.inputView.style.display = 'none';
      this.playingView.style.display = 'flex';
      this.headerText.textContent = this.isId() ? 'Sedang Diputar' : 'Now Playing';
      this.resetIdleTimer();
      setTimeout(() => this.updateControlsScroll(), 60);
    }

    updateControlsScroll() {
      if (!this.controlsRow) return;
      const hasOverflow = this.controlsRow.scrollWidth > this.controlsRow.clientWidth + 2;
      if (!hasOverflow) {
        this.controlsRow.classList.remove('has-overflow-right', 'has-overflow-left', 'has-overflow-both');
        return;
      }
      const canScrollLeft = this.controlsRow.scrollLeft > 4;
      const canScrollRight = this.controlsRow.scrollLeft < (this.controlsRow.scrollWidth - this.controlsRow.clientWidth - 4);

      if (canScrollLeft && canScrollRight) {
        this.controlsRow.classList.add('has-overflow-both');
        this.controlsRow.classList.remove('has-overflow-left', 'has-overflow-right');
      } else if (canScrollLeft) {
        this.controlsRow.classList.add('has-overflow-left');
        this.controlsRow.classList.remove('has-overflow-right', 'has-overflow-both');
      } else if (canScrollRight) {
        this.controlsRow.classList.add('has-overflow-right');
        this.controlsRow.classList.remove('has-overflow-left', 'has-overflow-both');
      } else {
        this.controlsRow.classList.remove('has-overflow-right', 'has-overflow-left', 'has-overflow-both');
      }
    }

    showInputView() {
      this.inputView.style.display = 'flex';
      this.playingView.style.display = 'none';
      this.headerText.textContent = this.isId() ? 'Putar Musik' : 'Play a music';
      this.promptInput.focus();
      this.isTyping = true;
      this.clearIdleTimer();
    }

    togglePlayPause() {
      if (this.playbackMode === 'youtube' && this.ytPlayer) {
        const state =
          typeof this.ytPlayer.getPlayerState === 'function' ? this.ytPlayer.getPlayerState() : -1;
        if (state === 1) {
          // playing
          this.ytPlayer.pauseVideo();
        } else {
          this.ytPlayer.playVideo();
        }
        return;
      }

      if (this.playbackMode === 'synth') {
        if (this.synthInterval) {
          this.stopSynth();
          this.setPlayingUIState(false);
        } else {
          this.startSynth();
          this.setPlayingUIState(true);
        }
        return;
      }

      if (!this.audio || !this.audio.src) return;
      if (this.audio.paused) {
        this.audio.play();
      } else {
        this.audio.pause();
      }
    }

    setPlayingUIState(isPlaying) {
      this.isPlaying = isPlaying;
      if (isPlaying) {
        this.playSvg.style.display = 'none';
        this.pauseSvg.style.display = 'block';
        if (this.islandPlaySvg) this.islandPlaySvg.style.display = 'none';
        if (this.islandPauseSvg) this.islandPauseSvg.style.display = 'block';

        // Animate wave bars
        document.querySelectorAll('.music-wave-bar').forEach((bar) => bar.classList.add('animating'));

        // Sync Quick Access Dock Button Indicator
        const qaDot = document.getElementById('qa-music-dot');
        if (qaDot) qaDot.classList.add('active');
        const qaBtn = document.getElementById('qa-music-btn');
        if (qaBtn) qaBtn.classList.add('active');
      } else {
        this.playSvg.style.display = 'block';
        this.pauseSvg.style.display = 'none';
        if (this.islandPlaySvg) this.islandPlaySvg.style.display = 'block';
        if (this.islandPauseSvg) this.islandPauseSvg.style.display = 'none';

        // Stop wave bars
        document.querySelectorAll('.music-wave-bar').forEach((bar) => bar.classList.remove('animating'));

        // Sync Quick Access Dock Button Indicator
        const qaDot = document.getElementById('qa-music-dot');
        if (qaDot) qaDot.classList.remove('active');
        const qaBtn = document.getElementById('qa-music-btn');
        if (qaBtn) qaBtn.classList.remove('active');
      }
    }

    onTimeUpdate() {
      if (!this.audio || !this.audio.duration) return;
      const current = this.audio.currentTime;
      const duration = this.audio.duration;
      const percent = (current / duration) * 100;

      this.progressFill.style.width = `${percent}%`;
      this.curTime.textContent = this.formatTime(current);
      this.totTime.textContent = this.formatTime(duration);
    }

    onAudioEnded() {
      this.setPlayingUIState(false);
      this.progressFill.style.width = '0%';
      this.curTime.textContent = '0:00';

      // Automatically play next song in queue if available, else trigger Autoplay
      if (this.queue && this.queue.length > 0) {
        setTimeout(() => {
          this.playNextInQueue();
        }, 500);
      } else if (this.isAutoplayEnabled) {
        setTimeout(() => {
          this.triggerAutoplay();
        }, 600);
      }
    }

    onAudioError() {
      if (this.currentTrack && this.currentTrack.query) {
        this.fallbackSynthesizer(this.currentTrack.query);
      }
    }

    stopAudio() {
      if (
        this.playbackMode === 'youtube' &&
        this.ytPlayer &&
        typeof this.ytPlayer.pauseVideo === 'function'
      ) {
        this.ytPlayer.pauseVideo();
        this.stopProgressTracker();
      }
      if (this.audio) {
        this.audio.pause();
        this.audio.currentTime = 0;
      }
      this.stopSynth();
      this.setPlayingUIState(false);
    }

    formatTime(seconds) {
      if (isNaN(seconds) || seconds < 0) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    /* --- MUSIC QUEUE CONTROLLER --- */
    async addToQueue(rawQuery) {
      const songQuery = this.cleanSongQuery(rawQuery);
      if (!songQuery) {
        this.showToast('Please enter a music title to queue');
        return;
      }

      // If nothing is currently loaded or playing, immediately play the requested song
      if (!this.currentTrack || (!this.isPlaying && this.inputView && this.inputView.style.display !== 'none')) {
        this.handlePlayRequest(songQuery);
        return;
      }

      this.showToast(`Searching YouTube Music for "${songQuery}"...`);

      try {
        // 1. Check backend YouTube Music search
        const res = await fetch(`/api/music/search?q=${encodeURIComponent(songQuery)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.videoId) {
            const track = {
              title: data.title || songQuery,
              artist: data.artist ? `${data.artist} • YouTube Music` : 'YouTube Music',
              art: data.thumbnail || `https://i.ytimg.com/vi/${data.videoId}/hqdefault.jpg`,
              videoId: data.videoId,
              alternates: data.alternates || [],
              query: songQuery,
              source: 'YouTube Music'
            };
            this.queue.push(track);
            this.updateQueueUI();
            this.showToast(`Added to queue: ${track.title}`);
            this.resetIdleTimer();
            return;
          }
        }

        // 2. Fallback to iTunes preview metadata
        const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(songQuery)}&entity=song&limit=5`);
        if (itunesRes.ok) {
          const itunesData = await itunesRes.json();
          if (itunesData.results && itunesData.results.length > 0) {
            const item = itunesData.results[0];
            const track = {
              title: item.trackName,
              artist: item.artistName,
              art: item.artworkUrl100
                ? item.artworkUrl100.replace('100x100bb', '300x300bb')
                : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FFFFFF"><circle cx="12" cy="12" r="10"/></svg>',
              previewUrl: item.previewUrl,
              query: songQuery,
              source: 'native'
            };
            this.queue.push(track);
            this.updateQueueUI();
            this.showToast(`Added to queue: ${track.title}`);
            this.resetIdleTimer();
            return;
          }
        }

        // 3. Fallback synth track
        const synthTrack = {
          title: songQuery,
          artist: 'Aethera Synth Stream',
          art: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23111827"/><circle cx="50" cy="50" r="32" fill="none" stroke="%23FFFFFF" stroke-width="4"/><polygon points="50,26 68,62 32,62" fill="%23FFFFFF"/></svg>',
          query: songQuery,
          source: 'synth'
        };
        this.queue.push(synthTrack);
        this.updateQueueUI();
        this.showToast(`Added to queue: ${synthTrack.title}`);
      } catch (err) {
        console.warn('[Aethera Music] Add to queue error:', err);
        const synthTrack = {
          title: songQuery,
          artist: 'Aethera Ambient Flow',
          art: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23111827"/><circle cx="50" cy="50" r="32" fill="none" stroke="%23FFFFFF" stroke-width="4"/><polygon points="50,26 68,62 32,62" fill="%23FFFFFF"/></svg>',
          query: songQuery,
          source: 'synth'
        };
        this.queue.push(synthTrack);
        this.updateQueueUI();
        this.showToast(`Added to queue: ${synthTrack.title}`);
      }
      this.resetIdleTimer();
    }

    playNextInQueue() {
      if (!this.queue || this.queue.length === 0) {
        this.showToast('Queue is empty');
        return;
      }
      const nextTrack = this.queue.shift();
      this.updateQueueUI();

      if (nextTrack.source === 'youtube' && nextTrack.videoId) {
        this.playYouTubeTrack(nextTrack);
      } else if (nextTrack.source === 'native' && nextTrack.previewUrl) {
        this.playNativeTrack(nextTrack);
      } else if (nextTrack.source === 'synth') {
        this.fallbackSynthesizer(nextTrack.title);
      } else if (nextTrack.videoId) {
        this.playYouTubeTrack(nextTrack);
      } else if (nextTrack.previewUrl) {
        this.playNativeTrack(nextTrack);
      } else {
        this.handlePlayRequest(nextTrack.query || nextTrack.title);
      }

      this.showToast(`Playing next: ${nextTrack.title}`);
      this.resetIdleTimer();
    }

    playQueuedIndex(index) {
      if (index < 0 || index >= this.queue.length) return;
      const [track] = this.queue.splice(index, 1);
      this.updateQueueUI();

      if (track.source === 'youtube' && track.videoId) {
        this.playYouTubeTrack(track);
      } else if (track.source === 'native' && track.previewUrl) {
        this.playNativeTrack(track);
      } else if (track.source === 'synth') {
        this.fallbackSynthesizer(track.title);
      } else if (track.videoId) {
        this.playYouTubeTrack(track);
      } else if (track.previewUrl) {
        this.playNativeTrack(track);
      } else {
        this.handlePlayRequest(track.query || track.title);
      }

      this.showToast(`Playing: ${track.title}`);
      this.resetIdleTimer();
    }

    removeFromQueue(index) {
      if (index < 0 || index >= this.queue.length) return;
      this.queue.splice(index, 1);
      this.updateQueueUI();
      this.showToast(`Removed from queue`);
      this.resetIdleTimer();
    }

    clearQueue() {
      this.queue = [];
      this.updateQueueUI();
      this.showToast('Queue cleared');
      this.resetIdleTimer();
    }

    toggleQueueDrawer(forceState = null) {
      if (!this.queueDrawer) return;
      this.isQueueOpen = (forceState !== null) ? forceState : !this.isQueueOpen;

      if (this.isQueueOpen) {
        this.queueDrawer.style.display = 'flex';
        this.queueDrawer.classList.add('drawer-open');
        if (this.queueBtn) this.queueBtn.classList.add('active');
        if (this.queueQuickInput) {
          setTimeout(() => this.queueQuickInput.focus(), 100);
        }
      } else {
        this.queueDrawer.style.display = 'none';
        this.queueDrawer.classList.remove('drawer-open');
        if (this.queueBtn) this.queueBtn.classList.remove('active');
      }
      this.resetIdleTimer();
    }

    updateQueueUI() {
      const count = this.queue.length;

      // Update badge count
      if (this.queueCounter) {
        this.queueCounter.textContent = count;
        if (count > 0) {
          this.queueCounter.classList.add('has-items');
        } else {
          this.queueCounter.classList.remove('has-items');
        }
      }
      if (this.queueSubcount) {
        this.queueSubcount.textContent = `(${count} song${count === 1 ? '' : 's'})`;
      }

      // Update Next button status
      if (this.nextBtn) {
        if (count > 0) {
          this.nextBtn.disabled = false;
          this.nextBtn.style.opacity = '1';
          this.nextBtn.style.cursor = 'pointer';
          this.nextBtn.title = this.isId() ? `Lanjut ke lagu berikutnya (${this.queue[0].title})` : `Skip to next song (${this.queue[0].title})`;
        } else {
          this.nextBtn.disabled = true;
          this.nextBtn.style.opacity = '0.4';
          this.nextBtn.style.cursor = 'not-allowed';
          this.nextBtn.title = this.isId() ? 'Antrean kosong' : 'Queue is empty';
        }
      }

      // Render queue items list
      if (!this.queueItems) return;
      if (count === 0) {
        const emptyMsg = this.isId() ? 'Antrean kosong. Tambahkan lagu di atas!' : 'Queue is empty. Add songs above!';
        this.queueItems.innerHTML = `
          <div class="music-queue-empty" data-i18n="music.queue_empty">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            <span>${emptyMsg}</span>
          </div>
        `;
        return;
      }

      this.queueItems.innerHTML = this.queue
        .map(
          (item, idx) => `
          <div class="music-queue-item" data-index="${idx}">
            <span class="music-queue-item-num">${idx + 1}</span>
            <div class="music-queue-item-art">
              <img src="${item.art}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23666%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/></svg>'" />
            </div>
            <div class="music-queue-item-meta">
              <div class="music-queue-item-title" title="${item.title}">${item.title}</div>
              <div class="music-queue-item-artist" title="${item.artist}">${item.artist}</div>
            </div>
            <div class="music-queue-item-actions">
              <button type="button" class="music-queue-item-play" data-index="${idx}" title="Play Now">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </button>
              <button type="button" class="music-queue-item-remove" data-index="${idx}" title="Remove from Queue">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
              </button>
            </div>
          </div>
        `
        )
        .join('');

      // Wire item click listeners
      this.queueItems.querySelectorAll('.music-queue-item-play').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          this.playQueuedIndex(idx);
        });
      });

      this.queueItems.querySelectorAll('.music-queue-item-remove').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          this.removeFromQueue(idx);
        });
      });
    }

    showToast(message) {
      if (!this.toast) return;
      this.toast.textContent = message;
      this.toast.style.display = 'block';
      this.toast.classList.remove('toast-hide');
      this.toast.classList.add('toast-show');

      if (this.toastTimeout) {
        clearTimeout(this.toastTimeout);
      }
      this.toastTimeout = setTimeout(() => {
        if (this.toast) {
          this.toast.classList.remove('toast-show');
          this.toast.classList.add('toast-hide');
          setTimeout(() => {
            if (this.toast) this.toast.style.display = 'none';
          }, 250);
        }
      }, 2600);
    }

    /* --- AUTOPLAY CONTROLLER --- */
    toggleAutoplay() {
      this.isAutoplayEnabled = !this.isAutoplayEnabled;
      try {
        localStorage.setItem('aethera_music_autoplay', this.isAutoplayEnabled ? 'true' : 'false');
      } catch (e) {}
      this.updateAutoplayUI();
      this.showToast(this.isAutoplayEnabled ? 'Autoplay: ON (Auto-plays similar songs)' : 'Autoplay: OFF');
    }

    updateAutoplayUI() {
      const isEnabled = !!this.isAutoplayEnabled;
      if (this.autoplayBtn) {
        if (isEnabled) {
          this.autoplayBtn.classList.add('active');
          this.autoplayBtn.title = 'Autoplay: ON (Auto-plays similar songs when ended)';
        } else {
          this.autoplayBtn.classList.remove('active');
          this.autoplayBtn.title = 'Autoplay: OFF (Click to turn ON)';
        }
      }
      if (this.autoplayBadge) {
        this.autoplayBadge.textContent = isEnabled ? 'ON' : 'OFF';
        if (isEnabled) {
          this.autoplayBadge.classList.add('active');
        } else {
          this.autoplayBadge.classList.remove('active');
        }
      }
      if (this.drawerAutoplayBtn) {
        if (isEnabled) {
          this.drawerAutoplayBtn.classList.add('active');
          this.drawerAutoplayBtn.title = 'Autoplay: ON';
        } else {
          this.drawerAutoplayBtn.classList.remove('active');
          this.drawerAutoplayBtn.title = 'Autoplay: OFF';
        }
      }
      if (this.drawerAutoplayStatus) {
        this.drawerAutoplayStatus.textContent = isEnabled ? 'ON' : 'OFF';
      }
    }

    async triggerAutoplay() {
      if (this.isAutoplayLoading) return;
      const lastTrack = this.lastPlayedTrack || this.currentTrack;
      if (!lastTrack) return;

      this.isAutoplayLoading = true;
      this.showToast(`Autoplay: Finding matching song for "${lastTrack.title}"...`);

      try {
        const vid = lastTrack.videoId || '';
        const title = encodeURIComponent(lastTrack.title || '');
        const rawArtist = (lastTrack.artist || '').replace(/\s*•\s*YouTube Music/i, '').trim();
        const artist = encodeURIComponent(rawArtist);

        const res = await fetch(`/api/music/related?videoId=${vid}&title=${title}&artist=${artist}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            let candidate = null;
            if (Array.isArray(data.related) && data.related.length > 0) {
              candidate = data.related.find(t => t.videoId && !this.recentPlayedIds.includes(t.videoId));
            }
            if (!candidate && data.match && data.match.videoId && !this.recentPlayedIds.includes(data.match.videoId)) {
              candidate = data.match;
            }
            if (!candidate && data.match) {
              candidate = data.match;
            }

            if (candidate && candidate.videoId) {
              this.showToast(`Autoplay: Playing "${candidate.title}"`);
              this.playYouTubeTrack({
                title: candidate.title,
                artist: candidate.artist ? `${candidate.artist} • YouTube Music` : 'YouTube Music',
                art: candidate.thumbnail || `https://i.ytimg.com/vi/${candidate.videoId}/hqdefault.jpg`,
                videoId: candidate.videoId,
                alternates: [],
                query: candidate.title,
                source: 'YouTube Music'
              });
              this.isAutoplayLoading = false;
              return;
            }
          }
        }

        // Fallback search: search YouTube Music for same artist or similar
        const fallbackSearchTerm = rawArtist || lastTrack.title;
        if (fallbackSearchTerm) {
          const fbRes = await fetch(`/api/music/search?q=${encodeURIComponent(fallbackSearchTerm + ' songs')}`);
          if (fbRes.ok) {
            const fbData = await fbRes.json();
            if (fbData.success && fbData.videoId && fbData.videoId !== lastTrack.videoId) {
              this.showToast(`Autoplay: Playing "${fbData.title}"`);
              this.playYouTubeTrack({
                title: fbData.title,
                artist: fbData.artist ? `${fbData.artist} • YouTube Music` : 'YouTube Music',
                art: fbData.thumbnail || `https://i.ytimg.com/vi/${fbData.videoId}/hqdefault.jpg`,
                videoId: fbData.videoId,
                alternates: fbData.alternates || [],
                query: fbData.title,
                source: 'YouTube Music'
              });
              this.isAutoplayLoading = false;
              return;
            }
          }
        }
      } catch (err) {
        console.warn('[Aethera Music] Autoplay matching error:', err);
      } finally {
        this.isAutoplayLoading = false;
      }
    }
  }

  function initAetheraMusicPlayer() {
    if (!window.aetheraMusicPlayer) {
      window.aetheraMusicPlayer = new AetheraMusicPlayer();
    }
    return window.aetheraMusicPlayer;
  }

  window.openMusicPlayer = function () {
    const player = initAetheraMusicPlayer();
    if (player) player.showCard();
  };

  window.toggleMusicPlayer = function () {
    const player = initAetheraMusicPlayer();
    if (player) player.toggleCard();
  };

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAetheraMusicPlayer);
  } else {
    initAetheraMusicPlayer();
  }
})();
