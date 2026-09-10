/**
 * AETHERA - LIVE AI STUDIO ENGINE
 * Powered by Google Gemini AI API (gemini-3.6-flash) & KaTeX Math Rendering Engine
 * Features 13+ specialized tools for daily use by Students, Workers and Programmers + Conversational Chatbot.
 */

class AetheraStudio {
  constructor() {
    this.apiKey = "AQ.Ab8RN6J8HBnkMgdOI1Y4GdnsCtJnoV-99LvYF-fbzg_3qOmxDQ";
    this.streamEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:streamGenerateContent?alt=sse";
    this.modelEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent";
    this.currentTheme = localStorage.getItem('aethera-theme') || 'dark';
    if (this.currentTheme === 'cyber') {
      this.currentTheme = 'dark';
      localStorage.setItem('aethera-theme', 'dark');
    }
    this.activeToolKey = 'chatbot';
    this.isGenerating = false;
    this.latestOutputText = '';
    this.chatHistory = [];
    this.currentImage = null; // { mimeType, base64, url, fileName, fileSize }
    
    this.init();
  }

  init() {
    this.initTheme();
    this.initCategoryAccordions();
    this.initToolSelector();
    this.initMobileSidebar();
    this.initPromptRunner();
    this.initImageUpload();
    this.initPreferences();
  }

  initTheme() {
    if (this.currentTheme === 'cyber') {
      this.currentTheme = 'dark';
      localStorage.setItem('aethera-theme', 'dark');
    }
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('aethera-theme', this.currentTheme);
      });
    }
  }

  initCategoryAccordions() {
    const accordions = document.querySelectorAll('.sidebar-category-accordion');
    accordions.forEach(accordion => {
      const header = accordion.querySelector('.sidebar-category-header');
      if (!header) return;

      header.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = accordion.classList.contains('is-open');
        if (isOpen) {
          accordion.classList.remove('is-open');
          header.setAttribute('aria-expanded', 'false');
        } else {
          accordion.classList.add('is-open');
          header.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  triggerCyberLaserAnimation() {
    // Laser animation disabled to prevent distracting flashes
  }

  setCyberTheme(enable = false) {
    // Preserve current theme (dark or light) without forcing green cyber theme
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    const activeToolDisplay = document.getElementById('active-tool-display');
    if (activeToolDisplay && this.activeToolKey) {
      const toolData = AETHERA_DATA.tools[this.activeToolKey];
      if (toolData) {
        activeToolDisplay.textContent = `TOOL: ${toolData.title.toUpperCase()}`;
      }
    }
  }

  initToolSelector() {
    const toolBtns = document.querySelectorAll('.studio-mode-btn');
    const presetsContainer = document.getElementById('studio-presets-container');
    const activeToolDisplay = document.getElementById('active-tool-display');
    const currentToolTag = document.getElementById('current-tool-tag');
    const promptInput = document.getElementById('studio-prompt-input');

    const selectTool = (toolKey, autoExpand = false) => {
      this.activeToolKey = toolKey;
      const toolData = AETHERA_DATA.tools[toolKey] || AETHERA_DATA.tools['chatbot'];
      if (!toolData) return;

      // Always maintain current theme (dark or light) — never force green cyber theme
      document.documentElement.setAttribute('data-theme', this.currentTheme);
      if (activeToolDisplay) {
        activeToolDisplay.textContent = `TOOL: ${toolData.title.toUpperCase()}`;
      }

      toolBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-tool') === toolKey));
      
      const activeBtn = document.querySelector(`.studio-mode-btn[data-tool="${toolKey}"]`);
      if (activeBtn) {
        activeBtn.style.display = '';
        if (autoExpand) {
          const parentAccordion = activeBtn.closest('.sidebar-category-accordion');
          if (parentAccordion && !parentAccordion.classList.contains('is-open')) {
            parentAccordion.classList.add('is-open');
            const header = parentAccordion.querySelector('.sidebar-category-header');
            if (header) header.setAttribute('aria-expanded', 'true');
          }
        }
      }
      
      if (currentToolTag) currentToolTag.textContent = toolData.tag;
      if (promptInput) promptInput.placeholder = toolData.placeholder;

      // Reset chat history and attached image when switching tools
      this.chatHistory = [];
      this.clearAttachedImage();

      // Populate Presets
      if (presetsContainer) {
        presetsContainer.innerHTML = '';
        toolData.presets.forEach(preset => {
          const chip = document.createElement('div');
          chip.className = 'studio-preset-item';
          chip.textContent = preset;
          chip.addEventListener('click', () => {
            if (promptInput) {
              promptInput.value = preset;
              this.executeAIRequest();
            }
          });
          presetsContainer.appendChild(chip);
        });
      }

      this.closeMobileSidebar();
    };

    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-tool');
        selectTool(key);
      });
    });

    // Initial load with URL params support (default collapsed; user drops down manually)
    const urlParams = new URLSearchParams(window.location.search);
    const initialTool = urlParams.get('tool') || 'chatbot';
    selectTool(initialTool, false);

    const initialQuery = urlParams.get('q');
    if (initialQuery && promptInput) {
      promptInput.value = initialQuery;
      setTimeout(() => this.executeAIRequest(), 400);
    }
  }

  /* ==========================================================================
     MOBILE TOOLS DRAWER CONTROLLER
     ========================================================================== */
  initMobileSidebar() {
    const mobileToolBtn = document.getElementById('mobile-tool-btn');
    const sidebar = document.getElementById('studio-sidebar-left');
    const closeBtn = document.getElementById('mobile-sidebar-close');
    const backdrop = document.getElementById('studio-drawer-backdrop');

    if (mobileToolBtn && sidebar) {
      mobileToolBtn.addEventListener('click', () => {
        const isOpen = sidebar.classList.contains('mobile-open');
        if (isOpen) {
          this.closeMobileSidebar();
        } else {
          this.openMobileSidebar();
        }
      });

      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeMobileSidebar());
      }

      if (backdrop) {
        backdrop.addEventListener('click', () => this.closeMobileSidebar());
      }

      // Close on Escape Key
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('mobile-open')) {
          this.closeMobileSidebar();
        }
      });
    }
  }

  openMobileSidebar() {
    const mobileToolBtn = document.getElementById('mobile-tool-btn');
    const sidebar = document.getElementById('studio-sidebar-left');
    const backdrop = document.getElementById('studio-drawer-backdrop');
    if (sidebar) {
      sidebar.classList.add('mobile-open');
      if (mobileToolBtn) mobileToolBtn.setAttribute('aria-expanded', 'true');
    }
    if (backdrop) {
      backdrop.classList.add('active');
      backdrop.setAttribute('aria-hidden', 'false');
    }
    document.body.style.overflow = 'hidden';
  }

  closeMobileSidebar() {
    const mobileToolBtn = document.getElementById('mobile-tool-btn');
    const sidebar = document.getElementById('studio-sidebar-left');
    const backdrop = document.getElementById('studio-drawer-backdrop');
    if (sidebar && sidebar.classList.contains('mobile-open')) {
      sidebar.classList.remove('mobile-open');
      if (mobileToolBtn) mobileToolBtn.setAttribute('aria-expanded', 'false');
    }
    if (backdrop && backdrop.classList.contains('active')) {
      backdrop.classList.remove('active');
      backdrop.setAttribute('aria-hidden', 'true');
    }
    document.body.style.overflow = '';
  }

  initPromptRunner() {
    const runBtn = document.getElementById('studio-run-btn');
    const promptInput = document.getElementById('studio-prompt-input');
    const clearBtn = document.getElementById('clear-chat-btn');
    const copyBtn = document.getElementById('studio-copy-btn');

    if (runBtn) runBtn.addEventListener('click', () => this.executeAIRequest());
    if (promptInput) {
      promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.executeAIRequest();
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.chatHistory = [];
        this.clearAttachedImage();
        const chatStream = document.getElementById('chat-messages-container');
        if (chatStream) {
          chatStream.innerHTML = `
            <div class="chat-bubble system-message">
              <div class="bubble-header">
                <div class="bubble-avatar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                </div>
                <span class="bubble-author">Aethera Cortex // Live AI Assistant</span>
                <span class="bubble-time">SESSION RESET</span>
              </div>
              <div class="bubble-content">
                <p>Workspace cleared. Choose any tool and ask a new question or attach an image.</p>
              </div>
            </div>
          `;
        }
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (this.latestOutputText) {
          navigator.clipboard.writeText(this.latestOutputText);
          const orig = copyBtn.innerHTML;
          copyBtn.innerHTML = '<span>✓ Copied</span>';
          setTimeout(() => { copyBtn.innerHTML = orig; }, 1800);
        }
      });
    }

    // Check for pending prompt from homepage session
    const pending = sessionStorage.getItem('aethera-pending-prompt');
    if (pending) {
      sessionStorage.removeItem('aethera-pending-prompt');
      if (promptInput) promptInput.value = pending;
      setTimeout(() => this.executeAIRequest(), 400);
    }
  }

  /* ==========================================================================
     IMAGE UPLOAD, CLIPBOARD PASTE & DRAG-AND-DROP CONTROLLER
     ========================================================================== */
  initImageUpload() {
    const attachBtn = document.getElementById('studio-attach-btn');
    const imageInput = document.getElementById('studio-image-input');
    const removeBtn = document.getElementById('studio-image-remove-btn');
    const dropZone = document.getElementById('studio-drop-zone') || document.querySelector('.studio-input-box');
    const promptInput = document.getElementById('studio-prompt-input');

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

    // Drag and Drop Handling
    if (dropZone) {
      ['dragenter', 'dragover'].forEach(name => {
        dropZone.addEventListener(name, (e) => {
          e.preventDefault();
          dropZone.classList.add('drag-active');
        });
      });
      ['dragleave', 'drop'].forEach(name => {
        dropZone.addEventListener(name, (e) => {
          e.preventDefault();
          dropZone.classList.remove('drag-active');
        });
      });
      dropZone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleImageFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Direct Clipboard Screenshot Paste (Ctrl+V / Cmd+V)
    if (promptInput) {
      promptInput.addEventListener('paste', (e) => {
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
      alert("Please upload a valid image (PNG, JPEG, WebP, GIF, HEIC).");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert("Image exceeds 20MB limit. Please upload a smaller image file.");
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
    const previewBar = document.getElementById('studio-image-preview-bar');
    const previewThumb = document.getElementById('studio-image-preview-thumb');
    const previewName = document.getElementById('studio-image-name');
    const previewSize = document.getElementById('studio-image-size');

    if (previewBar && this.currentImage) {
      if (previewThumb) previewThumb.src = this.currentImage.url;
      if (previewName) previewName.textContent = this.currentImage.fileName;
      if (previewSize) previewSize.textContent = this.currentImage.fileSize;
      previewBar.style.display = 'flex';
    }
  }

  clearAttachedImage() {
    this.currentImage = null;
    const previewBar = document.getElementById('studio-image-preview-bar');
    const imageInput = document.getElementById('studio-image-input');
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

  initPreferences() {
    const langSelect = document.getElementById('param-lang-select');
    const langVal = document.getElementById('param-lang-val');
    if (langSelect && langVal) {
      langSelect.addEventListener('change', () => {
        langVal.textContent = langSelect.options[langSelect.selectedIndex].text;
      });
    }

    const detailSelect = document.getElementById('param-detail-select');
    const detailVal = document.getElementById('param-detail-val');
    if (detailSelect && detailVal) {
      detailSelect.addEventListener('change', () => {
        detailVal.textContent = detailSelect.options[detailSelect.selectedIndex].text;
      });
    }
  }

  async executeAIRequest() {
    if (this.isGenerating) return;

    const promptInput = document.getElementById('studio-prompt-input');
    const chatContainer = document.getElementById('chat-messages-container');
    const runBtnText = document.getElementById('run-btn-text');
    const promptText = promptInput ? promptInput.value.trim() : '';

    // Check if user has provided text or an attached image
    if (!promptText && !this.currentImage) return;
    if (!chatContainer) return;

    const attachedImage = this.currentImage;
    this.clearAttachedImage(); // Clear preview from input box immediately

    this.isGenerating = true;
    if (runBtnText) runBtnText.textContent = "Processing...";
    if (promptInput) promptInput.value = '';

    // 1. Append User Message Bubble with image thumbnail if attached
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user-message';

    let userContentHtml = '';
    if (attachedImage) {
      userContentHtml += `
        <div class="user-bubble-image-wrapper">
          <img src="${attachedImage.url}" alt="${this.escapeHtml(attachedImage.fileName)}" class="user-msg-image" onclick="window.open('${attachedImage.url}', '_blank')">
        </div>
      `;
    }
    if (promptText) {
      userContentHtml += `<p>${this.escapeHtml(promptText)}</p>`;
    } else {
      userContentHtml += `<p style="font-style: italic; opacity: 0.85;">[Attached Image for Visual Analysis]</p>`;
    }

    userBubble.innerHTML = `
      <div class="bubble-header">
        <div class="bubble-avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>
        </div>
        <span class="bubble-author">You</span>
        <span class="bubble-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="bubble-content">${userContentHtml}</div>
    `;
    chatContainer.appendChild(userBubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // 2. Append AI Loading Placeholder Bubble
    const toolData = AETHERA_DATA.tools[this.activeToolKey] || { title: 'Assistant', systemPrompt: '' };
    const aiBubble = document.createElement('div');
    aiBubble.className = 'chat-bubble ai-message';
    aiBubble.innerHTML = `
      <div class="bubble-header">
        <div class="bubble-avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
        </div>
        <span class="bubble-author">Aethera Cortex // ${toolData.title}</span>
        <span class="bubble-time status-tag">CALLING GEMINI VISION API...</span>
      </div>
      <div class="bubble-content ai-stream-content">
        <div class="loading-pulse-dots">
          <span>●</span> <span>●</span> <span>●</span>
          <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">Synthesizing multimodal response &amp; LaTeX math...</span>
        </div>
      </div>
    `;
    chatContainer.appendChild(aiBubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // 3. Build Multi-Turn Conversation Payload with vision parts
    const detailPref = document.getElementById('param-detail-select')?.value || 'detailed';
    const langPref = document.getElementById('param-lang-select')?.value || 'auto';

    const systemInstructionText = `${toolData.systemPrompt}
Preference: ${detailPref} explanation. Target Language / Format: ${langPref}.
Important: If an image is provided, analyze all visual elements, diagrams, formulas, text, handwritten notes, or code accurately. Format all mathematical equations in LaTeX using $$...$$ for display equations and $...$ for inline equations. Use clean Markdown formatting and language-tagged code blocks.`;

    const userParts = [];
    if (promptText) {
      userParts.push({ text: promptText });
    } else {
      userParts.push({ text: "Please analyze this image according to the active tool instructions." });
    }

    if (attachedImage) {
      userParts.push({
        inlineData: {
          mimeType: attachedImage.mimeType,
          data: attachedImage.base64
        }
      });
    }

    this.chatHistory.push({ role: "user", parts: userParts });
    const recentHistory = this.chatHistory.slice(-10);

    const payload = {
      system_instruction: {
        parts: [{ text: systemInstructionText }]
      },
      contents: recentHistory,
      generationConfig: {
        maxOutputTokens: 1400,
        temperature: 0.7
      }
    };

    let generatedText = "";
    const contentEl = aiBubble.querySelector('.ai-stream-content');
    const timeTag = aiBubble.querySelector('.status-tag');

    try {
      // SSE Real-Time Streaming for instant first-token display
      const response = await fetch(`${this.streamEndpoint}&key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const jsonStr = trimmed.slice(5).trim();
            if (jsonStr) {
              try {
                const chunk = JSON.parse(jsonStr);
                if (chunk.candidates && chunk.candidates[0]?.content?.parts) {
                  const chunkText = chunk.candidates[0].content.parts.map(p => p.text || '').join('');
                  if (chunkText) {
                    generatedText += chunkText;
                    this.latestOutputText = generatedText;
                    if (contentEl) {
                      contentEl.innerHTML = this.formatMarkdown(generatedText);
                    }
                    if (timeTag) {
                      timeTag.textContent = "GENERATING...";
                    }
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                  }
                }
              } catch (e) {
                // Incomplete chunk
              }
            }
          }
        }
      }

      if (!generatedText) {
        generatedText = "No response generated by model.";
        if (contentEl) contentEl.innerHTML = `<p>${generatedText}</p>`;
      } else {
        this.chatHistory.push({ role: "model", parts: [{ text: generatedText }] });
      }

      if (timeTag) timeTag.textContent = `COMPLETED // ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      this.attachSaveToDBButton(aiBubble, promptText, generatedText);

    } catch (err) {
      // Fallback to standard generateContent if streaming is interrupted
      try {
        const fbRes = await fetch(`${this.modelEndpoint}?key=${this.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const fbData = await fbRes.json();
        if (fbData.candidates && fbData.candidates[0]?.content?.parts) {
          generatedText = fbData.candidates[0].content.parts.map(p => p.text).join('\n');
          this.chatHistory.push({ role: "model", parts: [{ text: generatedText }] });
          this.latestOutputText = generatedText;
          if (contentEl) contentEl.innerHTML = this.formatMarkdown(generatedText);
          if (timeTag) timeTag.textContent = `COMPLETED // ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
          this.attachSaveToDBButton(aiBubble, promptText, generatedText);
          chatContainer.scrollTop = chatContainer.scrollHeight;
          return;
        }
      } catch (fbErr) {
        // Fallback error
      }

      if (contentEl) {
        contentEl.innerHTML = `<p style="color: var(--text-muted);">[Network Error]: Unable to reach AI endpoint. ${this.escapeHtml(err.message)}</p>`;
      }
    } finally {
      this.isGenerating = false;
      if (runBtnText) runBtnText.textContent = "Run AI";
    }
  }

  attachSaveToDBButton(aiBubble, promptText, responseText) {
    if (!aiBubble || !responseText) return;
    const header = aiBubble.querySelector('.bubble-header');
    if (!header || header.querySelector('.btn-save-chat')) return;

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-save-chat';
    saveBtn.title = 'Save this response to your User Database profile';
    saveBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
      <span>Save to DB</span>
    `;

    saveBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!window.aetheraDB) return;

      if (!window.aetheraDB.isLoggedIn()) {
        if (window.aetheraAuthUI) {
          window.aetheraAuthUI.openAuthModal('login');
        }
        return;
      }

      try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<span>Saving...</span>`;
        await window.aetheraDB.saveUserChat({
          toolKey: this.activeToolKey,
          title: `${(AETHERA_DATA.tools[this.activeToolKey]?.title || 'AI Output')} // ${promptText.substring(0, 30)}...`,
          prompt: promptText,
          response: responseText
        });
        saveBtn.className = 'btn-save-chat saved';
        saveBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Saved to DB</span>
        `;
      } catch (err) {
        saveBtn.disabled = false;
        alert('Failed to save to database: ' + err.message);
      }
    });

    header.appendChild(saveBtn);
  }

  streamFormattedOutput(container, markdownText, scrollParent) {
    container.innerHTML = this.formatMarkdown(markdownText);
    scrollParent.scrollTop = scrollParent.scrollHeight;
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
      const language = lang || 'code';
      placeholders[key] = `<div class="code-block-wrapper">
        <div class="code-block-header">
          <span>${language.toUpperCase()}</span>
          <button class="copy-code-btn" onclick="navigator.clipboard.writeText(\`${this.escapeForCopy(code.trim())}\`); this.textContent='Copied!'; setTimeout(()=>this.textContent='Copy', 1500);">Copy</button>
        </div>
        <pre><code class="language-${language}">${this.escapeHtml(code.trim())}</code></pre>
      </div>`;
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
    processed = processed.replace(/^### (.*$)/gim, '<h4 style="font-size: 1.05rem; margin: 1rem 0 0.4rem; color: var(--text-primary);">$1</h4>');
    processed = processed.replace(/^## (.*$)/gim, '<h3 style="font-size: 1.15rem; margin: 1.25rem 0 0.5rem; color: var(--text-primary);">$1</h3>');
    processed = processed.replace(/^# (.*$)/gim, '<h2 style="font-size: 1.3rem; margin: 1.5rem 0 0.6rem; color: var(--text-primary);">$1</h2>');

    // Bullet points & blockquotes
    processed = processed.replace(/^\s*[-*]\s+(.*$)/gim, '<li style="margin-left: 1.25rem; margin-bottom: 0.35rem;">$1</li>');
    processed = processed.replace(/^\s*&gt;\s+(.*$)/gim, '<blockquote style="border-left: 2px solid var(--border-focus); padding-left: 0.75rem; margin: 0.5rem 0; color: var(--text-secondary);">$1</blockquote>');

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
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  escapeForCopy(str) {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$');
  }
}

// Initialize AI Studio Engine
document.addEventListener('DOMContentLoaded', () => {
  window.aetheraStudio = new AetheraStudio();
});
