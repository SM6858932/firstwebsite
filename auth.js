/**
 * GlobalPulse — Firebase Authentication Module
 * Real Firebase Email/Password auth with Realtime Database persistence.
 * Blocks disposable/temporary emails. Syncs points/streaks/bookmarks across devices.
 */

const GPAuth = (() => {
  'use strict';

  const KEYS = {
    currentUser: 'gp_current_user', points: 'gp_points', streak: 'gp_streak',
    lastVisit: 'gp_last_visit', bookmarks: 'gp_bookmarks', likes: 'gp_likes',
    comments: 'gp_comments', totalVisits: 'gp_total_visits', authAttempts: 'gp_auth_attempts'
  };

  const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  const MAX_ATTEMPTS = 5;
  const ATTEMPT_WINDOW = 15 * 60 * 1000;

  const DISPOSABLE = [
    'mailinator.com','yopmail.com','tempmail.com','dispostable.com','guerrillamail.com',
    'sharklasers.com','10minutemail.com','trashmail.com','throwaway.email','getnada.com',
    'maildrop.cc','temp-mail.org','fakeinbox.com','mailnesia.com','guerrillamailblock.com',
    'grr.la','guerrillamail.info','guerrillamail.net','guerrillamail.de','tempail.com',
    'burpcollaborator.net','mailsac.com','mohmal.com','harakirimail.com','tmail.ws',
    'tmpmail.net','tmpmail.org','emailondeck.com','spamgourmet.com','mytemp.email'
  ];

  function g(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } }
  function s(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

  function checkRate() {
    const now = Date.now();
    let attempts = g(KEYS.authAttempts, []).filter(t => now - t < ATTEMPT_WINDOW);
    s(KEYS.authAttempts, attempts);
    if (attempts.length >= MAX_ATTEMPTS) {
      const retryMin = Math.ceil((ATTEMPT_WINDOW - (now - Math.min(...attempts))) / 60000);
      throw new Error(`Too many attempts. Try again in ${retryMin} minute${retryMin > 1 ? 's' : ''}.`);
    }
    attempts.push(now);
    s(KEYS.authAttempts, attempts);
  }

  function rf(uid) { return firebase.database().ref('users/' + uid); }

  function loadFB(uid) {
    rf(uid).once('value').then(snap => {
      const d = snap.val();
      if (!d) { saveFB(uid); return; }
      s(KEYS.points, d.points || 0); s(KEYS.streak, d.streak || 0);
      s(KEYS.lastVisit, d.lastVisit || null); s(KEYS.totalVisits, d.totalVisits || 0);
      s(KEYS.bookmarks, d.bookmarks || []); s(KEYS.likes, d.likes || []);
      s(KEYS.comments, d.comments || {});
    }).catch(e => console.warn('[Auth] FB load fail:', e.message));
  }

  function saveFB(uid) {
    if (!uid) return;
    rf(uid).update({
      points: parseInt(localStorage.getItem(KEYS.points)) || 0,
      streak: parseInt(localStorage.getItem(KEYS.streak)) || 0,
      lastVisit: localStorage.getItem(KEYS.lastVisit) || null,
      totalVisits: parseInt(localStorage.getItem(KEYS.totalVisits)) || 0,
      bookmarks: g(KEYS.bookmarks, []), likes: g(KEYS.likes, []),
      comments: g(KEYS.comments, {}),
      updatedAt: firebase.database.ServerValue.TIMESTAMP
    }).catch(e => console.warn('[Auth] FB save fail:', e.message));
  }

  function emit(user) {
    window.dispatchEvent(new CustomEvent('gp-auth-change', { detail: { user } }));
  }

  function getCurrentUser() { return g(KEYS.currentUser, null); }

  async function register(name, email, pass) {
    checkRate();
    email = email.toLowerCase().trim(); name = name.trim();
    if (!name || name.length < 2 || name.length > 50) throw new Error('Name must be 2-50 chars.');
    if (!EMAIL_REGEX.test(email)) throw new Error('Invalid email.');
    if (DISPOSABLE.includes(email.split('@')[1])) throw new Error('Disposable emails not allowed.');
    if (pass.length < 6 || pass.length > 128) throw new Error('Password must be 6-128 chars.');

    try {
      const cred = await firebase.auth().createUserWithEmailAndPassword(email, pass);
      await cred.user.updateProfile({ displayName: name });
      await rf(cred.user.uid).set({
        displayName: name, email, createdAt: new Date().toISOString(),
        points: 0, streak: 0, lastVisit: null, totalVisits: 0,
        bookmarks: [], likes: [], comments: {}
      });
      const u = { name, email, uid: cred.user.uid };
      s(KEYS.currentUser, u); s(KEYS.points, 0); s(KEYS.streak, 0);
      s(KEYS.bookmarks, []); s(KEYS.likes, []); emit(u); return u;
    } catch (e) {
      let m = e.message;
      if (e.code === 'auth/email-already-in-use') m = 'Email already registered. Sign in instead.';
      else if (e.code === 'auth/weak-password') m = 'Password too weak (min 6 chars).';
      else if (e.code === 'auth/invalid-email') m = 'Invalid email.';
      throw new Error(m);
    }
  }

  async function login(email, pass) {
    checkRate();
    email = email.toLowerCase().trim();
    try {
      const cred = await firebase.auth().signInWithEmailAndPassword(email, pass);
      const fbUser = cred.user;
      const name = fbUser.displayName || email.split('@')[0];
      loadFB(fbUser.uid);
      const u = { name, email: fbUser.email, uid: fbUser.uid };
      s(KEYS.currentUser, u); emit(u); return u;
    } catch (e) {
      let m = e.message;
      if (['auth/user-not-found','auth/wrong-password','auth/invalid-credential'].includes(e.code)) m = 'Invalid email or password.';
      else if (e.code === 'auth/invalid-email') m = 'Invalid email.';
      else if (e.code === 'auth/too-many-requests') m = 'Too many attempts. Try later.';
      throw new Error(m);
    }
  }

  async function logout() {
    const u = getCurrentUser();
    if (u && u.uid) saveFB(u.uid);
    Object.values(KEYS).forEach(k => { try { localStorage.removeItem(k); } catch {} });
    s(KEYS.points, 0); s(KEYS.streak, 0); s(KEYS.bookmarks, []); s(KEYS.likes, []);
    try { await firebase.auth().signOut(); } catch {}
    emit(null);
  }

  function syncUserData() {
    const u = getCurrentUser();
    if (u && u.uid) saveFB(u.uid);
  }

  function getCSRFToken() {
    try {
      let t = sessionStorage.getItem('gp_csrf');
      if (!t) { const a = new Uint8Array(16); crypto.getRandomValues(a); t = Array.from(a).map(b => b.toString(16).padStart(2,'0')).join(''); sessionStorage.setItem('gp_csrf', t); }
      return t;
    } catch { return 'fallback-token'; }
  }

  function validateCSRFToken(token) { return token && token === getCSRFToken(); }

  const api = { getCurrentUser, register, login, logout, syncUserData, getCSRFToken, validateCSRFToken };
  if (typeof window !== 'undefined') window.GPAuth = api;
  return api;
})();
</｜｜DSML｜｜parameter>
</｜｜DSML｜｜invoke>
</｜｜DSML｜｜tool_calls>
