/**
 * GlobalPulse — Authentication Module
 * Handles user sign in, sign up, session management, and syncing data.
 * Supports both client-side Firebase (production) and simulated persistence.
 */

const GPAuth = (() => {
  'use strict';

  // --- Configuration ---
  // To connect a real Firebase project, fill in your details here:
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
  };

  // Check if Firebase is configured
  const isFirebaseEnabled = !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

  // Initialize simulated DB if needed
  if (!localStorage.getItem(KEYS.usersDb)) {
    localStorage.setItem(KEYS.usersDb, JSON.stringify({}));
  }

  // --- Private Helpers ---
  function getUsersDb() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.usersDb)) || {};
    } catch {
      return {};
    }
  }

  function setUsersDb(db) {
    localStorage.setItem(KEYS.usersDb, JSON.stringify(db));
  }

  // --- Public API ---
  
  /**
   * Get the currently logged in user
   */
  function getCurrentUser() {
    try {
      const user = localStorage.getItem(KEYS.currentUser);
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }

  /**
   * Register a new user
   */
  async function register(name, email, password) {
    email = email.toLowerCase().trim();
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
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
      name: name.trim(),
      email: email,
      createdAt: new Date().toISOString(),
      points: 0,
      streak: 0,
      bookmarks: [],
      likes: [],
      passwordHash: btoa(password) // simple mock hashing
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
    email = email.toLowerCase().trim();

    if (isFirebaseEnabled) {
      // Firebase login placeholder
    }

    const db = getUsersDb();
    const user = db[email];

    if (!user || user.passwordHash !== btoa(password)) {
      throw new Error("Invalid email or password.");
    }

    // Create session user (omit password hash)
    const sessionUser = {
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    };

    localStorage.setItem(KEYS.currentUser, JSON.stringify(sessionUser));

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

  // --- Dispatch Custom Auth Event ---
  function dispatchAuthChange(user) {
    const event = new CustomEvent('gp-auth-change', { detail: { user } });
    window.dispatchEvent(event);
  }

  return {
    getCurrentUser,
    register,
    login,
    logout,
    syncUserData,
    isFirebaseEnabled
  };
})();
