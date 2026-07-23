/**
 * GlobalPulse — Authentication Module - Firebase Enabled
 * Uses Firebase (loaded via SDK in index.html) for auth + realtime database
 */

const GPAuth = (() => {
  'use strict';

  const KEYS = {
    currentUser: 'gp_current_user',
    points: 'gp_points',
    streak: 'gp_streak',
    lastVisit: 'gp_last_visit',
    bookmarks: 'gp_bookmarks',
    likes: 'gp_likes',
    theme: 'gp_theme',
    pushEnabled: 'gp_push_enabled',
    totalVisits: 'gp_total_visits',
  };

  function getStorage(key, def) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
  }
  function setStorage(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const DISPOSABLE_DOMAINS = [
    'mailinator.com','yopmail.com','tempmail.com','dispostable.com',
    'guerrillamail.com','sharklasers.com','10minutemail.com','trashmail.com',
    'throwaway.email','getnada.com','maildrop.cc','temp-mail.org',
    'guerrillamailblock.com','tempail.com','mailsac.com','mohmal.com',
    'emailondeck.com','spamgourmet.com','mytemp.email',
  ];

  function getCurrentUser() { return getStorage(KEYS.currentUser, null); }

  function validateEmail(email) {
    if (!EMAIL_REGEX.test(email)) throw new Error("Invalid email format.");
    const domain = email.substring(email.lastIndexOf("@") + 1).toLowerCase();
    if (DISPOSABLE_DOMAINS.includes(domain)) throw new Error("Disposable emails not allowed.");
  }

  async function register(name, email, password) {
    email = email.toLowerCase().trim();
    name = name.trim();
    if (!name || name.length < 2) throw new Error("Name must be at least 2 characters.");
    validateEmail(email);
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");

    try {
      const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: name });

      await firebase.database().ref('users/' + cred.user.uid).set({
        name, email, createdAt: firebase.database.ServerValue.TIMESTAMP,
        points: 0, streak: 0, lastVisit: null, totalVisits: 0
      });

      const user = { uid: cred.user.uid, name, email };
      setStorage(KEYS.currentUser, user);
      setStorage(KEYS.points, 0);
      setStorage(KEYS.streak, 0);
      setStorage(KEYS.bookmarks, []);
      setStorage(KEYS.likes, []);
      dispatch(user);
      return user;
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') throw new Error("Email already registered.");
      throw new Error(e.message);
    }
  }

  async function login(email, password) {
    email = email.toLowerCase().trim();
    try {
      const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
      let dbData = {};
      try {
        const snap = await firebase.database().ref('users/' + cred.user.uid).once('value');
        dbData = snap.val() || {};
      } catch {}
      
      if (dbData.points !== undefined) setStorage(KEYS.points, dbData.points);
      if (dbData.streak !== undefined) setStorage(KEYS.streak, dbData.streak);
      if (dbData.lastVisit) setStorage(KEYS.lastVisit, dbData.lastVisit);
      if (dbData.totalVisits !== undefined) setStorage(KEYS.totalVisits, dbData.totalVisits);

      const user = {
        uid: cred.user.uid,
        name: cred.user.displayName || dbData.name || email.split('@')[0],
        email: cred.user.email
      };
      setStorage(KEYS.currentUser, user);
      dispatch(user);
      return user;
    } catch (e) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') throw new Error("Invalid email or password.");
      if (e.code === 'auth/too-many-requests') throw new Error("Too many attempts. Try later.");
      throw new Error(e.message);
    }
  }

  async function logout() {
    const user = getCurrentUser();
    if (user && user.uid) {
      try {
        await firebase.database().ref('users/' + user.uid).update({
          points: getStorage(KEYS.points, 0),
          streak: getStorage(KEYS.streak, 0),
          lastVisit: getStorage(KEYS.lastVisit, null),
          totalVisits: getStorage(KEYS.totalVisits, 0),
        });
      } catch {}
    }
    try { await firebase.auth().signOut(); } catch {}
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
    dispatch(null);
  }

  function dispatch(user) {
    window.dispatchEvent(new CustomEvent('gp-auth-change', { detail: { user } }));
  }

  return { getCurrentUser, register, login, logout };
})();
