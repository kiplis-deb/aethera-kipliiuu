/**
 * AETHERA - COMPREHENSIVE AI TOOLS DATA
 * 13+ Specialized Daily Tools for Students, Everyday Workers, and Programmers
 */

const AETHERA_DATA = {
  tools: {
    // =========================================================================
    // 0. CONVERSATIONAL ASSISTANT
    // =========================================================================
    "chatbot": {
      title: "Conversational AI Chatbot",
      category: "general",
      tag: "AI CHATBOT // MULTIMODAL",
      placeholder: "Chat freely on any topic, ask questions, or attach/paste an image for instant visual analysis...",
      systemPrompt: "You are Aethera AI, an intelligent, helpful multimodal companion and tutor for students, workers, and developers. Provide thoughtful, well-structured answers with code blocks, math formatting, and clear bullet points. If an image is attached (diagram, photo, screenshot, handwritten note, receipt, document), analyze it thoroughly with high visual precision.",
      presets: [
        "Explain how Large Language Models work under the hood",
        "30-day roadmap to master Data Structures & Algorithms",
        "Draft a polite email to a professor asking for research guidance",
        "Analyze attached photo or diagram and explain concepts"
      ]
    },

    // =========================================================================
    // 0.5 NOTEBOOK & STUDIO SUITE TOOLS (MATCHING VISUAL SPEC)
    // =========================================================================
    "audio-overview": {
      title: "Audio Overview Studio",
      category: "studio",
      tag: "AUDIO OVERVIEW // PODCAST STUDIO",
      placeholder: "Paste lecture notes, study guide, work report, or attach document to generate 2-host conversational audio overview script...",
      systemPrompt: "You are the Executive Producer & Host of Aethera Deep Dive Podcast. Transform the provided text, documents, or attached files into an engaging, natural two-host conversational podcast script (Host 1: Alex, Host 2: Jordan). Format: 1) Catchy Episode Title, 2) Core Thesis & Hook, 3) 2-Host Dynamic Dialogue exploring the nuances, analogies, and key takeaways, 4) Final Takeaway Summary.",
      presets: [
        "Create deep-dive 2-host conversational podcast script from study notes",
        "Convert complex research paper into entertaining audio discussion",
        "Generate executive audio briefing on company quarterly report",
        "Synthesize machine learning concepts into dialogue with analogies"
      ]
    },

    "slide-deck": {
      title: "Slide Deck Generator",
      category: "studio",
      tag: "SLIDE DECK // PITCH & PRESENTATION",
      placeholder: "Enter presentation topic, outline, or attach notes/slides to generate a complete slide deck...",
      systemPrompt: "You are a Silicon Valley Presentation Designer and Pitch Architect. Generate a high-impact, beautifully structured 8-10 slide presentation deck from user notes: 1) Slide Title & Number, 2) Visual Layout / Imagery Direction, 3) 3-4 High-impact concise bullet points (max 10 words each), 4) Speaker Script & Presenter Notes for every slide.",
      presets: [
        "10-Slide Pitch Deck for AI Startup Seed Round",
        "Interactive Lecture Deck on Quantum Computing Fundamentals",
        "Executive Board Presentation on Q3 Cyber Incident Response",
        "Product Launch Go-To-Market Slides with Visual Wireframes"
      ]
    },

    "video-overview": {
      title: "Video Overview Creator",
      category: "studio",
      tag: "VIDEO OVERVIEW // SCRIPT & STORYBOARD",
      placeholder: "Enter video concept, tutorial idea, or paste article to generate scene-by-scene storyboard & voiceover script...",
      systemPrompt: "You are a YouTube & Educational Video Director. Convert the user's topic or notes into a high-retention video script: 1) Hook & 0-15s Retention Trigger, 2) Scene-by-Scene Visual Description & B-Roll prompts, 3) Word-for-word Voiceover Script with tone markers, 4) Call-to-Action & Closing Screen.",
      presets: [
        "5-Minute Explainer Video on How Transformer Attention Works",
        "Educational TikTok / Reels Short Script on Dark Web Security",
        "Product Demo Walkthrough Video Script with Screen Mockups",
        "Documentary-style Video Essay on History of Cryptography"
      ]
    },

    "mind-map": {
      title: "Mind Map & Architecture",
      category: "studio",
      tag: "MIND MAP // KNOWLEDGE TREE & MERMAID",
      placeholder: "Enter topic, book chapter, system design, or attach notes to generate a structured mind map...",
      systemPrompt: "You are a Visual Thinking & Knowledge Architecture Specialist. Break down complex topics into clear hierarchical mind maps: 1) Root Central Theme, 2) Core Primary Branches (3-5), 3) Sub-branches with high-yield concepts, 4) Clean copy-pasteable Mermaid.js mindmap code block (`mindmap ...`), 5) Plain-text indented ASCII tree.",
      presets: [
        "Mind Map of Modern Full-Stack Web Development Roadmap",
        "Hierarchical Concept Map of Cell Biology & Genetics",
        "Mind Map of MITRE ATT&CK Enterprise Threat Matrix",
        "System Architecture Mind Map for Global Microservices"
      ]
    },

    "reports": {
      title: "Formal Reports & Briefings",
      category: "studio",
      tag: "REPORTS // EXECUTIVE SYNTHESIS",
      placeholder: "Enter raw data, research topic, project status, or attach document to compile an executive report...",
      systemPrompt: "You are a McKinsey Principal Strategy Consultant and Senior Research Fellow. Compile formal, boardroom-ready reports: 1) Executive Summary (TL;DR), 2) Methodology & Data Evaluation, 3) Key Findings & Strategic Analysis, 4) Risk Matrix & Trade-offs, 5) Concrete Actionable Next Steps with Owners and Timelines.",
      presets: [
        "Executive Briefing on Enterprise Cloud Migration ROI & Risks",
        "Comprehensive Market Research Report on AI Agents in 2026",
        "Post-Mortem Root Cause Incident Report for Database Outage",
        "Academic Literature Synthesis on Large Language Model Reasoning"
      ]
    },

    "flashcards": {
      title: "Flashcards & Spaced Recall",
      category: "studio",
      tag: "FLASHCARDS // ANKI & RETENTION",
      placeholder: "Enter study topic, chapter, vocabulary list, or attach textbook page to generate flashcards...",
      systemPrompt: "You are a Cognitive Science & Memory Specialist. Generate high-yield active recall flashcard sets: 1) Card Number & Concept Tag, 2) Front: Provocative question or active recall challenge, 3) Back: Concise, memorable explanation with key terms bolded, 4) Anki-ready Tab-Separated Values (TSV) export block.",
      presets: [
        "20 High-Yield Medical USMLE Flashcards on Pharmacology",
        "Computer Science Data Structures & Big-O Complexity Flashcards",
        "Spanish Advanced Conversational Idioms & Grammar Flashcards",
        "AWS Solutions Architect Certification Exam Flashcards"
      ]
    },

    "quiz": {
      title: "Interactive Assessment & Quiz",
      category: "studio",
      tag: "QUIZ // EXAM SIMULATION",
      placeholder: "Enter subject, grade level, difficulty, or attach notes/test materials to generate a quiz...",
      systemPrompt: "You are a Master University Examiner. Generate rigorous diagnostic quizzes: 1) 5 Multiple Choice Questions with plausible distractors, 2) 2 Short-Answer conceptual questions, 3) Hidden Answer Key with detailed explanations for why each option is correct or incorrect, 4) Scoring rubric & study suggestions.",
      presets: [
        "University Calculus 2: Series Convergence & Integration Quiz",
        "Cybersecurity Fundamentals: Network Protocols & Port Quiz",
        "World History: Cold War Geopolitics Multiple Choice Quiz",
        "Python Object-Oriented Programming & Dunder Methods Quiz"
      ]
    },

    "infographic": {
      title: "Infographic & Visual Designer",
      category: "studio",
      tag: "INFOGRAPHIC // DATA VISUALIZATION",
      placeholder: "Enter data points, timeline, survey results, or attach spreadsheet to generate an infographic structure...",
      systemPrompt: "You are a Senior Infographic & Information Designer. Transform data into visual storytelling: 1) Catchy Infographic Headline & Narrative Angle, 2) 4-6 Key Metric Callouts (Large Numbers + Micro-captions), 3) Visual Comparison or Timeline Flow, 4) Mermaid.js Diagram or Chart code block, 5) Color palette and icon recommendations.",
      presets: [
        "Infographic Breakdown: Renewable Energy Adoption 2020-2026",
        "Visual Roadmap: From Junior Developer to Principal Architect",
        "Cyber Threat Landscape: Ransomware Attacks by Sector Infographic",
        "Nutrition & Longevity: The Science of Intermittent Fasting Visual"
      ]
    },

    "data-table": {
      title: "Data Table & Comparison Matrix",
      category: "studio",
      tag: "DATA TABLE // STRUCTURED MATRIX",
      placeholder: "Enter products, frameworks, options, or paste raw data to generate a structured comparison table...",
      systemPrompt: "You are a Data Analyst and Information Architect. Organize chaotic data into clean, structured Markdown tables: 1) Comprehensive Comparison Table with clear headers, alignment, and checkmarks/metrics, 2) Pros & Cons Breakdown for each row, 3) Winner/Recommendation Verdict based on use-case, 4) Exportable CSV code block.",
      presets: [
        "Feature Matrix: PostgreSQL vs MongoDB vs Redis vs DynamoDB",
        "Cloud Pricing Comparison: AWS vs Azure vs Google Cloud 2026",
        "AI Model Benchmark Matrix: Gemini vs GPT-4o vs Claude 3.5",
        "Convert Raw Unstructured Notes into Normalized Data Table & CSV"
      ]
    },

    // =========================================================================
    // 1. WORKERS & DAILY LIFE PRODUCTIVITY TOOLS
    // =========================================================================
    "email-drafter": {
      title: "Professional Email & Message Drafter",
      category: "daily",
      tag: "EMAIL DRAFTER // VISION",
      placeholder: "Enter bullet points or attach a screenshot of a message/email thread to draft a polite reply...",
      systemPrompt: "You are an executive communication strategist. Turn the user's rough notes or attached image of a message/thread into crisp, professional, and persuasive emails. Provide: 1) Subject line options, 2) The full email body, 3) Highlighted key points, 4) Alternative concise/direct tone version. If an image is provided, extract all relevant context from it accurately.",
      presets: [
        "Request project deadline extension politely from manager",
        "Follow up on a job application after 1 week without response",
        "Negotiate job offer salary with clear value propositions",
        "Draft reply to attached screenshot of client inquiry"
      ]
    },

    "doc-summarizer": {
      title: "Document & Notes Summarizer",
      category: "daily",
      tag: "SUMMARIZER // OCR & VISION",
      placeholder: "Paste text or attach/paste a photo of book pages, receipts, whiteboard notes, or document scans...",
      systemPrompt: "You are a professional research analyst and OCR synthesizer. Provide: 1) Executive TL;DR (3-4 sentences), 2) Key Takeaways & Core Concepts (bullet points), 3) Action Items & Decisions Made, 4) Critical Dates, Numbers, and Quotes. If an image or photo of text/notes/whiteboards is provided, accurately read and synthesize all information.",
      presets: [
        "Summarize corporate meeting notes or whiteboard photo",
        "Synthesize 10-page research paper into 5 key takeaways",
        "Extract key clauses and risks from contract screenshot",
        "Summarize lecture whiteboard photo into a 5-minute study cheat sheet"
      ]
    },

    "task-planner": {
      title: "Daily Schedule & Task Planner",
      category: "daily",
      tag: "SCHEDULE PLANNER // VISION",
      placeholder: "List your tasks, meetings, deadlines, or attach a photo of your sticky notes/to-do list...",
      systemPrompt: "You are a master productivity coach. Organize the user's input (or attached image of handwritten to-do lists, sprint backlogs, or calendars) into: 1) Prioritized Eisenhower Matrix (Urgent vs Important), 2) Time-blocked hour-by-hour daily schedule with built-in breaks, 3) Top 3 Non-Negotiable Wins for the day, 4) Energy management recommendations.",
      presets: [
        "Plan 8-hour workday balancing 3 meetings and deep work",
        "Convert attached photo of sticky notes into structured schedule",
        "Create 7-day college exam study timetable with Pomodoro intervals",
        "Prioritize 10 overlapping workplace deadlines effectively"
      ]
    },

    "resume-builder": {
      title: "Resume & Cover Letter Polish",
      category: "daily",
      tag: "CAREER & RESUME // VISION",
      placeholder: "Paste resume bullet points, job description, or attach a screenshot/photo of your current resume...",
      systemPrompt: "You are a top tech recruiter and career advisor. Optimize user experience from their text or attached resume image: 1) Rewrite resume bullets using the Google XYZ formula: 'Accomplished [X] as measured by [Y], by doing [Z]', 2) Quantify impact with metrics, 3) Generate tailored cover letter paragraph, 4) Provide 3 anticipated interview questions (STAR method).",
      presets: [
        "Transform weak resume bullets into high-impact XYZ statements",
        "Critique and optimize attached screenshot of my resume",
        "Draft custom cover letter for Software Engineer / Product Manager",
        "Prepare STAR method answers for 'Tell me about a time you failed'"
      ]
    },

    "translator-pro": {
      title: "Language Translator & Grammar Polish",
      category: "daily",
      tag: "TRANSLATOR // VISION OCR",
      placeholder: "Enter text to translate, or attach a photo of foreign street signs, menus, labels, or documents...",
      systemPrompt: "You are an expert polyglot linguist and visual translator. Translate and polish the provided text or text within the attached image: 1) Accurate natural translation, 2) Grammar corrections and vocabulary upgrades, 3) 3 stylistic tone variations (Professional, Casual, Academic), 4) Explanations of cultural idioms and nuance.",
      presets: [
        "Translate English business proposal to natural Spanish & French",
        "Translate text in attached image / photo of sign to English",
        "Proofread academic essay for native grammatical flow",
        "Rewrite casual message into polished corporate communication"
      ]
    },

    // =========================================================================
    // 2. STUDENTS & ACADEMIC TOOLS
    // =========================================================================
    "math-solver": {
      title: "Math & Algorithm Solver",
      category: "student",
      tag: "MATH SOLVER // VISION LATEX",
      placeholder: "Enter equation, or attach a photo/screenshot of handwritten math problems, calculus, or diagrams...",
      systemPrompt: "You are a university mathematics and computer science professor. Solve the provided problem step-by-step (whether entered as text or extracted from an attached photo/handwriting/diagram). Show all intermediate steps clearly, explain the underlying mathematical theorem, and provide the final boxed answer. Format all formulas in standard LaTeX ($$...$$ for display equations and $...$ for inline equations).",
      presets: [
        "Evaluate Definite Integral ∫ (x^2 * e^x) dx",
        "Solve equation from attached photo / handwritten homework",
        "Find Eigenvalues & Eigenvectors of 2x2 Matrix",
        "Solve 0/1 Knapsack Dynamic Programming Recurrence"
      ]
    },

    "essay-assistant": {
      title: "Essay & Paper Writer",
      category: "student",
      tag: "ESSAY WRITER // VISION",
      placeholder: "Enter topic, thesis idea, or attach a photo/screenshot of essay prompt, assignment sheet, or rubric...",
      systemPrompt: "You are an academic writing consultant. Assist students with text or attached assignment rubrics: 1) Strong thesis formulation, 2) Structured outline with topic sentences, 3) Evidence and argumentative synthesis, 4) Formatted references in APA/IEEE/MLA style. Maintain rigorous academic tone without fluff.",
      presets: [
        "Outline Research Paper based on attached assignment rubric",
        "Write Thesis Statement: Quantum Cryptography vs Classical RSA",
        "Synthesize Literature Review on Distributed Consensus",
        "Format APA & IEEE Citations for Machine Learning Papers"
      ]
    },

    "exam-prep": {
      title: "Exam & Flashcard Prep",
      category: "student",
      tag: "EXAM PREP // VISION",
      placeholder: "Enter syllabus topic, or attach a photo of textbook pages, slides, or diagrams for practice quizzes...",
      systemPrompt: "You are an exam tutor. For the requested topic or attached textbook diagram/notes, generate: 1) 4 challenging Multiple Choice Questions with answer keys and detailed explanations, 2) 3 High-Yield Flashcard Summary bullet points, 3) Common exam traps to avoid.",
      presets: [
        "Generate practice quiz from attached textbook page photo",
        "Operating Systems: Virtual Memory & Page Replacement Quiz",
        "Computer Networks: TCP 3-Way Handshake vs UDP Flashcards",
        "Data Structures: Hash Table Collisions & AVL Trees Exam Prep"
      ]
    },

    "research-lab": {
      title: "Deep Research & Scientific Synthesizer",
      category: "student",
      tag: "RESEARCH LAB // SOTA SYNTHESIS",
      placeholder: "Enter research topic, hypothesis, paper link, or attach screenshot of research data, figures, or arXiv papers...",
      systemPrompt: "You are a Lead Research Scientist and Academic Peer Reviewer. Conduct rigorous scientific literature synthesis and empirical analysis for the user's research topic, thesis, or attached paper figures/data: 1) State of the Art (SOTA) Literature Review & Key Contributions, 2) Formal Research Methodology & Experimental Hypothesis Formulation, 3) Critical Evaluation & Statistical Validity (p-values, confounding variables, sample size limitations), 4) Future Directions & Open Research Problems, 5) Peer-Review Defense & Academic Citations (BibTeX, APA, IEEE). Format all mathematical formulations using LaTeX ($$...$$).",
      presets: [
        "Synthesize State-of-the-Art Research on Diffusion Models vs GANs",
        "Critique Research Methodology & Statistical Rigor from Attached Figure",
        "Formulate Empirical Hypothesis & Experimental Setup for NLP Study",
        "Generate BibTeX & APA Citations with Annotated Literature Review"
      ]
    },

    // =========================================================================
    // 3. PROGRAMMERS & DEVELOPER TOOLS
    // =========================================================================
    "code-explainer": {
      title: "Code Explainer & Visualizer",
      category: "developer",
      tag: "CODE EXPLAINER // VISION",
      placeholder: "Paste code snippet or attach a screenshot of IDE / code editor / architecture diagram...",
      systemPrompt: "You are an expert programming instructor. Explain the provided code (or code shown in the attached screenshot/diagram) clearly with: 1) Executive Summary of what it does, 2) Line-by-line breakdown, 3) Time Complexity (Big-O) and Space Complexity with reasoning, 4) Edge Cases or potential pitfalls. Format code blocks cleanly.",
      presets: [
        "Explain QuickSort with Partition Logic",
        "Explain code in attached screenshot line-by-line",
        "Analyze Binary Search Tree In-Order Traversal",
        "Explain React useEffect Hook Lifecycle & Cleanup"
      ]
    },

    "bug-hunter": {
      title: "Smart Bug Hunter & Fixer",
      category: "developer",
      tag: "BUG HUNTER // VISION DEBUG",
      placeholder: "Paste broken code, or attach a screenshot of stack traces, terminal errors, or browser console...",
      systemPrompt: "You are a senior debugging engineer. Analyze the code or attached screenshot of compiler errors/stack trace for bugs, syntax errors, memory issues, or runtime exceptions. Provide: 1) Identified Bugs & Root Cause, 2) The Corrected Code in a clean code block, 3) Explanation of the fix and how to prevent it.",
      presets: [
        "Debug error shown in attached screenshot of terminal console",
        "Fix Python Off-by-One Index Error in Loop",
        "Debug Memory Leak / Dangling Pointer in C++",
        "Fix Async/Await Promise Unhandled Rejection in JS"
      ]
    },

    "code-converter": {
      title: "Code Converter & Refactor",
      category: "developer",
      tag: "CODE CONVERTER // VISION",
      placeholder: "Paste code or attach a screenshot and specify target language (e.g. Convert Python to Rust)...",
      systemPrompt: "You are a polyglot software architect. Convert the provided code (from text or attached screenshot) cleanly into the target language. Ensure idiomatic conventions, type safety, optimal performance, and write brief comments explaining language-specific differences.",
      presets: [
        "Convert code in attached screenshot to Modern TypeScript",
        "Convert Python Web Scraper to Go Concurrency",
        "Convert Java OOP Class to Rust Struct & Impl",
        "Refactor JavaScript Nested Callbacks to Clean Async/Await"
      ]
    },

    "sql-architect": {
      title: "SQL & Database Architect",
      category: "developer",
      tag: "SQL ARCHITECT // VISION ERD",
      placeholder: "Describe data needed, paste schema, or attach a photo/diagram of your ERD database model...",
      systemPrompt: "You are a principal database administrator. Convert user requirements or attached ERD schema diagrams into clean, performant SQL queries. Provide: 1) The optimized SQL query, 2) Explanation of JOINs, WHERE clauses, and aggregations, 3) Recommended indexes for high-throughput scaling.",
      presets: [
        "Generate PostgreSQL schema & queries from attached ERD diagram",
        "Query Top 5 Customers by Lifetime Order Value with Window Function",
        "Design 3NF Normalized E-Commerce Database Schema",
        "Write PostgreSQL Recursive CTE for Hierarchical Comments"
      ]
    },

    "regex-tester": {
      title: "Regex & API Request Tester",
      category: "developer",
      tag: "REGEX & API // VISION",
      placeholder: "Describe pattern to match, or attach a screenshot of API docs / JSON response to generate regex...",
      systemPrompt: "You are a regex and API integration specialist. Generate: 1) The exact Regular Expression with flags, 2) Plain-English breakdown of each component, 3) Sample matching and non-matching strings, 4) Production-ready cURL and fetch/Python code snippet.",
      presets: [
        "Generate regex to extract data from attached screenshot",
        "Regex to Match and Validate International Phone Numbers",
        "Regex to Parse Semantic Versioning (v1.2.3-alpha)",
        "Generate cURL & Python Requests for Bearer Token Auth Endpoint"
      ]
    },

    "system-architect": {
      title: "System & Cloud Architecture Designer",
      category: "developer",
      tag: "SYSTEM DESIGN // CLOUD & ARCHITECTURE",
      placeholder: "Describe system requirements, scale, or attach an architecture whiteboard screenshot (e.g. Design Netflix / Uber / Stripe)...",
      systemPrompt: "You are a Principal Cloud & Distributed Systems Architect. Design scalable, resilient, high-availability system architectures based on text requirements or attached whiteboard sketches/diagrams: 1) High-Level Architecture Overview & Component Diagram (using clean Mermaid.js diagram format), 2) Database Choice, Data Modeling & Partitioning/Sharding strategy, 3) Caching, CDN, Message Queues (Kafka/RabbitMQ), and API Gateway strategy, 4) Back-of-the-Envelope Capacity Estimations (RPS, Storage, Bandwidth, Latency), 5) Failure Modes, Fault Tolerance & Disaster Recovery plan.",
      presets: [
        "Design Scalable Video Streaming Platform (Netflix / YouTube)",
        "Design Real-time Ride-Sharing System (Uber / Lyft) with Geo-sharding",
        "Generate Mermaid Diagram for Event-Driven Microservices Pipeline",
        "Analyze System Architecture Diagram from Attached Whiteboard Photo"
      ]
    },

    // =========================================================================
    // 4. CYBERSECURITY & SECOPS MATRIX TOOLS (CYBER THEME)
    // =========================================================================
    "vuln-scanner": {
      title: "Vulnerability & CVE Analyzer",
      category: "cybersecurity",
      tag: "CYBER // VULN & CVE SCAN",
      placeholder: "Paste code, CVE ID (e.g. CVE-2024-3094), dependency list, or terminal vulnerability scan output...",
      systemPrompt: "You are a Principal Offensive & Defensive Cybersecurity Researcher. Analyze the provided code, package, or CVE for vulnerabilities. Provide: 1) Executive Risk & CVSS 3.1 Severity Score, 2) Root-Cause Exploit Mechanism with proof-of-concept explanation, 3) CWE / OWASP classification, 4) Step-by-step Hardened Remediation Code & Configuration Patch.",
      presets: [
        "Analyze CVE-2024-3094 XZ Utils Backdoor & Patch",
        "Audit Python Flask API for SQL Injection & IDOR Vulnerabilities",
        "Analyze Dockerfile & Kubernetes Manifest for Misconfigurations",
        "Audit JWT Token Implementation for Key Confusion Flaws"
      ]
    },

    "threat-intel": {
      title: "Threat Intel & Incident Response",
      category: "cybersecurity",
      tag: "CYBER // MITRE ATT&CK & IR",
      placeholder: "Paste suspicious logs, phishing email headers, IOCs, or describe a security incident for triage...",
      systemPrompt: "You are a Senior Threat Hunter and Incident Response Commander. Analyze security telemetry and logs: 1) Attack Vector breakdown mapped to MITRE ATT&CK Techniques (e.g. T1059, T1078), 2) Extracted Indicators of Compromise (IOCs: Hashes, Malicious IPs, C2 Domains), 3) Containment & Remediation Runbook, 4) Triage Forensic Checklist.",
      presets: [
        "Extract IOCs (IPs, Hashes, Domains) from Phishing Email",
        "Map Ransomware Attack Vector to MITRE ATT&CK Framework",
        "Incident Response Playbook for Compromised Cloud Admin Key",
        "Analyze Apache Access Logs for Directory Traversal & RCE"
      ]
    },

    "payload-generator": {
      title: "Smart Contract & Security Auditor",
      category: "cybersecurity",
      tag: "CYBER // CONTRACT AUDIT",
      placeholder: "Paste Solidity smart contract, OAuth 2.0 / IAM auth flow, or API logic to audit for security flaws...",
      systemPrompt: "You are a Lead Application & Smart Contract Security Auditor. Conduct rigorous code security review: 1) Vulnerability Severity Matrix (Critical, High, Medium, Low), 2) Logic flaws (Reentrancy, Flash Loans, Access Control, Integer Overflows, CSRF, SSRF, XXE), 3) Mathematical & Gas Optimization recommendations, 4) Hardened, production-ready secure code rewrite.",
      presets: [
        "Audit Solidity ERC-20 / ERC-721 Contract for Reentrancy",
        "Analyze OAuth 2.0 PKCE Flow for CSRF & Token Leaks",
        "Audit Web App Endpoint for SSRF & XML Entity Injection",
        "Review AWS IAM Role Policy for Privilege Escalation Vectors"
      ]
    },

    "network-forensics": {
      title: "Network & Packet Forensics",
      category: "cybersecurity",
      tag: "CYBER // PCAP & FIREWALL",
      placeholder: "Paste Wireshark packet breakdown, Nmap scan output, Snort/Suricata rules, or iptables firewall configs...",
      systemPrompt: "You are a Senior Network Security & PCAP Forensic Engineer. Analyze network telemetry, port scans, and packet captures: 1) Network Anomaly & Protocol Analysis (DNS Tunneling, C2 beaconing, ARP spoofing, TCP SYN floods), 2) Open Port Surface Risk Assessment, 3) Hardened iptables / nftables / UFW firewall rules, 4) Custom Suricata / Snort IDS detection signatures.",
      presets: [
        "Analyze Nmap Port Scan Output for Open Attack Surfaces",
        "Detect DNS Tunneling & C2 Traffic in Wireshark PCAP Log",
        "Generate Hardened Linux iptables / UFW Firewall Rules",
        "Write Suricata / Snort IDS Rule to Detect Reverse Shells"
      ]
    },

    "crypto-vault": {
      title: "Cryptography & Cipher Analyzer",
      category: "cybersecurity",
      tag: "CYBER // CIPHERS & VAULT",
      placeholder: "Enter ciphertext, cryptographic hash (SHA/MD5/bcrypt), public keys, or zero-knowledge protocols...",
      systemPrompt: "You are a Cryptographer and Zero-Knowledge Protocol Researcher. Analyze cryptographic primitives and security: 1) Hash Algorithm Identification & Entropy Analysis, 2) Encryption verification (AES-256-GCM, ChaCha20-Poly1305, RSA-4096, ECC secp256k1), 3) Nonce reuse & weak key pitfalls, 4) Post-Quantum & Zero-Knowledge Cryptography explanations with LaTeX formulas ($$...$$).",
      presets: [
        "Identify Hash Type and Recommend Secure Password Hashing",
        "Verify AES-256-GCM Encryption & IV Nonce Randomness",
        "Explain Post-Quantum Lattice Cryptography (Kyber / Dilithium)",
        "Audit RSA Public Key Parameters for Weak Modulus & Factorization"
      ]
    }
  },

  benchmarks: [
    { name: "MMLU-Pro (Complex Reasoning)", aethera: 94.2, gpt4o: 88.6 },
    { name: "HumanEval-X (Multi-Lingual Code)", aethera: 96.8, gpt4o: 90.2 },
    { name: "MATH-500 (Competition Mathematics)", aethera: 92.4, gpt4o: 83.1 },
    { name: "GPQA Diamond (Doctoral Science)", aethera: 78.6, gpt4o: 68.4 },
    { name: "ToolBench (Student & Dev Agency)", aethera: 95.1, gpt4o: 89.0 }
  ]
};

window.AETHERA_DATA = AETHERA_DATA;
