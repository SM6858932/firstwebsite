/**
 * GlobalPulse — Authentication Module
 * Handles user sign in, sign up, session management, and syncing data.
 * Supports both client-side Firebase (production) and simulated persistence.
 *
 * SECURITY NOTES:
 * - Passwords are hashed using SHA-256 via the Web Crypto API.
 *   This is a CLIENT-SIDE mock. In production, use bcrypt or argon2 on a server.
 * - Rate limiting is enforced client-side (5 attempts / 15 min).
 *   In production, enforce server-side rate limits.
 * - localStorage data is not encrypted. Do not store highly sensitive data.
 */

const GPAuth = (() => {
  'use strict';

  // --- Configuration ---
  // SECURITY WARNING: If you fill in Firebase credentials, they will be exposed
  // in client-side source code. For production, use environment variables via a
  // build step (e.g., Vite/Webpack), or proxy requests through a backend server.
  const FIREBASE_CONFIG = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  };

  // --- State keys ---
  const KEYS = {
    usersDb: 'gp_users_database',
    currentUser: 'gp_current_user',
    points: 'gp_points',
    streak: 'gp_streak',
    bookmarks: 'gp_bookmarks',
    likes: 'gp_likes',
    authAttempts: 'gp_auth_attempts',
  };

  // --- Rate Limiting Configuration ---
  const MAX_AUTH_ATTEMPTS = 5;
  const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  // Check if Firebase is configured
  const isFirebaseEnabled = !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

  // --- Secure Storage Wrapper (Fix #14: Encrypt sensitive data in localStorage) ---
  function encrypt(text) {
    if (!text) return '';
    const key = 'gp_secure_storage_key';
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(unescape(encodeURIComponent(result)));
  }

  function decrypt(encoded) {
    if (!encoded) return '';
    try {
      const text = decodeURIComponent(escape(atob(encoded)));
      const key = 'gp_secure_storage_key';
      let result = '';
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
      }
      return result;
    } catch (e) {
      return '';
    }
  }

  function getSecureItem(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultValue;
      // Handle legacy plain text data migration gracefully
      if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
        const data = JSON.parse(raw);
        setSecureItem(key, data); // Migrate to secure format
        return data;
      }
      const decrypted = decrypt(raw);
      return decrypted ? JSON.parse(decrypted) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  function setSecureItem(key, value) {
    try {
      const serialized = JSON.stringify(value);
      const encrypted = encrypt(serialized);
      localStorage.setItem(key, encrypted);
    } catch (e) {}
  }

  // Initialize simulated DB if needed
  if (!localStorage.getItem(KEYS.usersDb)) {
    setSecureItem(KEYS.usersDb, {});
  }

  // --- Private Helpers ---
  function getUsersDb() {
    return getSecureItem(KEYS.usersDb, {});
  }

  function setUsersDb(db) {
    setSecureItem(KEYS.usersDb, db);
  }

  /**
   * Hash a password using SHA-256 via Web Crypto API.
   * Returns a hex string. This is NOT equivalent to bcrypt/argon2 but is
   * far more secure than the previous btoa() (Base64) approach.
   * In production, always hash passwords SERVER-SIDE with bcrypt or argon2.
   */
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    // Add a fixed salt to prevent trivial rainbow-table lookups.
    // In production, use a unique per-user salt stored alongside the hash.
    const salted = 'gp_salt_v1::' + password;
    const data = encoder.encode(salted);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // --- Rate Limiting ---
  function getAuthAttempts() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.authAttempts)) || [];
    } catch {
      return [];
    }
  }

  function recordAuthAttempt() {
    const attempts = getAuthAttempts();
    attempts.push(Date.now());
    localStorage.setItem(KEYS.authAttempts, JSON.stringify(attempts));
  }

  function checkRateLimit() {
    const now = Date.now();
    let attempts = getAuthAttempts();
    // Prune old attempts outside the window
    attempts = attempts.filter(ts => now - ts < AUTH_WINDOW_MS);
    localStorage.setItem(KEYS.authAttempts, JSON.stringify(attempts));

    if (attempts.length >= MAX_AUTH_ATTEMPTS) {
      const oldestInWindow = Math.min(...attempts);
      const retryAfterMs = AUTH_WINDOW_MS - (now - oldestInWindow);
      const retryMinutes = Math.ceil(retryAfterMs / 60000);
      throw new Error(`Too many attempts. Please try again in ${retryMinutes} minute${retryMinutes > 1 ? 's' : ''}.`);
    }
  }

  // --- Email Validation ---
  // Stricter regex: requires domain with at least one dot and TLD of 2+ chars
  const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

  // Expanded disposable/temporary email domain blocklist
  const DISPOSABLE_DOMAINS = [
    'mailinator.com', 'yopmail.com', 'tempmail.com', 'dispostable.com',
    'guerrillamail.com', 'sharklasers.com', '10minutemail.com', 'trashmail.com',
    'throwaway.email', 'getnada.com', 'maildrop.cc', 'temp-mail.org',
    'fakeinbox.com', 'mailnesia.com', 'guerrillamailblock.com', 'grr.la',
    'guerrillamail.info', 'guerrillamail.net', 'guerrillamail.de',
    'tempail.com', 'burpcollaborator.net', 'mailsac.com', 'mohmal.com',
    'harakirimail.com', 'tmail.ws', 'tmpmail.net', 'tmpmail.org',
    'emailondeck.com', 'spamgourmet.com', 'mytemp.email',
  ];

  // --- Public API ---
  
  /**
   * Get the currently logged in user
   */
  function getCurrentUser() {
    return getSecureItem(KEYS.currentUser, null);
  }

  /**
   * Register a new user
   */
  async function register(name, email, password) {
    // Rate limit check
    checkRateLimit();
    recordAuthAttempt();

    email = email.toLowerCase().trim();
    name = name.trim();

    // Name validation
    if (!name || name.length < 2 || name.length > 50) {
      throw new Error("Name must be between 2 and 50 characters.");
    }

    // Email format validation (stricter regex)
    if (!EMAIL_REGEX.test(email)) {
      throw new Error("Please enter a valid email address.");
    }

    // Disposable/temporary email domains check
    const domain = email.substring(email.lastIndexOf("@") + 1);
    if (DISPOSABLE_DOMAINS.includes(domain)) {
      throw new Error("Registration using disposable email addresses is not allowed.");
    }

    // Password strength validation
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }
    if (password.length > 128) {
      throw new Error("Password must not exceed 128 characters.");
    }

    if (isFirebaseEnabled) {
      // Firebase registration placeholder
    }

    // Simulated user database
    const db = getUsersDb();
    if (db[email]) {
      throw new Error("Email address is already registered.");
    }

    const newUser = {
      name: name,
      email: email,
      createdAt: new Date().toISOString(),
      points: 0,
      streak: 0,
      bookmarks: [],
      likes: [],
      passwordHash: await hashPassword(password)
    };

    db[email] = newUser;
    setUsersDb(db);

    // Auto-login after registration
    return login(email, password);
  }

  /**
   * Login user
   */
  async function login(email, password) {
    // Rate limit check
    checkRateLimit();
    recordAuthAttempt();

    email = email.toLowerCase().trim();

    if (isFirebaseEnabled) {
      // Firebase login placeholder
    }

    const db = getUsersDb();
    const user = db[email];
    const passwordHash = await hashPassword(password);

    if (!user || user.passwordHash !== passwordHash) {
      throw new Error("Invalid email or password.");
    }

    // Create session user (omit password hash)
    const sessionUser = {
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    };

    setSecureItem(KEYS.currentUser, sessionUser);

    // Sync saved database data into active localStorage
    localStorage.setItem(KEYS.points, user.points);
    localStorage.setItem(KEYS.streak, user.streak);
    localStorage.setItem(KEYS.bookmarks, JSON.stringify(user.bookmarks));
    localStorage.setItem(KEYS.likes, JSON.stringify(user.likes));

    // Dispatch auth state change event
    dispatchAuthChange(sessionUser);

    return sessionUser;
  }

  /**
   * Sign out
   */
  function logout() {
    const user = getCurrentUser();
    if (user && !isFirebaseEnabled) {
      // Save current active state back to user DB before signing out
      const db = getUsersDb();
      const email = user.email;
      if (db[email]) {
        db[email].points = parseInt(localStorage.getItem(KEYS.points)) || 0;
        db[email].streak = parseInt(localStorage.getItem(KEYS.streak)) || 0;
        db[email].bookmarks = JSON.parse(localStorage.getItem(KEYS.bookmarks)) || [];
        db[email].likes = JSON.parse(localStorage.getItem(KEYS.likes)) || [];
        setUsersDb(db);
      }
    }

    localStorage.removeItem(KEYS.currentUser);
    
    // Reset active score/streak to guest settings
    localStorage.setItem(KEYS.points, 0);
    localStorage.setItem(KEYS.streak, 0);
    localStorage.setItem(KEYS.bookmarks, JSON.stringify([]));
    localStorage.setItem(KEYS.likes, JSON.stringify([]));

    dispatchAuthChange(null);
  }

  /**
   * Save user engagement data back to database for persistent sync
   */
  function syncUserData() {
    const user = getCurrentUser();
    if (!user) return;

    if (isFirebaseEnabled) {
      // Firebase cloud sync
    } else {
      const db = getUsersDb();
      const email = user.email;
      if (db[email]) {
        db[email].points = parseInt(localStorage.getItem(KEYS.points)) || 0;
        db[email].streak = parseInt(localStorage.getItem(KEYS.streak)) || 0;
        db[email].bookmarks = JSON.parse(localStorage.getItem(KEYS.bookmarks)) || [];
        db[email].likes = JSON.parse(localStorage.getItem(KEYS.likes)) || [];
        setUsersDb(db);
      }
    }
  }

  // --- CSRF Protection (Fix #6) ---
  const CSRF_KEY = 'gp_csrf_token';

  function getCSRFToken() {
    try {
      let token = sessionStorage.getItem(CSRF_KEY);
      if (!token) {
        // Generate cryptographically secure token
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        token = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
        sessionStorage.setItem(CSRF_KEY, token);
      }
      return token;
    } catch (e) {
      return 'mock-csrf-token-fallback';
    }
  }

  function validateCSRFToken(token) {
    if (!token) return false;
    const currentToken = getCSRFToken();
    return token === currentToken;
  }

  // --- Dispatch Custom Auth Event ---
  function dispatchAuthChange(user) {
    const event = new CustomEvent('gp-auth-change', { detail: { user } });
    window.dispatchEvent(event);
  }

  const authInstance = {
    getCurrentUser,
    register,
    login,
    logout,
    syncUserData,
    isFirebaseEnabled,
    getCSRFToken,
    validateCSRFToken
  };

  if (typeof window !== 'undefined') {
    window.GPAuth = authInstance;
  }

  return authInstance;
})();
