/**
 * AETHERA - LIVE MULTI-TURN AI CHATBOT CONTROLLER (INSTA DM / WHATSAPP STYLE)
 * Powered by Google Gemini API (gemini-3.6-flash) & KaTeX LaTeX Math Engine
 */

class AetheraChatbot {
  constructor() {
    this.apiKey = "AQ.Ab8RN6I4ikfVVJKKEbTRKqzUH7v1CPlCebqK6hpat_ZFGPbS0w";
    this.endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";
    this.isOpen = false;
    this.isGenerating = false;
    this.history = [];
    this.currentImage = null; // { mimeType, base64, url, fileName, fileSize }
    this.systemInstruction = "You are Aethera AI, an intelligent, conversational multimodal companion and tutor for students, workers, and developers. Answer questions directly, format code with language tags, format all mathematical formulas in standard LaTeX ($$...$$ for display math and $...$ for inline math). If an image is provided (photo, screenshot, math problem, document, chart, diagram), analyze and extract all details with high visual accuracy.";
    
    this.init();
  }

  init() {
    this.renderWidget();
    this.bindEvents();
    this.bindImageUpload();
  }

  renderWidget() {
    if (document.getElementById('aethera-chatbot-container')) return;

    const container = document.createElement('div');
    container.id = 'aethera-chatbot-container';
    container.innerHTML = `
      <!-- Floating Launcher Pill Button -->
      <button id="chatbot-launcher" class="chatbot-launcher-btn" aria-label="Open Aethera AI Chatbot" title="Chat with Aethera AI">
        <span class="chatbot-status-dot"></span>
        <div class="chatbot-launcher-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <span>Aethera Chat</span>
      </button>

      <!-- Floating Chatbot Window Dialog -->
      <div id="chatbot-window" class="chatbot-window" role="dialog" aria-modal="true" aria-hidden="true">
        <!-- Header -->
        <div class="chatbot-header">
          <div class="chatbot-header-info">
            <div class="chatbot-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            </div>
            <div>
              <div class="chatbot-title">Aethera Assistant</div>
              <div class="chatbot-status-text">Active now // Vision &amp; Free AI</div>
            </div>
          </div>
          <div class="chatbot-header-actions">
            <button id="chatbot-clear-btn" class="chatbot-action-btn" title="Clear Conversation">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
            <button id="chatbot-close-btn" class="chatbot-action-btn" title="Minimize Chat">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <!-- Messenger Style Message Stream -->
        <div id="chatbot-messages" class="chatbot-messages">
          <div class="chatbot-date-pill">Today</div>
          
          <!-- Initial Welcome Message from Bot (Left-aligned DM bubble) -->
          <div class="chatbot-msg-row bot">
            <div class="bot-mini-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            </div>
            <div class="chatbot-bubble">
              <div class="msg-text">
                <p>Hey! I am <strong>Aethera AI</strong>. How can I help with your code, math problems, homework photos, daily tasks, or study concepts today?</p>
              </div>
              <div class="msg-meta">
                <span>${this.getCurrentTime()}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Suggestion Chips -->
        <div class="chatbot-suggestions">
          <div class="chatbot-chip" data-query="Evaluate Gaussian integral: \int_0^\infty e^{-x^2} dx">Gaussian Integral</div>
          <div class="chatbot-chip" data-query="Explain quantum computing in simple terms">Quantum Computing</div>
          <div class="chatbot-chip" data-query="Help me write a binary search in Python">Binary Search</div>
          <div class="chatbot-chip" data-query="Draft polite follow-up email after an interview">Interview Email</div>
        </div>

        <!-- Chatbot Image Attachment Preview Bar -->
        <div id="chatbot-image-preview-bar" class="chatbot-image-preview-bar" style="display: none;">
          <div class="chatbot-preview-content">
            <img id="chatbot-image-preview-thumb" class="chatbot-preview-thumb" src="" alt="Attached preview">
            <div class="chatbot-preview-details">
              <span id="chatbot-image-name" class="chatbot-preview-filename">image.png</span>
              <span id="chatbot-image-size" class="chatbot-preview-filesize">0 KB</span>
            </div>
          </div>
          <button id="chatbot-image-remove-btn" class="chatbot-preview-remove-btn" title="Remove image" aria-label="Remove image">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Input Area -->
        <div class="chatbot-input-area" id="chatbot-drop-zone">
          <button id="chatbot-attach-btn" class="chatbot-attach-btn" title="Attach Image or Screenshot (or paste with Ctrl+V)" type="button">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <input type="file" id="chatbot-image-input" accept="image/*" style="display: none;">

          <textarea id="chatbot-input" class="chatbot-input" placeholder="Message Aethera, attach photo, or paste screenshot..." rows="1"></textarea>
          <button id="chatbot-send-btn" class="chatbot-send-btn" title="Send Message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
  }

  bindEvents() {
    const launcher = document.getElementById('chatbot-launcher');
    const closeBtn = document.getElementById('chatbot-close-btn');
    const clearBtn = document.getElementById('chatbot-clear-btn');
    const sendBtn = document.getElementById('chatbot-send-btn');
    const input = document.getElementById('chatbot-input');
    const chips = document.querySelectorAll('.chatbot-chip');

    if (launcher) launcher.addEventListener('click', () => this.toggleWindow());
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeWindow());
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearChat());

    if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = `${Math.min(input.scrollHeight, 90)}px`;
      });
    }

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const query = chip.getAttribute('data-query');
        if (query && input) {
          input.value = query;
          this.sendMessage();
        }
      });
    });
  }

  bindImageUpload() {
    const attachBtn = document.getElementById('chatbot-attach-btn');
    const imageInput = document.getElementById('chatbot-image-input');
    const removeBtn = document.getElementById('chatbot-image-remove-btn');
    const dropZone = document.getElementById('chatbot-drop-zone') || document.querySelector('.chatbot-input-area');
    const input = document.getElementById('chatbot-input');

    if (attachBtn && imageInput) {
      attachBtn.addEventListener('click', (e) => {
        e.preventDefault();
        imageInput.click();
      });
      imageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleImageFile(e.target.files[0]);
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.clearAttachedImage();
      });
    }

    // Drag & drop on chatbot
    if (dropZone) {
      ['dragenter', 'dragover'].forEach(name => {
        dropZone.addEventListener(name, (e) => {
          e.preventDefault();
        });
      });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleImageFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Direct clipboard paste
    if (input) {
      input.addEventListener('paste', (e) => {
        const items = (e.clipboardData || window.clipboardData)?.items;
        if (!items) return;
        for (let item of items) {
          if (item.type && item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              this.handleImageFile(file);
              break;
            }
          }
        }
      });
    }
  }

  handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert("Please upload an image file (PNG, JPEG, WebP, GIF).");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert("Image exceeds 20MB limit. Please upload a smaller file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const base64Data = dataUrl.split(',')[1];
      const mimeType = file.type || 'image/png';

      this.currentImage = {
        mimeType: mimeType,
        base64: base64Data,
        url: dataUrl,
        fileName: file.name || 'Pasted-Screenshot.png',
        fileSize: this.formatFileSize(file.size)
      };

      this.renderImagePreview();
    };
    reader.readAsDataURL(file);
  }

  renderImagePreview() {
    const previewBar = document.getElementById('chatbot-image-preview-bar');
    const previewThumb = document.getElementById('chatbot-image-preview-thumb');
    const previewName = document.getElementById('chatbot-image-name');
    const previewSize = document.getElementById('chatbot-image-size');

    if (previewBar && this.currentImage) {
      if (previewThumb) previewThumb.src = this.currentImage.url;
      if (previewName) previewName.textContent = this.currentImage.fileName;
      if (previewSize) previewSize.textContent = this.currentImage.fileSize;
      previewBar.style.display = 'flex';
    }
  }

  clearAttachedImage() {
    this.currentImage = null;
    const previewBar = document.getElementById('chatbot-image-preview-bar');
    const imageInput = document.getElementById('chatbot-image-input');
    if (previewBar) previewBar.style.display = 'none';
    if (imageInput) imageInput.value = '';
  }

  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }


  getCurrentTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  renderLatex(latex, isDisplay = false) {
    if (typeof katex !== 'undefined') {
      try {
        return katex.renderToString(latex.trim(), {
          displayMode: isDisplay,
          throwOnError: false,
          output: 'htmlAndMathml'
        });
      } catch (e) {
        console.warn('KaTeX render error:', e);
      }
    }
    return `<span class="math-fallback ${isDisplay ? 'math-display' : 'math-inline'}">${this.escapeHtml(latex)}</span>`;
  }

  formatMarkdown(text) {
    if (!text) return '';

    const placeholders = {};
    let placeholderIndex = 0;

    // 1. Preserve Code Blocks
    let processed = text.replace(/```([a-zA-Z0-9_\-+#]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const key = `%%CODE_BLOCK_${placeholderIndex++}%%`;
      placeholders[key] = `<pre><code class="language-${lang || 'code'}">${this.escapeHtml(code.trim())}</code></pre>`;
      return key;
    });

    // 2. Preserve Inline Code
    processed = processed.replace(/`([^`\n]+)`/g, (match, code) => {
      const key = `%%INLINE_CODE_${placeholderIndex++}%%`;
      placeholders[key] = `<code>${this.escapeHtml(code)}</code>`;
      return key;
    });

    // 3. Process Display Math: $$ ... $$
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, tex) => {
      const key = `%%MATH_DISPLAY_${placeholderIndex++}%%`;
      placeholders[key] = `<div class="katex-display-math">${this.renderLatex(tex, true)}</div>`;
      return key;
    });

    // 4. Process Inline Math: $ ... $
    processed = processed.replace(/\$([^\$\n]+?)\$/g, (match, tex) => {
      const key = `%%MATH_INLINE_${placeholderIndex++}%%`;
      placeholders[key] = `<span class="katex-inline-math">${this.renderLatex(tex, false)}</span>`;
      return key;
    });

    // 5. General Markdown Elements
    processed = this.escapeHtml(processed);

    // Bold & Italic
    processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Headings
    processed = processed.replace(/^### (.*$)/gim, '<h4 style="font-size: 0.95rem; margin: 0.5rem 0 0.25rem;">$1</h4>');
    processed = processed.replace(/^## (.*$)/gim, '<h3 style="font-size: 1rem; margin: 0.75rem 0 0.35rem;">$1</h3>');

    // Bullet points
    processed = processed.replace(/^\s*[-*]\s+(.*$)/gim, '<li style="margin-left: 1rem; margin-bottom: 0.2rem;">$1</li>');

    // Line breaks
    processed = processed.replace(/\n\n/g, '<br><br>');
    processed = processed.replace(/\n/g, '<br>');

    // 6. Restore all placeholders (Math, Code blocks, Inline code)
    for (const [key, value] of Object.entries(placeholders)) {
      processed = processed.split(key).join(value);
    }

    return processed;
  }

  escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

// Global Chatbot initialization with immediate-ready fallback
function initAetheraChatbot() {
  if (!window.aetheraChatbot) {
    window.aetheraChatbot = new AetheraChatbot();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAetheraChatbot);
} else {
  initAetheraChatbot();
}

window.openChatbot = function(text = '') {
  if (!window.aetheraChatbot) initAetheraChatbot();
  if (window.aetheraChatbot) window.aetheraChatbot.openWindow(text);
};
