/**
 * AETHERA - HIGH-OCTANE HOMEPAGE CONTROLLER (MONOCHROME B&W EDITION)
 * Features:
 *   - Random Diverse Hero Demo on Every Refresh (Math, Emails, Code, Summaries, Tasks, Resumes, SQL)
 *   - Realistic AI Streaming & Typing Effect for Prompt and Output
 *   - Real-time KaTeX LaTeX Math & Syntax Formatter
 *   - Before/After Transformation Showcase, Benchmark Matrix & FAQ Accordion
 */

class AetheraApp {
  constructor() {
    this.currentTheme = localStorage.getItem('aethera-theme') || 'dark';
    this.activeHeroTab = 'email';
    this.activeScenario = 'notes';
    
    this.typewriterTimer = null;
    this.promptTypewriterTimer = null;
    
    // Comprehensive Diverse Hero Demos (Concise & Short)
    this.heroDemos = {
      "email": {
        tabName: "Email Helper",
        prompt: "Draft a polite, confident message asking for a friendly compensation discussion",
        output: "Subject: Senior Developer Offer — Warm Gratitude & Compensation Discussion\n\nDear Alex, thank you so much for the exciting offer. Given my 5+ years in distributed systems, I'd love to propose a base salary of $165,000. I'm thrilled about the role and looking forward to building together!",
        tag: "EMAIL HELPER // KIND & CLEAR",
        toolLink: "email-drafter"
      },
      "notes": {
        tabName: "Quick Summarizer",
        prompt: "Summarize a 1-hour team meeting transcript into 3 friendly, easy action items",
        output: "QUICK SUMMARY // TEAM SYNC\n\n• Database: Set up Redis caching to make page loads feel instant (Assignee: Alex).\n• Security: Wrap up SOC2 audit logging checklist by Friday.\n• Release: Friendly reminder: 2-week freeze before rollout.",
        tag: "SUMMARIZER // QUICK & SIMPLE",
        toolLink: "doc-summarizer"
      },
      "schedule": {
        tabName: "Day Planner",
        prompt: "Organize an 8-hour workday with balanced time-blocks and breathing room",
        output: "CALM DAILY FLOW // BALANCED DAY\n\n• 09:00 - 11:30 | Focused Work: Solve database bottleneck (with coffee break)\n• 13:00 - 14:30 | Collaborative Architecture Planning\n• 16:00 - 17:00 | Relaxed inbox clearing & wrapping up tasks",
        tag: "DAY PLANNER // CALM & FOCUSED",
        toolLink: "task-planner"
      },
      "resume": {
        tabName: "Job Coach",
        prompt: "Rewrite a resume bullet point so it sounds natural, confident, and impactful",
        output: "Original: 'Sped up website database queries.'\n\n→ Friendly & Impactful Rewrite:\n'Designed Redis read-through caching, helping 1.4M daily active users enjoy super-fast 28ms page load times.'",
        tag: "JOB COACH // RESUME & CAREER",
        toolLink: "resume-builder"
      },
      "calculus": {
        tabName: "Math Tutor",
        prompt: "Explain how to evaluate the definite integral: \\int_0^\\infty x^2 e^{-x^2} dx step-by-step",
        output: "Step-by-Step Explanation:\n$$\\int_0^\\infty x^2 e^{-x^2} dx = \\frac{1}{2} \\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{4}$$\n\nNotice how integration by parts pairs naturally with the Gaussian integral to give this elegant closed form!",
        tag: "MATH TUTOR // CLEAR EXPLANATION",
        toolLink: "math-solver"
      },
      "code": {
        tabName: "Code Explainer",
        prompt: "Explain QuickSort partition logic & efficiency in simple terms",
        output: "QuickSort in Plain English:\n• How fast is it? Average O(N log N), which is very fast for large lists!\n• Memory: Very light on memory since it works right in place.\n• The core idea: Pick a pivot item, slide smaller items to the left and larger to the right.",
        tag: "CODE EXPLAINER // SIMPLE & CLEAR",
        toolLink: "code-explainer"
      },
      "sql": {
        tabName: "SQL Helper",
        prompt: "Write an easy, clean SQL query to find top 5 customers by lifetime order value",
        output: "```sql\nWITH customer_totals AS (\n  SELECT customer_id, SUM(total) AS total_spent\n  FROM orders WHERE status = 'PAID' GROUP BY customer_id\n)\nSELECT * FROM customer_totals ORDER BY total_spent DESC LIMIT 5;\n```",
        tag: "SQL HELPER // EASY QUERIES",
        toolLink: "sql-architect"
      },
      "cyber": {
        tabName: "Safety Checkup",
        prompt: "Review a security vulnerability notice and give me simple steps to stay safe",
        output: "SAFETY CHECKUP // REASSURING ADVICE\n• Notice: Upstream library vulnerability identified.\n• Good News: An easy, stable fix is already available!\n• Simple Fix: Update liblzma to version 5.4.5 or 5.6.1-patch with one easy command.",
        tag: "SECURITY // SAFETY CHECKUP",
        toolLink: "vuln-scanner"
      }
    };

    // Transformation Scenarios Data
    this.transformationScenarios = {
      "notes": {
        title: "1. Raw Meeting Notes ➔ Executive Memo",
        before: "met with dev team. talked about q3 goals. mark said database is slow we need caching redis maybe. sarah wants deadline pushed 2 weeks for frontend auth. budget approved for 3 new engineers next month.",
        after: "EXECUTIVE MEMORANDUM // Q3 ENGINEERING\n\n1. Infrastructure: Deploy Redis caching to resolve database latency bottlenecks (Assignee: Mark).\n2. Timeline: Approved 2-week frontend authentication buffer (Assignee: Sarah).\n3. Headcount: Budget greenlit for 3 new engineering hires in Q3."
      },
      "math": {
        title: "2. Difficult Calculus ➔ Step-by-Step KaTeX Proof",
        before: "solve integral e^(-x^2) dx from 0 to infinity and show why it equals sqrt(pi)/2",
        after: "Gaussian Probability Integral Proof:\nLet $I = \\int_0^\\infty e^{-x^2} dx$. Squaring both sides in polar coordinates:\n$$I^2 = \\int_0^{\\pi/2} d\\theta \\int_0^\\infty r e^{-r^2} dr = \\frac{\\pi}{2} \\left[ -\\frac{e^{-r^2}}{2} \\right]_0^\\infty = \\frac{\\pi}{4}$$\nTaking the square root yields the exact closed form:\n$$I = \\frac{\\sqrt{\\pi}}{2}$$"
      },
      "code": {
        title: "3. Spaghetti Code ➔ Type-Safe Idiomatic Patch",
        before: "function getData(id, cb) { db.query('select * from users where id=' + id, function(e, r) { if(e) { cb(e); } else { cb(null, r); } }); }",
        after: "export async function getUserById(id: string): Promise<User> {\n  const user = await prisma.user.findUnique({\n    where: { id },\n    select: { id: true, email: true, role: true }\n  });\n  if (!user) throw new NotFoundError(`User ${id} does not exist`);\n  return user;\n}"
      },
      "cyber": {
        title: "4. Vulnerability Audit ➔ CVSS & Remediation Patch",
        before: "contract Vault { mapping(address => uint) public balances; function withdraw() public { uint b = balances[msg.sender]; (bool s,) = msg.sender.call{value: b}(''); balances[msg.sender] = 0; } }",
        after: "// Hardened Vault (Checks-Effects-Interactions + ReentrancyGuard)\ncontract SecureVault is ReentrancyGuard {\n  mapping(address => uint256) public balances;\n  function withdraw() external nonReentrant {\n    uint256 amount = balances[msg.sender];\n    require(amount > 0, 'No balance');\n    balances[msg.sender] = 0;\n    (bool sent, ) = msg.sender.call{value: amount}('');\n    require(sent, 'Transfer failed');\n  }\n}"
      }
    };

    this.init();
  }

  init() {
    this.initTheme();
    this.initNavigation();
    this.initMarquee();
    this.initTypewriter();
    this.initHeroSandbox();
    this.initHeroShowcase();
    this.initHeroPrompt();
    this.initTransformationShowcase();
    this.initBenchmarks();
    this.initFAQ();
    this.initSpotlightCards();
  }

  /* ==========================================================================
     THEME CONTROLLER
     ========================================================================== */
  initTheme() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('aethera-theme', this.currentTheme);
      });
    }
  }

  /* ==========================================================================
     SMOOTH NAVIGATION & MOBILE DRAWER CONTROLLER
     ========================================================================== */
  initNavigation() {
    // Smooth Anchor Scrolling for Desktop and Mobile Links
    const navLinks = document.querySelectorAll('.nav-link[href^="#"], .mobile-nav-item[href^="#"]');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          this.closeMobileMenu();
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Mobile Hamburger Menu Drawer Toggle
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileDrawer = document.getElementById('mobile-nav-drawer');
    const mobileCloseBtn = document.getElementById('mobile-nav-close');
    const mobileBackdrop = document.getElementById('mobile-nav-backdrop');

    if (mobileBtn && mobileDrawer) {
      mobileBtn.addEventListener('click', () => {
        const isOpen = mobileDrawer.classList.contains('active');
        if (isOpen) {
          this.closeMobileMenu();
        } else {
          this.openMobileMenu();
        }
      });

      if (mobileCloseBtn) {
        mobileCloseBtn.addEventListener('click', () => this.closeMobileMenu());
      }

      if (mobileBackdrop) {
        mobileBackdrop.addEventListener('click', () => this.closeMobileMenu());
      }

      // Close on Escape Key
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileDrawer.classList.contains('active')) {
          this.closeMobileMenu();
        }
      });
    }
  }

  openMobileMenu() {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileDrawer = document.getElementById('mobile-nav-drawer');
    if (mobileDrawer) {
      mobileDrawer.classList.add('active');
      mobileDrawer.setAttribute('aria-hidden', 'false');
      if (mobileBtn) mobileBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
  }

  closeMobileMenu() {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileDrawer = document.getElementById('mobile-nav-drawer');
    if (mobileDrawer && mobileDrawer.classList.contains('active')) {
      mobileDrawer.classList.remove('active');
      mobileDrawer.setAttribute('aria-hidden', 'true');
      if (mobileBtn) mobileBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  }

  /* ==========================================================================
     CYBER TELEMETRY CONTINUOUS HORIZONTAL TICKER (GUARANTEED MOVEMENT)
     ========================================================================== */
  initMarquee() {
    const track = document.getElementById('marquee-track');
    const container = document.getElementById('cyber-marquee');
    if (!track || !container) return;

    // Remove any CSS keyframe animation so JavaScript rAF has 100% control
    // This bypasses any OS "prefers-reduced-motion", browser pausing, or CSS bugs
    track.style.animation = 'none';

    // Clone groups if needed so the track covers at least 3x the viewport width
    const originalGroup = track.querySelector('.marquee-group');
    if (!originalGroup) return;

    // Ensure we have enough groups for completely seamless wrap-around on ultra-wide screens
    while (track.children.length < 3 || track.scrollWidth < (window.innerWidth * 3)) {
      const clone = originalGroup.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    }

    const groups = track.querySelectorAll('.marquee-group');
    let groupWidth = groups[0].offsetWidth;

    // Re-measure after fonts load or on window resize
    const updateWidth = () => {
      if (groups[0]) {
        const measured = groups[0].offsetWidth;
        if (measured > 0) groupWidth = measured;
      }
    };

    window.addEventListener('resize', updateWidth, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(updateWidth);
    }
    // Also re-measure after 500ms to guarantee loaded web fonts
    setTimeout(updateWidth, 500);

    let offset = 0;
    const pixelsPerSecond = 55; // Crisp, readable, steady cinematic scroll speed
    let lastTime = performance.now();

    const renderLoop = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Clamp delta to avoid big jumps if the user switches tabs
      const safeDelta = Math.min(deltaTime, 0.1);

      if (groupWidth > 0) {
        offset += pixelsPerSecond * safeDelta;
        if (offset >= groupWidth) {
          offset %= groupWidth;
        }
        track.style.transform = `translate3d(-${offset.toFixed(2)}px, 0, 0)`;
      }

      requestAnimationFrame(renderLoop);
    };

    requestAnimationFrame(renderLoop);
  }

  /* ==========================================================================
     TYPEWRITER ROTATING HEADLINE
     ========================================================================== */
  initTypewriter() {
    const el = document.getElementById('hero-rotator');
    if (!el) return;

    const words = [
      "For Daily Productivity.",
      "For Calculus & Math.",
      "For Instant Debugging.",
      "For Everyday Workers.",
      "100% Free Forever."
    ];

    let wordIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    let typingSpeed = 70;

    const typeLoop = () => {
      const currentWord = words[wordIdx];
      
      if (isDeleting) {
        el.textContent = currentWord.substring(0, charIdx - 1);
        charIdx--;
        typingSpeed = 35;
      } else {
        el.textContent = currentWord.substring(0, charIdx + 1);
        charIdx++;
        typingSpeed = 75;
      }

      if (!isDeleting && charIdx === currentWord.length) {
        typingSpeed = 2000; // Pause at end of word
        isDeleting = true;
      } else if (isDeleting && charIdx === 0) {
        isDeleting = false;
        wordIdx = (wordIdx + 1) % words.length;
        typingSpeed = 400; // Pause before typing next word
      }

      setTimeout(typeLoop, typingSpeed);
    };

    setTimeout(typeLoop, 800);
  }

  /* ==========================================================================
     HERO INTERACTIVE SANDBOX TERMINAL (RANDOM ON REFRESH + TYPING EFFECT)
     ========================================================================== */
  initHeroSandbox() {
    const tabBtns = document.querySelectorAll('.hero-tab-btn');
    const copyBtn = document.getElementById('hero-sandbox-copy-btn');
    const replayBtn = document.getElementById('hero-sandbox-replay-btn');
    if (tabBtns.length === 0 && !copyBtn) return;

    const renderTab = (key, animate = true) => {
      this.activeHeroTab = key;
      const demo = this.heroDemos[key];
      if (!demo) return;

      tabBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-demo') === key));
      
      // Update quick input field if matching
      const input = document.getElementById('hero-prompt-field');
      if (input && demo.prompt) {
        input.value = demo.prompt;
      }

      if (animate) {
        this.animateTerminalStream(demo);
      } else {
        const streamPrompt = document.getElementById('hero-sandbox-prompt');
        const outputBox = document.getElementById('hero-sandbox-output');
        const tagBadge = document.getElementById('hero-sandbox-tag');
        const launchBtn = document.getElementById('hero-sandbox-launch-btn');

        if (streamPrompt) streamPrompt.textContent = `> ${demo.prompt}`;
        if (tagBadge) tagBadge.textContent = demo.tag;
        if (launchBtn) launchBtn.href = `ai.html?tool=${demo.toolLink}&q=${encodeURIComponent(demo.prompt)}`;
        if (outputBox) outputBox.innerHTML = this.formatContentWithKaTeX(demo.output);
      }
    };

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-demo');
        renderTab(key, true);
      });
    });

    if (replayBtn) {
      replayBtn.addEventListener('click', () => {
        const demo = this.heroDemos[this.activeHeroTab];
        if (demo) this.animateTerminalStream(demo);
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const demo = this.heroDemos[this.activeHeroTab];
        if (demo) {
          navigator.clipboard.writeText(demo.output);
          const origText = copyBtn.querySelector('span');
          if (origText) {
            origText.textContent = "Copied ✓";
            setTimeout(() => { origText.textContent = "Copy"; }, 1500);
          }
        }
      });
    }

    // Pick a RANDOM demo on every page refresh!
    const demoKeys = Object.keys(this.heroDemos);
    const randomKey = demoKeys[Math.floor(Math.random() * demoKeys.length)];
    this.activeHeroTab = randomKey;
    renderTab(randomKey, true);
  }

  /* ==========================================================================
     REALISTIC AI STREAMING & TYPING ANIMATION FOR HERO SANDBOX (FAST & SHORT)
     ========================================================================== */
  animateTerminalStream(demo) {
    if (this.typewriterTimer) clearInterval(this.typewriterTimer);
    if (this.promptTypewriterTimer) clearInterval(this.promptTypewriterTimer);

    const streamPrompt = document.getElementById('hero-sandbox-prompt');
    const outputBox = document.getElementById('hero-sandbox-output');
    const tagBadge = document.getElementById('hero-sandbox-tag');
    const launchBtn = document.getElementById('hero-sandbox-launch-btn');

    if (tagBadge) tagBadge.textContent = demo.tag;
    if (launchBtn) launchBtn.href = `ai.html?tool=${demo.toolLink}&q=${encodeURIComponent(demo.prompt)}`;

    // 1. Type prompt fast
    if (streamPrompt) {
      streamPrompt.textContent = '> ';
      let pIdx = 0;
      const fullPrompt = `> ${demo.prompt}`;
      this.promptTypewriterTimer = setInterval(() => {
        pIdx += 3;
        streamPrompt.textContent = fullPrompt.substring(0, pIdx);
        if (pIdx >= fullPrompt.length) {
          clearInterval(this.promptTypewriterTimer);
          streamPrompt.textContent = fullPrompt;
        }
      }, 10);
    }

    // 2. Stream output with compact typing speed
    if (outputBox) {
      outputBox.scrollTop = 0;
      const fullText = demo.output;
      let charIdx = 0;
      const step = 5; // characters per frame for rapid streaming
      
      outputBox.innerHTML = '<span style="color: var(--text-muted); font-size: 0.75rem; font-style: italic;">[ Streaming Gemini 3.6 Flash... ]</span>';

      setTimeout(() => {
        this.typewriterTimer = setInterval(() => {
          charIdx += step;
          const currentSlice = fullText.substring(0, charIdx);
          
          outputBox.innerHTML = this.formatContentWithKaTeX(currentSlice) + '<span class="typewriter-cursor" style="color: var(--text-primary);">▋</span>';
          outputBox.scrollTop = outputBox.scrollHeight;

          if (charIdx >= fullText.length) {
            clearInterval(this.typewriterTimer);
            outputBox.innerHTML = this.formatContentWithKaTeX(fullText);
            outputBox.scrollTop = outputBox.scrollHeight;
          }
        }, 15);
      }, 250);
    }
  }

  /* ==========================================================================
     HERO MACOS AI STUDIO LIVE SHOWCASE (Interactive Feature Demo)
     ========================================================================== */
  initHeroShowcase() {
    const showcaseWindow = document.getElementById('hero-ai-showcase');
    if (!showcaseWindow) return;

    const showcaseData = {
      chatbot: {
        badge: "CONVERSATIONAL // CASUAL FRIEND",
        userPrompt: "Hey! How can I make my weekends feel more relaxing and less stressful?",
        model: "Gemini 3.5 Flash",
        metrics: "12.4ms • 142 T/s",
        htmlResponse: `
          <p>Hey there! Honestly, the secret to a genuinely relaxing weekend is protecting your peace of mind before Saturday even hits. Here's what works wonders:</p>
          <div class="showcase-code-snippet">
            <div class="snippet-header">
              <span>weekend_unwind_guide.md</span>
              <span class="snippet-tag">Zero Stress Plan</span>
            </div>
            <pre><code>✨ 1. Friday Brain Dump: Write down pending tasks so they stop looping in your head.
☕ 2. Slow Morning: No social media or email for the first hour after waking up.
🌿 3. Unstructured Hours: Keep at least one afternoon free with zero planned obligations.</code></pre>
          </div>
          <div class="showcase-followups">
            <span class="followup-chip">Quick digital detox tips</span>
            <span class="followup-chip">Fun low-energy hobbies</span>
            <span class="followup-chip">Sunday evening reset</span>
          </div>
        `,
        placeholder: "Chat freely about anything, brainstorm, or chat like a friend...",
        toolLink: "chatbot"
      },
      email: {
        badge: "EMAIL DRAFTER // POLISHED",
        userPrompt: "Draft an executive follow-up email after an enterprise demo proposing a pilot rollout with SLA terms.",
        model: "Executive Drafter v3",
        metrics: "9.8ms • 165 T/s",
        htmlResponse: `
          <p><strong>Subject:</strong> Follow-up: Aethera Enterprise Pilot Architecture &amp; SLA Milestones</p>
          <p>Hi Sarah,<br><br>Thank you for the productive discussion during yesterday's architecture demo. Our team is confident that deploying Aethera's zero-retention local nodes will satisfy your compliance mandates while reducing API latency by 68%.</p>
          <div class="showcase-code-snippet">
            <div class="snippet-header">
              <span>proposed_rollout_timeline.txt</span>
              <span class="snippet-tag">Phase 1 Pilot</span>
            </div>
            <pre><code>1. Provision Isolated VPC Sandbox ........ [3 Business Days]
2. Dual-Run Benchmark vs Existing Stack .. [2 Weeks]
3. SLA Target: 99.99% Availability, &lt;20ms P99 Latency</code></pre>
          </div>
          <div class="showcase-followups">
            <span class="followup-chip">Add Pricing Matrix</span>
            <span class="followup-chip">Shorten to 3 sentences</span>
            <span class="followup-chip">Tone: Formal Board</span>
          </div>
        `,
        placeholder: "Enter recipient, bullet points, or purpose to draft message...",
        toolLink: "email-drafter"
      },
      code: {
        badge: "BUG DOCTOR // EASY FIX",
        userPrompt: "Audit this TypeScript function for a memory leak and race condition, then provide a thread-safe fix.",
        model: "Bug Doctor & Fixer",
        metrics: "14.1ms • 138 T/s",
        htmlResponse: `
          <p><strong>Analysis:</strong> Identified 2 critical issues:</p>
          <p>1. <code>Map</code> grows unboundedly without TTL or eviction, causing OOM leaks under sustained traffic.<br>2. Non-atomic check-then-act creates concurrency race conditions.</p>
          <div class="showcase-code-snippet">
            <div class="snippet-header">
              <span>safe_rate_limiter.ts</span>
              <span class="snippet-tag">Thread-Safe &bull; Zero Leak</span>
            </div>
            <pre><code>export class SafeTokenBucket {
  private readonly tokens = new QuickLRU&lt;string, number&gt;({ maxSize: 10_000 });
  private readonly lock = new AsyncMutex();

  async consume(key: string, cost = 1): Promise&lt;boolean&gt; {
    return this.lock.runExclusive(() =&gt; {
      const current = this.tokens.get(key) ?? this.capacity;
      if (current &lt; cost) return false;
      this.tokens.set(key, current - cost);
      return true;
    });
  }
}</code></pre>
          </div>
          <div class="showcase-followups">
            <span class="followup-chip">Add Redis Distributed Lock</span>
            <span class="followup-chip">Benchmark Throughput</span>
            <span class="followup-chip">Write Unit Tests</span>
          </div>
        `,
        placeholder: "Paste broken snippet, stack trace, or SQL query to debug...",
        toolLink: "bug-hunter"
      },
      math: {
        badge: "CALCULUS & LATEX // CLOSED FORM",
        userPrompt: "Compute the gradient vector and Hessian matrix of f(x, y) = x^2 + 3xy + 2y^2, and classify all critical points.",
        model: "Step-by-Step Math Tutor",
        metrics: "11.2ms • 155 T/s",
        htmlResponse: `
          <p><strong>Step 1: Compute Gradient Vector:</strong></p>
          <p><code>&nabla;f(x, y) = [&part;f/&part;x, &part;f/&part;y]^T = [2x + 3y, 3x + 4y]^T</code></p>
          <p>Setting <code>&nabla;f = [0, 0]^T</code> yields a unique critical point at <code>(0, 0)</code>.</p>
          <div class="showcase-code-snippet">
            <div class="snippet-header">
              <span>hessian_matrix_evaluation.py</span>
              <span class="snippet-tag">Saddle Point Confirmed</span>
            </div>
            <pre><code>H = [[2, 3], 
     [3, 4]]
det(H) = (2)(4) - (3)(3) = 8 - 9 = -1 &lt; 0
# Conclusion: det(H) &lt; 0 strictly proves (0, 0) is a Saddle Point.</code></pre>
          </div>
          <div class="showcase-followups">
            <span class="followup-chip">Plot 3D Surface</span>
            <span class="followup-chip">Compute Eigenvalues</span>
            <span class="followup-chip">Newton-Raphson Step</span>
          </div>
        `,
        placeholder: "Enter formula, derivative, or differential equation...",
        toolLink: "math-solver"
      },
      cve: {
        badge: "SAFETY CHECKUP // SIMPLE FIX",
        userPrompt: "Analyze CVE-2024-3094 (XZ Utils backdoor) attack vector and provide immediate mitigation command.",
        model: "Security Checkup",
        metrics: "8.9ms • 170 T/s",
        htmlResponse: `
          <p><strong>Threat Intel:</strong> CVE-2024-3094 (CVSS 10.0) introduces an obfuscated payload through modified m4 macro files during tarball generation, hijacking OpenSSH's <code>RSA_public_decrypt</code> routine.</p>
          <div class="showcase-code-snippet">
            <div class="snippet-header">
              <span>remediation_terminal.sh</span>
              <span class="snippet-tag">High Priority Patch</span>
            </div>
            <pre><code># 1. Audit affected versions (5.6.0 / 5.6.1):
dpkg -l | grep -E "xz-utils|liblzma5"
# 2. Downgrade immediately to trusted baseline 5.4.5:
sudo apt-get install --allow-downgrades liblzma5=5.4.5-0.1
# 3. Restart SSH daemon:
sudo systemctl restart ssh</code></pre>
          </div>
          <div class="showcase-followups">
            <span class="followup-chip">Audit Auth Logs</span>
            <span class="followup-chip">Mitre ATT&CK: T1195</span>
            <span class="followup-chip">PCAP Signature</span>
          </div>
        `,
        placeholder: "Enter CVE ID, suspicious script, or paste PCAP logs...",
        toolLink: "vuln-scanner"
      },
      resume: {
        badge: "CAREER // GOOGLE XYZ POLISH",
        userPrompt: "Rewrite weak resume bullet 'Sped up website database queries' using Google XYZ impact formula.",
        model: "Resume Polish",
        metrics: "10.5ms • 150 T/s",
        htmlResponse: `
          <p><strong>Google XYZ Transformation:</strong> [Accomplished X] as measured by [Y], by doing [Z].</p>
          <div class="showcase-code-snippet">
            <div class="snippet-header">
              <span>quantified_bullet_points.txt</span>
              <span class="snippet-tag">High Hiring Impact</span>
            </div>
            <pre><code>&bull; Architected Redis read-through caching and connection pooling, 
  reducing P95 database query latency from 420ms to 28ms for 1.4M DAU.
&bull; Re-indexed 18 composite PostgreSQL tables, saving $24,000/year in RDS read replicas.</code></pre>
          </div>
          <div class="showcase-followups">
            <span class="followup-chip">Add Leadership Metrics</span>
            <span class="followup-chip">Format for FAANG ATS</span>
            <span class="followup-chip">Cover Letter Intro</span>
          </div>
        `,
        placeholder: "Paste rough resume bullet or job description...",
        toolLink: "resume-builder"
      }
    };

    const statusBadge = document.getElementById('showcase-status-badge');
    const userPromptEl = document.getElementById('showcase-user-prompt');
    const aiResponseEl = document.getElementById('showcase-ai-response');
    const inputPlaceholderEl = document.getElementById('showcase-input-placeholder');
    const inputBar = document.querySelector('.mac-showcase-input-bar');
    const tabBtns = showcaseWindow.querySelectorAll('[data-showcase-tab]');

    const selectTab = (key) => {
      const data = showcaseData[key];
      if (!data) return;

      tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-showcase-tab') === key);
      });

      if (statusBadge) statusBadge.textContent = data.badge;
      if (userPromptEl) userPromptEl.textContent = data.userPrompt;
      if (aiResponseEl) {
        aiResponseEl.style.opacity = '0';
        setTimeout(() => {
          aiResponseEl.innerHTML = data.htmlResponse;
          aiResponseEl.style.opacity = '1';
        }, 100);
      }
      if (inputPlaceholderEl) inputPlaceholderEl.textContent = data.placeholder;
      if (inputBar) {
        inputBar.href = `ai.html?tool=${data.toolLink}&q=${encodeURIComponent(data.userPrompt)}`;
      }
    };

    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const key = btn.getAttribute('data-showcase-tab');
        selectTab(key);
      });
    });

    // Delegate click on followup chips to launch AI studio with query
    if (aiResponseEl) {
      aiResponseEl.addEventListener('click', (e) => {
        const chip = e.target.closest('.followup-chip');
        if (chip) {
          const query = chip.textContent.trim();
          window.location.href = `ai.html?q=${encodeURIComponent(query)}`;
        }
      });
    }
  }

  /* ==========================================================================
     HERO PROMPT BAR & CHIP INTERACTIONS
     ========================================================================== */
  initHeroPrompt() {
    const input = document.getElementById('hero-prompt-field');
    const btn = document.getElementById('hero-prompt-btn');
    const chips = document.querySelectorAll('.hero-chip');

    const executePrompt = () => {
      const q = input ? input.value.trim() : '';
      if (q) {
        window.location.href = `ai.html?q=${encodeURIComponent(q)}`;
      } else {
        window.location.href = 'ai.html';
      }
    };

    if (btn) btn.addEventListener('click', executePrompt);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') executePrompt();
      });
    }

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const promptText = chip.getAttribute('data-prompt');
        const demoKey = chip.getAttribute('data-demo-key');
        if (input && promptText) input.value = promptText;
        if (demoKey) {
          const tabBtn = document.querySelector(`.hero-tab-btn[data-demo="${demoKey}"]`);
          if (tabBtn) tabBtn.click();
        }
      });
    });
  }

  /* ==========================================================================
     BEFORE VS AFTER TRANSFORMATION SHOWCASE
     ========================================================================== */
  initTransformationShowcase() {
    const scenarioBtns = document.querySelectorAll('.scenario-tab-btn');
    const beforeBox = document.getElementById('scenario-before-content');
    const afterBox = document.getElementById('scenario-after-content');
    const openInStudioBtn = document.getElementById('scenario-launch-btn');

    const renderScenario = (key) => {
      this.activeScenario = key;
      const scen = this.transformationScenarios[key];
      if (!scen) return;

      scenarioBtns.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-scenario') === key));

      if (beforeBox) beforeBox.textContent = scen.before;
      if (afterBox) {
        afterBox.innerHTML = this.formatContentWithKaTeX(scen.after);
      }
      if (openInStudioBtn) {
        openInStudioBtn.href = `ai.html?q=${encodeURIComponent(scen.before)}`;
      }
    };

    scenarioBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-scenario');
        renderScenario(key);
      });
    });

    renderScenario('notes');
  }

  /* ==========================================================================
     BENCHMARK MATRIX VISUALIZER
     ========================================================================== */
  initBenchmarks() {
    const wrapper = document.getElementById('benchmarks-wrapper');
    if (!wrapper || !window.AETHERA_DATA) return;

    wrapper.innerHTML = '';
    window.AETHERA_DATA.benchmarks.forEach(item => {
      const row = document.createElement('div');
      row.className = 'benchmark-row';
      row.innerHTML = `
        <div class="benchmark-label-row">
          <span style="font-weight: 600; color: var(--text-primary);">${item.name}</span>
          <span style="color: var(--text-primary); font-weight: 700;">Aethera: ${item.aethera}% <span style="color: var(--text-muted); font-weight: 400;">vs ${item.gpt4o}%</span></span>
        </div>
        <div class="benchmark-track">
          <div class="benchmark-fill" style="width: 0%;" data-target="${item.aethera}"></div>
        </div>
      `;
      wrapper.appendChild(row);
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          document.querySelectorAll('.benchmark-fill').forEach(fill => {
            const target = fill.getAttribute('data-target');
            fill.style.width = `${target}%`;
          });
          observer.disconnect();
        }
      });
    }, { threshold: 0.2 });

    observer.observe(wrapper);
  }

  /* ==========================================================================
     INTERACTIVE FAQ ACCORDION
     ========================================================================== */
  initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
      const question = item.querySelector('.faq-question');
      if (question) {
        question.addEventListener('click', () => {
          const isOpen = item.classList.contains('active');
          faqItems.forEach(i => i.classList.remove('active'));
          if (!isOpen) item.classList.add('active');
        });
      }
    });
  }

  /* ==========================================================================
     SPOTLIGHT CARD CURSOR TRACKING (rAF THROTTLED FOR 60FPS)
     ========================================================================== */
  initSpotlightCards() {
    const cards = document.querySelectorAll('.bento-card, .tier-card, .mac-ai-test-window');
    cards.forEach(card => {
      let ticking = false;
      card.addEventListener('mousemove', (e) => {
        if (!ticking) {
          requestAnimationFrame(() => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
            card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });
    });
  }

  /* ==========================================================================
     KATEX FORMULA PARSER HELPER
     ========================================================================== */
  formatContentWithKaTeX(raw) {
    if (!raw) return '';
    let text = raw;

    // Code blocks preservation
    const codeBlocks = [];
    text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const key = `%%CODE_BLOCK_${codeBlocks.length}%%`;
      codeBlocks.push(`<pre class="hero-code-block"><code class="language-${lang || 'text'}">${this.escapeHTML(code.trim())}</code></pre>`);
      return key;
    });

    // Display math ($$...$$)
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, tex) => {
      if (typeof katex !== 'undefined') {
        try {
          return `<div class="katex-display-math">${katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false })}</div>`;
        } catch (e) {
          return `<pre class="math-fallback">${tex}</pre>`;
        }
      }
      return match;
    });

    // Inline math ($...$)
    text = text.replace(/\$([^\$\n]+?)\$/g, (match, tex) => {
      if (typeof katex !== 'undefined') {
        try {
          return `<span class="katex-inline-math">${katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false })}</span>`;
        } catch (e) {
          return `<code>${tex}</code>`;
        }
      }
      return match;
    });

    // Formatting bold, lists, linebreaks
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\n\n/g, '<br><br>');
    text = text.replace(/\n• /g, '<br>• ');

    // Re-inject code blocks
    codeBlocks.forEach((block, idx) => {
      text = text.replace(`%%CODE_BLOCK_${idx}%%`, block);
    });

    return text;
  }

  escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

// Global App Initialization
document.addEventListener('DOMContentLoaded', () => {
  window.aetheraApp = new AetheraApp();
});
