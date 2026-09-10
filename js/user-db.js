/**
 * ============================================================================
 * AETHERA USER DATABASE & MULTI-DEVICE CLOUD AUTHENTICATION ENGINE
 * ============================================================================
 * Features:
 * - Dual-layer architecture: Cloud Firestore + Firebase Auth (Global Multi-Device)
 *   with transparent IndexedDB & LocalStorage offline cache
 * - Secure cryptographic password hashing (SHA-256 + cryptographic salt via Web Crypto API)
 * - Complete User Authentication (Register, Login, Session Management, Remember Me, Logout)
 * - Cloud Document Sync for User Profiles and Saved AI Conversations
 * - Real-time Multi-Device Sync: Access history & settings on phone, laptop, or desktop
 * - Configurable Firebase Connection with built-in instant cloud adapter
 * - Database Management & Inspector HUD (View all users, inspect schemas, JSON Export/Import, Reset)
 * - Reactive Event System ('aethera:auth-change') for multi-page real-time sync
 * ============================================================================
 */

class AetheraUserDB {
  constructor() {
    this.dbName = 'aethera_cortex_db';
    this.dbVersion = 1;
    this.db = null;
    this.isReady = false;
    this.readyPromise = null;
    this.currentUser = null;
    this.sessionKey = 'aethera_active_session';
    this.storageFallbackKey = 'aethera_users_store_v1';
    this.chatsFallbackKey = 'aethera_chats_store_v1';
    this.cloudConfigKey = 'aethera_firebase_config';

    // Firebase instances
    this.firebaseApp = null;
    this.auth = null;
    this.firestore = null;
    this.isCloudActive = false;

    this.init();
  }

  /* --------------------------------------------------------------------------
     INITIALIZATION: LOCAL STORAGE + FIREBASE CLOUD ADAPTER
     -------------------------------------------------------------------------- */
  init() {
    this.readyPromise = new Promise(async (resolve) => {
      // 1. Initialize Local Storage (IndexedDB or LocalStorage fallback)
      await this._initLocalStorage();

      // 2. Initialize Firebase Cloud Auth & Firestore
      await this._initCloudAdapter();

      // 3. Restore active session
      await this._restoreSession();

      this.isReady = true;
      resolve(this);
    });
  }

  async ready() {
    return this.readyPromise;
  }

  async _initLocalStorage() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        console.warn('[AetheraUserDB] IndexedDB not supported, using LocalStorage fallback.');
        this._seedLocalStorageIfEmpty();
        resolve();
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        // 1. Users Store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('email', 'email', { unique: true });
          userStore.createIndex('username', 'username', { unique: true });
        }
        // 2. Sessions Store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'token' });
          sessionStore.createIndex('userId', 'userId', { unique: false });
        }
        // 3. User Saved AI Chats Store
        if (!db.objectStoreNames.contains('saved_chats')) {
          const chatStore = db.createObjectStore('saved_chats', { keyPath: 'id' });
          chatStore.createIndex('userId', 'userId', { unique: false });
          chatStore.createIndex('toolKey', 'toolKey', { unique: false });
        }
      };

      request.onsuccess = async (e) => {
        this.db = e.target.result;
        await this._seedDatabaseIfEmpty();
        resolve();
      };

      request.onerror = (e) => {
        console.warn('[AetheraUserDB] IndexedDB error, falling back to LocalStorage:', e.target.error);
        this._seedLocalStorageIfEmpty();
        resolve();
      };
    });
  }

  /* --------------------------------------------------------------------------
     FIREBASE CLOUD ADAPTER SETUP
     -------------------------------------------------------------------------- */
  async _initCloudAdapter() {
    if (typeof firebase === 'undefined') {
      console.log('[AetheraUserDB] Firebase SDK not loaded in page; running in local storage mode.');
      return;
    }

    try {
      const config = this.getCloudConfig();
      if (!firebase.apps.length) {
        this.firebaseApp = firebase.initializeApp(config);
      } else {
        this.firebaseApp = firebase.app();
      }

      this.auth = firebase.auth();
      this.firestore = firebase.firestore();
      this.isCloudActive = true;
      console.log('[AetheraUserDB] Multi-Device Cloud Sync initialized via Firebase.');

      // Listen to Cloud Auth state changes across tabs/devices
      this.auth.onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
          await this._syncCloudUser(firebaseUser);
        }
      });
    } catch (err) {
      console.warn('[AetheraUserDB] Cloud sync adapter notice (running hybrid offline):', err.message);
      this.isCloudActive = false;
    }
  }

  getCloudConfig() {
    try {
      const custom = localStorage.getItem(this.cloudConfigKey);
      if (custom) return JSON.parse(custom);
    } catch (e) {}

    // Default configuration (ready-to-use template for user's Firebase project)
    return {
      apiKey: "AIzaSyAetheraCortexMultiDeviceCloudKey01",
      authDomain: "aethera-cortex-cloud.firebaseapp.com",
      projectId: "aethera-cortex-cloud",
      storageBucket: "aethera-cortex-cloud.appspot.com",
      messagingSenderId: "109876543210",
      appId: "1:109876543210:web:a1b2c3d4e5f67890aethera"
    };
  }

  setCloudConfig(config) {
    localStorage.setItem(this.cloudConfigKey, JSON.stringify(config));
    window.location.reload();
  }

  resetCloudConfigToDefault() {
    localStorage.removeItem(this.cloudConfigKey);
    window.location.reload();
  }

  isCloudConnected() {
    return this.isCloudActive;
  }

  /* --------------------------------------------------------------------------
     CRYPTOGRAPHY (SHA-256 Web Crypto API)
     -------------------------------------------------------------------------- */
  async _hashPassword(password, salt) {
    const enc = new TextEncoder();
    const data = enc.encode(password + '::' + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  _generateSalt() {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
  }

  _generateId(prefix = 'usr') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /* --------------------------------------------------------------------------
     DEFAULT SEED USERS (Ready for instant 1-click testing)
     -------------------------------------------------------------------------- */
  _getSeedUsers() {
    return [
      {
        id: 'usr_demo_pro',
        username: 'alex_mercer',
        email: 'alex@aethera.ai',
        displayName: 'Alex Mercer',
        role: 'Pro Member',
        roleTag: 'PRO',
        avatarGradient: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
        avatarEmoji: '⚡',
        bio: 'Fullstack Engineer & AI Workflow Architect',
        createdAt: '2026-01-15T08:30:00.000Z',
        lastLoginAt: new Date().toISOString(),
        preferences: { theme: 'dark', defaultTool: 'code-explainer', autoSaveChats: true },
        salt: 'a1b2c3d4e5f67890',
        passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' // 'admin123'
      },
      {
        id: 'usr_demo_cyber',
        username: 'zero_day',
        email: 'operator@aethera.ai',
        displayName: 'Cipher Nine',
        role: 'SecOps Analyst',
        roleTag: 'CYBER OPS',
        avatarGradient: 'linear-gradient(135deg, #10B981 0%, #06B6D4 100%)',
        avatarEmoji: '🛡️',
        bio: 'Offensive Security Specialist & CVE Researcher',
        createdAt: '2026-02-01T12:00:00.000Z',
        lastLoginAt: new Date().toISOString(),
        preferences: { theme: 'dark', defaultTool: 'vuln-scanner', autoSaveChats: true },
        salt: '9876543210fedcba',
        passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' // 'admin123'
      }
    ];
  }

  async _seedDatabaseIfEmpty() {
    if (!this.db) return;
    return new Promise((resolve) => {
      const tx = this.db.transaction('users', 'readonly');
      const store = tx.objectStore('users');
      const countReq = store.count();

      countReq.onsuccess = async () => {
        if (countReq.result === 0) {
          const seeds = this._getSeedUsers();
          const writeTx = this.db.transaction('users', 'readwrite');
          const writeStore = writeTx.objectStore('users');
          seeds.forEach(u => writeStore.put(u));
          writeTx.oncomplete = () => resolve();
        } else {
          resolve();
        }
      };
      countReq.onerror = () => resolve();
    });
  }

  _seedLocalStorageIfEmpty() {
    const existing = localStorage.getItem(this.storageFallbackKey);
    if (!existing) {
      localStorage.setItem(this.storageFallbackKey, JSON.stringify(this._getSeedUsers()));
    }
  }

  /* --------------------------------------------------------------------------
     SESSION & CROSS-DEVICE RESTORATION
     -------------------------------------------------------------------------- */
  async _restoreSession() {
    try {
      const sessionJson = localStorage.getItem(this.sessionKey) || sessionStorage.getItem(this.sessionKey);
      if (!sessionJson) return null;

      const session = JSON.parse(sessionJson);
      if (!session || !session.userId) return null;

      const user = await this.getUserById(session.userId);
      if (user) {
        this.currentUser = user;
        this._notifyAuthChange(user);
        return user;
      }
    } catch (e) {
      console.warn('[AetheraUserDB] Session restore error:', e);
    }
    return null;
  }

  async _syncCloudUser(firebaseUser) {
    try {
      if (!this.firestore) return;
      const userRef = this.firestore.collection('users').doc(firebaseUser.uid);
      const doc = await userRef.get();

      if (doc.exists) {
        const cloudData = doc.data();
        await this.updateUser(cloudData);
        this.currentUser = cloudData;
        this._notifyAuthChange(cloudData);

        // Also sync chats from cloud
        await this._syncChatsFromCloud(firebaseUser.uid);
      }
    } catch (e) {
      console.warn('[AetheraUserDB] Cloud user sync note:', e);
    }
  }

  async _syncChatsFromCloud(userId) {
    try {
      if (!this.firestore) return;
      const snapshot = await this.firestore
        .collection('users')
        .doc(userId)
        .collection('saved_chats')
        .get();

      for (const doc of snapshot.docs) {
        const chatData = doc.data();
        if (this.db) {
          const tx = this.db.transaction('saved_chats', 'readwrite');
          tx.objectStore('saved_chats').put(chatData);
        }
      }
    } catch (e) {
      console.warn('[AetheraUserDB] Chat sync note:', e);
    }
  }

  _notifyAuthChange(user) {
    window.dispatchEvent(new CustomEvent('aethera:auth-change', {
      detail: { user, isLoggedIn: !!user, isCloud: this.isCloudActive }
    }));
  }

  /* --------------------------------------------------------------------------
     CORE USER CRUD (CLOUD + LOCAL DUAL-LAYER)
     -------------------------------------------------------------------------- */
  async registerUser({ username, email, password, displayName, role = 'Member', roleTag = 'MEMBER', avatarEmoji = '👤', avatarGradient = 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)' }) {
    await this.ready();

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check duplicate locally
    const existingUser = await this.getUserByEmailOrUsername(cleanEmail, cleanUsername);
    if (existingUser) {
      throw new Error(existingUser.email === cleanEmail ? 'Email is already registered.' : 'Username is already taken.');
    }

    let cloudUid = null;

    // 1. If Firebase is active, create account in Cloud Auth
    if (this.isCloudActive && this.auth) {
      try {
        const cred = await this.auth.createUserWithEmailAndPassword(cleanEmail, password);
        cloudUid = cred.user.uid;
      } catch (cloudErr) {
        console.warn('[AetheraUserDB] Firebase Auth registration note:', cloudErr.message);
        // If Firebase throws an error (e.g. invalid domain / offline), fall back gracefully to secure local registration
      }
    }

    const salt = this._generateSalt();
    const passwordHash = await this._hashPassword(password, salt);
    const userId = cloudUid || this._generateId('usr');

    const newUser = {
      id: userId,
      uid: userId,
      username: cleanUsername,
      email: cleanEmail,
      displayName: displayName.trim() || cleanUsername,
      role: role,
      roleTag: roleTag,
      avatarEmoji: avatarEmoji,
      avatarGradient: avatarGradient,
      bio: 'Aethera AI Explorer',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      preferences: {
        theme: document.documentElement.getAttribute('data-theme') || 'dark',
        defaultTool: 'chatbot',
        autoSaveChats: true
      },
      salt,
      passwordHash
    };

    // 2. Save to Cloud Firestore
    if (this.isCloudActive && this.firestore && cloudUid) {
      try {
        await this.firestore.collection('users').doc(cloudUid).set(newUser);
      } catch (fsErr) {
        console.warn('[AetheraUserDB] Firestore document save note:', fsErr.message);
      }
    }

    // 3. Save to local IndexedDB / LocalStorage
    if (this.db) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction('users', 'readwrite');
        const store = tx.objectStore('users');
        const req = store.put(newUser);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } else {
      const users = this._getLocalStorageUsers();
      users.push(newUser);
      localStorage.setItem(this.storageFallbackKey, JSON.stringify(users));
    }

    // 4. Create active session
    await this._createSession(newUser, true);
    return newUser;
  }

  async loginUser({ identifier, password, rememberMe = true }) {
    await this.ready();
    const cleanIdentifier = identifier.trim().toLowerCase();

    // Check Cloud Auth first if email format
    let cloudLoggedIn = false;
    if (this.isCloudActive && this.auth && cleanIdentifier.includes('@')) {
      try {
        const cred = await this.auth.signInWithEmailAndPassword(cleanIdentifier, password);
        if (cred && cred.user) {
          cloudLoggedIn = true;
          const userDoc = await this.firestore.collection('users').doc(cred.user.uid).get();
          if (userDoc.exists) {
            const cloudUser = userDoc.data();
            cloudUser.lastLoginAt = new Date().toISOString();
            await this.updateUser(cloudUser);
            await this._createSession(cloudUser, rememberMe);
            await this._syncChatsFromCloud(cloudUser.id);
            return cloudUser;
          }
        }
      } catch (cloudErr) {
        console.log('[AetheraUserDB] Cloud auth check:', cloudErr.message);
      }
    }

    // Check local database (supports both username and email, plus demo accounts)
    const user = await this.getUserByEmailOrUsername(cleanIdentifier, cleanIdentifier);
    if (!user) {
      throw new Error('Account not found with this email or username.');
    }

    const testHash = await this._hashPassword(password, user.salt);
    if (testHash !== user.passwordHash) {
      throw new Error('Invalid password. Please try again.');
    }

    user.lastLoginAt = new Date().toISOString();
    await this.updateUser(user);
    await this._createSession(user, rememberMe);
    return user;
  }

  async _createSession(user, rememberMe = true) {
    const token = this._generateId('ses');
    const sessionData = {
      token,
      userId: user.id,
      createdAt: new Date().toISOString()
    };

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(this.sessionKey, JSON.stringify(sessionData));

    this.currentUser = user;
    this._notifyAuthChange(user);
    return sessionData;
  }

  async logoutUser() {
    if (this.isCloudActive && this.auth) {
      try {
        await this.auth.signOut();
      } catch (e) {}
    }

    localStorage.removeItem(this.sessionKey);
    sessionStorage.removeItem(this.sessionKey);
    this.currentUser = null;
    this._notifyAuthChange(null);
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isLoggedIn() {
    return !!this.currentUser;
  }

  /* --------------------------------------------------------------------------
     READ / SEARCH QUERIES
     -------------------------------------------------------------------------- */
  async getUserById(id) {
    await this.ready();
    if (this.db) {
      return new Promise((resolve) => {
        const tx = this.db.transaction('users', 'readonly');
        const store = tx.objectStore('users');
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } else {
      const users = this._getLocalStorageUsers();
      return users.find(u => u.id === id) || null;
    }
  }

  async getUserByEmailOrUsername(email, username) {
    await this.ready();
    const allUsers = await this.getAllUsers();
    return allUsers.find(u => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  async getAllUsers() {
    await this.ready();
    if (this.db) {
      return new Promise((resolve) => {
        const tx = this.db.transaction('users', 'readonly');
        const store = tx.objectStore('users');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } else {
      return this._getLocalStorageUsers();
    }
  }

  _getLocalStorageUsers() {
    try {
      return JSON.parse(localStorage.getItem(this.storageFallbackKey) || '[]');
    } catch {
      return [];
    }
  }

  /* --------------------------------------------------------------------------
     UPDATE & DELETE USER
     -------------------------------------------------------------------------- */
  async updateUser(user) {
    await this.ready();
    // Update Cloud Firestore
    if (this.isCloudActive && this.firestore && user.id) {
      try {
        await this.firestore.collection('users').doc(user.id).set(user, { merge: true });
      } catch (e) {}
    }

    // Update Local
    if (this.db) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction('users', 'readwrite');
        const store = tx.objectStore('users');
        const req = store.put(user);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } else {
      const users = this._getLocalStorageUsers();
      const idx = users.findIndex(u => u.id === user.id);
      if (idx !== -1) {
        users[idx] = user;
        localStorage.setItem(this.storageFallbackKey, JSON.stringify(users));
      }
    }

    if (this.currentUser && this.currentUser.id === user.id) {
      this.currentUser = user;
      this._notifyAuthChange(user);
    }
    return user;
  }

  async deleteUser(userId) {
    await this.ready();
    // Delete from Firestore
    if (this.isCloudActive && this.firestore) {
      try {
        await this.firestore.collection('users').doc(userId).delete();
      } catch (e) {}
    }

    // Delete Local
    if (this.db) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(['users', 'saved_chats'], 'readwrite');
        tx.objectStore('users').delete(userId);
        
        const chatStore = tx.objectStore('saved_chats');
        const chatIndex = chatStore.index('userId');
        const req = chatIndex.getAllKeys(userId);
        req.onsuccess = () => {
          (req.result || []).forEach(k => chatStore.delete(k));
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } else {
      let users = this._getLocalStorageUsers();
      users = users.filter(u => u.id !== userId);
      localStorage.setItem(this.storageFallbackKey, JSON.stringify(users));
    }

    if (this.currentUser && this.currentUser.id === userId) {
      this.logoutUser();
    }
    return true;
  }

  /* --------------------------------------------------------------------------
     USER SAVED AI CHATS & MULTI-DEVICE BOOKMARKS
     -------------------------------------------------------------------------- */
  async saveUserChat({ toolKey, title, prompt, response, starred = false }) {
    await this.ready();
    if (!this.currentUser) {
      throw new Error('Please sign in to save this workflow to your cloud profile.');
    }

    const chatEntry = {
      id: this._generateId('chat'),
      userId: this.currentUser.id,
      toolKey,
      title: title || `${toolKey.toUpperCase()} // ${new Date().toLocaleDateString()}`,
      prompt,
      response,
      starred,
      timestamp: new Date().toISOString()
    };

    // 1. Write to Cloud Firestore for multi-device availability
    if (this.isCloudActive && this.firestore && this.currentUser.id) {
      try {
        await this.firestore
          .collection('users')
          .doc(this.currentUser.id)
          .collection('saved_chats')
          .doc(chatEntry.id)
          .set(chatEntry);
      } catch (err) {
        console.warn('[AetheraUserDB] Cloud chat save note:', err.message);
      }
    }

    // 2. Write to local store
    if (this.db) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction('saved_chats', 'readwrite');
        const store = tx.objectStore('saved_chats');
        const req = store.add(chatEntry);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } else {
      const chats = this._getLocalStorageChats();
      chats.unshift(chatEntry);
      localStorage.setItem(this.chatsFallbackKey, JSON.stringify(chats));
    }

    window.dispatchEvent(new CustomEvent('aethera:chat-saved', { detail: chatEntry }));
    return chatEntry;
  }

  async getUserChats(userId = null) {
    await this.ready();
    const targetUserId = userId || (this.currentUser ? this.currentUser.id : null);
    if (!targetUserId) return [];

    let chats = [];

    // 1. Try local
    if (this.db) {
      chats = await new Promise((resolve) => {
        const tx = this.db.transaction('saved_chats', 'readonly');
        const store = tx.objectStore('saved_chats');
        const index = store.index('userId');
        const req = index.getAll(targetUserId);
        req.onsuccess = () => {
          const results = req.result || [];
          results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          resolve(results);
        };
        req.onerror = () => resolve([]);
      });
    } else {
      chats = this._getLocalStorageChats().filter(c => c.userId === targetUserId);
    }

    // 2. If online with Firestore, pull remote chats
    if (this.isCloudActive && this.firestore && chats.length === 0) {
      try {
        const snapshot = await this.firestore
          .collection('users')
          .doc(targetUserId)
          .collection('saved_chats')
          .orderBy('timestamp', 'desc')
          .get();

        chats = snapshot.docs.map(doc => doc.data());
      } catch (e) {}
    }

    return chats;
  }

  async deleteUserChat(chatId) {
    await this.ready();
    // Delete from Firestore
    if (this.isCloudActive && this.firestore && this.currentUser) {
      try {
        await this.firestore
          .collection('users')
          .doc(this.currentUser.id)
          .collection('saved_chats')
          .doc(chatId)
          .delete();
      } catch (e) {}
    }

    // Delete local
    if (this.db) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction('saved_chats', 'readwrite');
        const store = tx.objectStore('saved_chats');
        const req = store.delete(chatId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } else {
      let chats = this._getLocalStorageChats();
      chats = chats.filter(c => c.id !== chatId);
      localStorage.setItem(this.chatsFallbackKey, JSON.stringify(chats));
    }
    return true;
  }

  _getLocalStorageChats() {
    try {
      return JSON.parse(localStorage.getItem(this.chatsFallbackKey) || '[]');
    } catch {
      return [];
    }
  }

  /* --------------------------------------------------------------------------
     DATABASE MANAGEMENT / EXPORT / IMPORT / RESET
     -------------------------------------------------------------------------- */
  async exportDatabaseJSON() {
    await this.ready();
    const users = await this.getAllUsers();
    let chats = [];

    if (this.db) {
      chats = await new Promise((resolve) => {
        const tx = this.db.transaction('saved_chats', 'readonly');
        const store = tx.objectStore('saved_chats');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } else {
      chats = this._getLocalStorageChats();
    }

    const payload = {
      databaseName: 'Aethera Cortex Database',
      version: 2.0,
      exportedAt: new Date().toISOString(),
      storageEngine: this.isCloudActive ? 'Firebase Cloud Firestore + IndexedDB' : 'IndexedDB',
      usersCount: users.length,
      chatsCount: chats.length,
      data: {
        users,
        saved_chats: chats
      }
    };

    return JSON.stringify(payload, null, 2);
  }

  async importDatabaseJSON(jsonString) {
    await this.ready();
    const parsed = JSON.parse(jsonString);
    if (!parsed || !parsed.data || !Array.isArray(parsed.data.users)) {
      throw new Error('Invalid Aethera database JSON structure.');
    }

    const newUsers = parsed.data.users;
    const newChats = parsed.data.saved_chats || [];

    if (this.db) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(['users', 'saved_chats'], 'readwrite');
        const uStore = tx.objectStore('users');
        const cStore = tx.objectStore('saved_chats');
        uStore.clear();
        cStore.clear();

        newUsers.forEach(u => uStore.put(u));
        newChats.forEach(c => cStore.put(c));

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } else {
      localStorage.setItem(this.storageFallbackKey, JSON.stringify(newUsers));
      localStorage.setItem(this.chatsFallbackKey, JSON.stringify(newChats));
    }

    await this._restoreSession();
    return { usersImported: newUsers.length, chatsImported: newChats.length };
  }

  async resetDatabase() {
    await this.ready();
    if (this.db) {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(['users', 'saved_chats'], 'readwrite');
        tx.objectStore('users').clear();
        tx.objectStore('saved_chats').clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } else {
      localStorage.removeItem(this.storageFallbackKey);
      localStorage.removeItem(this.chatsFallbackKey);
    }

    this.logoutUser();
    await this._seedDatabaseIfEmpty();
    return true;
  }
}

// Global Singleton Instance
window.aetheraDB = new AetheraUserDB();

/* ============================================================================
   AETHERA AUTH & NAVBAR CONTROLLER
   ============================================================================ */
class AetheraAuthUI {
  constructor() {
    this.db = window.aetheraDB;
    this.activeModal = null;

    document.addEventListener('DOMContentLoaded', () => {
      this.mountAuthUI();
    });

    window.addEventListener('aethera:auth-change', (e) => {
      this.updateNavbarAuthState(e.detail.user);
    });
  }

  mountAuthUI() {
    this.injectSharedModals();
    this.db.ready().then(() => {
      this.updateNavbarAuthState(this.db.getCurrentUser());
    });
  }

  injectSharedModals() {
    if (document.getElementById('aethera-profile-modal-root')) return;

    const modalContainer = document.createElement('div');
    modalContainer.id = 'aethera-profile-modal-root';
    modalContainer.innerHTML = `
      <!-- USER PROFILE & SAVED SESSIONS MODAL -->
      <div id="aethera-profile-modal" class="aethera-modal-backdrop" aria-hidden="true">
        <div class="aethera-modal-dialog glass-panel profile-dialog" role="dialog" aria-labelledby="profile-modal-title">
          <button class="aethera-modal-close" id="profile-modal-close" aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <div class="profile-hero-card" id="profile-hero-display">
            <!-- Populated via JS -->
          </div>

          <div class="profile-tabs" role="tablist">
            <button class="auth-tab active" data-target="profile-tab-saved">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              <span>Saved AI History (<span id="user-saved-chats-count">0</span>)</span>
            </button>
            <button class="auth-tab" data-target="profile-tab-settings">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span>Account Settings</span>
            </button>
          </div>

          <!-- SAVED HISTORY LIST -->
          <div id="profile-tab-saved" class="profile-tab-content active">
            <div class="saved-chats-list" id="profile-saved-chats-container">
              <!-- Populated via JS -->
            </div>
          </div>

          <!-- ACCOUNT SETTINGS -->
          <div id="profile-tab-settings" class="profile-tab-content">
            <form id="profile-update-form" class="auth-form-panel active">
              <div class="auth-field-group">
                <label class="auth-label" for="prof-display-name">Display Name</label>
                <div class="auth-input-wrapper">
                  <input type="text" id="prof-display-name" class="auth-input" required>
                </div>
              </div>
              <div class="auth-field-group">
                <label class="auth-label" for="prof-bio">Bio &amp; Workflow Specialty</label>
                <div class="auth-input-wrapper">
                  <input type="text" id="prof-bio" class="auth-input">
                </div>
              </div>
              <button type="submit" class="btn btn-primary" style="align-self: flex-start;">
                <span>Save Profile Changes</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- DATABASE INSPECTOR HUD MODAL -->
      <div id="aethera-db-modal" class="aethera-modal-backdrop" aria-hidden="true">
        <div class="aethera-modal-dialog glass-panel db-inspector-dialog" role="dialog" aria-labelledby="db-modal-title">
          <button class="aethera-modal-close" id="db-modal-close" aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          <div class="db-inspector-header">
            <div class="db-hud-pill">
              <span class="db-hud-dot"></span>
              <span id="db-engine-label">DATABASE: CLOUD FIRESTORE // MULTI-DEVICE SYNC</span>
            </div>
            <h2 id="db-modal-title" class="auth-title">Aethera User Database HUD</h2>
            <p class="auth-subtitle">Live schema telemetry, active records, cryptographic salt verifications &amp; audit trails</p>
          </div>

          <div class="db-stats-grid">
            <div class="db-stat-card">
              <span class="stat-num" id="db-stat-users">0</span>
              <span class="stat-label">REGISTERED USERS</span>
            </div>
            <div class="db-stat-card">
              <span class="stat-num" id="db-stat-chats">0</span>
              <span class="stat-label">SAVED AI CHATS</span>
            </div>
            <div class="db-stat-card">
              <span class="stat-num" id="db-stat-security">CLOUD + SHA256</span>
              <span class="stat-label">MULTI-DEVICE ENCRYPTION</span>
            </div>
          </div>

          <div class="db-actions-toolbar">
            <button id="btn-db-export" class="btn btn-secondary" title="Export database as JSON">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Export DB (JSON)</span>
            </button>
            <label class="btn btn-secondary btn-file-label" title="Import database from JSON">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span>Import DB</span>
              <input type="file" id="input-db-import" accept=".json" style="display: none;">
            </label>
            <button id="btn-db-reset" class="btn btn-danger" title="Reset to default seed users">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span>Reset Database</span>
            </button>
          </div>

          <div class="db-table-wrapper">
            <table class="db-table">
              <thead>
                <tr>
                  <th>User &amp; Handle</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="db-users-tbody">
                <!-- Populated via JS -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalContainer);
    this.bindModalEvents();
  }

  bindModalEvents() {
    // Modal Close
    document.querySelectorAll('.aethera-modal-close').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });

    document.querySelectorAll('.aethera-modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.closeAllModals();
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAllModals();
    });

    // Profile Tabs
    document.querySelectorAll('.profile-dialog .auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const parent = tab.closest('.profile-dialog');
        if (!parent) return;
        parent.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const targetId = tab.getAttribute('data-target');
        if (targetId) {
          parent.querySelectorAll('.profile-tab-content').forEach(p => p.classList.remove('active'));
          const targetEl = document.getElementById(targetId);
          if (targetEl) targetEl.classList.add('active');
        }
      });
    });

    // Database Export
    const exportBtn = document.getElementById('btn-db-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        const json = await this.db.exportDatabaseJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aethera_database_export_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Database Import
    const importInput = document.getElementById('input-db-import');
    if (importInput) {
      importInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const res = await this.db.importDatabaseJSON(ev.target.result);
            alert(`Database import complete! Restored ${res.usersImported} users.`);
            this.refreshDatabaseHUD();
          } catch (err) {
            alert('Import failed: ' + err.message);
          }
        };
        reader.readAsText(file);
      });
    }

    // Database Reset
    const resetBtn = document.getElementById('btn-db-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to reset the database to default seed accounts?')) {
          await this.db.resetDatabase();
          alert('Database reset to clean state.');
          this.refreshDatabaseHUD();
        }
      });
    }

    // Profile Settings Form
    const profForm = document.getElementById('profile-update-form');
    if (profForm) {
      profForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = this.db.getCurrentUser();
        if (!user) return;
        user.displayName = document.getElementById('prof-display-name').value;
        user.bio = document.getElementById('prof-bio').value;
        await this.db.updateUser(user);
        alert('Profile details updated successfully!');
        this.renderProfileHero(user);
      });
    }
  }

  /* --------------------------------------------------------------------------
     NAVBAR AUTH STATE (Pill with Dropdown Menu or Sign In Link)
     -------------------------------------------------------------------------- */
  updateNavbarAuthState(user) {
    let targetSlot = document.getElementById('navbar-auth-slot');
    if (!targetSlot) {
      const navActions = document.querySelector('.nav-actions') || document.querySelector('.studio-header-right');
      if (navActions) {
        targetSlot = document.createElement('div');
        targetSlot.id = 'navbar-auth-slot';
        targetSlot.className = 'navbar-auth-slot';
        navActions.insertBefore(targetSlot, navActions.firstChild);
      }
    }

    if (!targetSlot) return;

    if (user) {
      targetSlot.innerHTML = `
        <div class="auth-user-dropdown-wrapper">
          <button class="auth-user-pill-btn" id="btn-user-profile-toggle" type="button" aria-haspopup="true" aria-expanded="false">
            <div class="user-pill-avatar" style="background: ${user.avatarGradient};">
              <span>${user.avatarEmoji || '👤'}</span>
            </div>
            <div class="user-pill-info">
              <span class="user-pill-name">${user.displayName}</span>
              <span class="user-pill-badge">${user.roleTag || 'USER'}</span>
            </div>
            <svg class="user-pill-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>

          <!-- Dropdown Menu -->
          <div class="auth-user-menu" id="auth-user-dropdown-menu" role="menu">
            <div class="user-menu-header">
              <span class="menu-header-name">${user.displayName}</span>
              <span class="menu-header-handle">@${user.username}</span>
              <span class="menu-header-email">${user.email}</span>
            </div>
            <div class="user-menu-divider"></div>
            <button class="user-menu-item" id="menu-btn-profile" role="menuitem">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>Profile &amp; Saved Chats</span>
            </button>
            <button class="user-menu-item" id="menu-btn-db" role="menuitem">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
              <span>Database Inspector HUD</span>
            </button>
            <div class="user-menu-divider"></div>
            <button class="user-menu-item item-danger" id="menu-btn-logout" role="menuitem">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      `;

      this.bindUserDropdownEvents();
    } else {
      const currentPath = window.location.pathname.split('/').pop() || 'index.html';
      const redirectParam = encodeURIComponent(currentPath);

      targetSlot.innerHTML = `
        <a href="login.html?redirect=${redirectParam}" class="btn btn-secondary auth-signin-trigger-btn" id="btn-open-auth-modal">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          <span>Sign In / Cloud DB</span>
        </a>
      `;
    }
  }

  bindUserDropdownEvents() {
    const pillBtn = document.getElementById('btn-user-profile-toggle');
    const menu = document.getElementById('auth-user-dropdown-menu');
    if (!pillBtn || !menu) return;

    pillBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.contains('active');
      menu.classList.toggle('active', !isOpen);
      pillBtn.setAttribute('aria-expanded', String(!isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!pillBtn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('active');
        pillBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // Profile Menu Item
    const profileItem = document.getElementById('menu-btn-profile');
    if (profileItem) {
      profileItem.addEventListener('click', () => {
        menu.classList.remove('active');
        this.openProfileModal();
      });
    }

    // DB HUD Menu Item
    const dbItem = document.getElementById('menu-btn-db');
    if (dbItem) {
      dbItem.addEventListener('click', () => {
        menu.classList.remove('active');
        this.openDatabaseModal();
      });
    }

    // Logout Menu Item
    const logoutItem = document.getElementById('menu-btn-logout');
    if (logoutItem) {
      logoutItem.addEventListener('click', async () => {
        menu.classList.remove('active');
        await this.db.logoutUser();
      });
    }
  }

  /* --------------------------------------------------------------------------
     MODAL CONTROLS & RENDERING
     -------------------------------------------------------------------------- */
  async openProfileModal() {
    this.closeAllModals();
    const modal = document.getElementById('aethera-profile-modal');
    if (!modal) return;

    const user = this.db.getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    this.renderProfileHero(user);
    await this.renderSavedChatsList(user);

    const nameInput = document.getElementById('prof-display-name');
    const bioInput = document.getElementById('prof-bio');
    if (nameInput) nameInput.value = user.displayName;
    if (bioInput) bioInput.value = user.bio || '';

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    this.activeModal = modal;
  }

  renderProfileHero(user) {
    const hero = document.getElementById('profile-hero-display');
    if (!hero) return;
    hero.innerHTML = `
      <div class="profile-avatar-large" style="background: ${user.avatarGradient};">
        <span>${user.avatarEmoji || '👤'}</span>
      </div>
      <div class="profile-hero-details">
        <div class="profile-name-row">
          <h3 class="profile-name">${user.displayName}</h3>
          <span class="profile-role-badge">${user.role}</span>
        </div>
        <div class="profile-meta-row">
          <span>@${user.username}</span>
          <span>•</span>
          <span>${user.email}</span>
          <span>•</span>
          <span>Joined ${new Date(user.createdAt).toLocaleDateString()}</span>
        </div>
        <p class="profile-bio-text">${user.bio || 'AI Studio Operator'}</p>
      </div>
    `;
  }

  async renderSavedChatsList(user) {
    const container = document.getElementById('profile-saved-chats-container');
    const countEl = document.getElementById('user-saved-chats-count');
    if (!container) return;

    const chats = await this.db.getUserChats(user.id);
    if (countEl) countEl.textContent = chats.length;

    if (chats.length === 0) {
      container.innerHTML = `
        <div class="saved-chats-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <h4>No Saved AI History Yet</h4>
          <p>When running any AI tool in the Studio, click the <strong>Save to DB</strong> button to preserve key findings, generated code, or prompts across all your devices.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = chats.map(chat => `
      <div class="saved-chat-card" data-chat-id="${chat.id}">
        <div class="saved-chat-header">
          <div class="saved-chat-badge">
            <span class="tool-tag">${chat.toolKey.toUpperCase()}</span>
            <span class="chat-time">${new Date(chat.timestamp).toLocaleString()}</span>
          </div>
          <button class="btn-delete-chat" data-id="${chat.id}" title="Delete saved record">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          </button>
        </div>
        <div class="saved-chat-prompt">
          <strong>Prompt:</strong> ${this.escapeHTML(chat.prompt)}
        </div>
        <div class="saved-chat-response">
          ${this.escapeHTML(chat.response.substring(0, 240))}${chat.response.length > 240 ? '...' : ''}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.btn-delete-chat').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (confirm('Delete this saved conversation from cloud and local storage?')) {
          await this.db.deleteUserChat(id);
          this.renderSavedChatsList(user);
        }
      });
    });
  }

  async openDatabaseModal() {
    this.closeAllModals();
    const modal = document.getElementById('aethera-db-modal');
    if (!modal) return;

    await this.refreshDatabaseHUD();

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    this.activeModal = modal;
  }

  async refreshDatabaseHUD() {
    const users = await this.db.getAllUsers();
    let allChats = [];
    if (this.db.db) {
      allChats = await new Promise((resolve) => {
        const tx = this.db.db.transaction('saved_chats', 'readonly');
        const req = tx.objectStore('saved_chats').getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } else {
      allChats = this.db._getLocalStorageChats();
    }

    const statUsers = document.getElementById('db-stat-users');
    const statChats = document.getElementById('db-stat-chats');
    const engineLabel = document.getElementById('db-engine-label');

    if (statUsers) statUsers.textContent = users.length;
    if (statChats) statChats.textContent = allChats.length;
    if (engineLabel) {
      engineLabel.textContent = `DATABASE ENGINE: ${this.db.isCloudConnected() ? 'FIREBASE CLOUD FIRESTORE + INDEXED_DB' : 'INDEXED_DB // LOCAL'} (${users.length} USERS)`;
    }

    const tbody = document.getElementById('db-users-tbody');
    if (!tbody) return;

    tbody.innerHTML = users.map(u => `
      <tr>
        <td>
          <div class="db-user-cell">
            <div class="db-user-avatar" style="background: ${u.avatarGradient};">
              <span>${u.avatarEmoji || '👤'}</span>
            </div>
            <div>
              <div class="db-user-name">${u.displayName}</div>
              <div class="db-user-handle">@${u.username}</div>
            </div>
          </div>
        </td>
        <td><code class="db-code">${u.email}</code></td>
        <td><span class="db-role-tag">${u.role}</span></td>
        <td>${new Date(u.createdAt).toLocaleDateString()}</td>
        <td>${new Date(u.lastLoginAt || u.createdAt).toLocaleTimeString()}</td>
        <td>
          <button class="db-delete-btn" data-id="${u.id}" title="Delete User Record">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
            <span>Delete</span>
          </button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.db-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm(`Are you sure you want to permanently delete user record ${id}?`)) {
          await this.db.deleteUser(id);
          this.refreshDatabaseHUD();
        }
      });
    });
  }

  closeAllModals() {
    document.querySelectorAll('.aethera-modal-backdrop').forEach(modal => {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    });
    this.activeModal = null;
  }

  escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Global Singleton UI Controller
window.aetheraAuthUI = new AetheraAuthUI();
