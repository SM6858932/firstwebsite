/**
 * Engagement System for GlobalPulse
 * Handles gamification points, bookmarks, push notifications,
 * comments, daily streaks, and social sharing.
 */

const Engagement = (() => {
  // --- Storage Keys ---
  const KEYS = {
    points: 'gp_points',
    streak: 'gp_streak',
    lastVisit: 'gp_last_visit',
    bookmarks: 'gp_bookmarks',
    likes: 'gp_likes',
    comments: 'gp_comments',
    pushEnabled: 'gp_push_enabled',
    totalVisits: 'gp_total_visits',
    actions: 'gp_actions_log',
    theme: 'gp_theme',
  };

  // --- Points Configuration ---
  const POINTS = {
    daily_visit: 10,
    read_article: 5,
    like_article: 2,
    comment: 15,
    share: 20,
    bookmark: 3,
    streak_bonus: 5, // per day in streak
    first_visit: 50,
  };

  // --- Helper: Safe localStorage ---
  function getStorage(key, defaultValue = null) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  function setStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota exceeded
    }
  }

  // --- Points System ---
  function getPoints() {
    return getStorage(KEYS.points, 0);
  }

  function addPoints(amount, reason = '') {
    const current = getPoints();
    const newTotal = current + amount;
    setStorage(KEYS.points, newTotal);
    logAction('points_earned', { amount, reason, total: newTotal });
    return newTotal;
  }

  // --- Daily Streak ---
  function checkAndUpdateStreak() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const lastVisit = getStorage(KEYS.lastVisit, null);
    let streak = getStorage(KEYS.streak, 0);
    let totalVisits = getStorage(KEYS.totalVisits, 0);

    if (lastVisit === today) {
      // Already visited today
      return { streak, isNewDay: false, totalVisits };
    }

    totalVisits++;
    setStorage(KEYS.totalVisits, totalVisits);

    if (lastVisit) {
      const lastDate = new Date(lastVisit);
      const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        // Consecutive day
        streak++;
      } else if (diffDays > 1) {
        // Streak broken
        streak = 1;
      }
    } else {
      // First ever visit
      streak = 1;
      addPoints(POINTS.first_visit, 'First visit bonus!');
    }

    setStorage(KEYS.streak, streak);
    setStorage(KEYS.lastVisit, today);

    // Daily visit points + streak bonus
    addPoints(POINTS.daily_visit + (streak * POINTS.streak_bonus), `Day ${streak} streak bonus`);

    return { streak, isNewDay: true, totalVisits };
  }

  // --- Bookmarks ---
  function getBookmarks() {
    return getStorage(KEYS.bookmarks, []);
  }

  function toggleBookmark(articleId, articleData) {
    const bookmarks = getBookmarks();
    const index = bookmarks.findIndex(b => b.id === articleId);
    let isBookmarked;

    if (index >= 0) {
      bookmarks.splice(index, 1);
      isBookmarked = false;
    } else {
      bookmarks.unshift({
        id: articleId,
        title: articleData.title,
        link: articleData.link,
        category: articleData.category,
        savedAt: new Date().toISOString(),
      });
      addPoints(POINTS.bookmark, 'Bookmarked article');
      isBookmarked = true;
    }

    setStorage(KEYS.bookmarks, bookmarks);
    return isBookmarked;
  }

  function isBookmarked(articleId) {
    return getBookmarks().some(b => b.id === articleId);
  }

  // --- Likes ---
  function getLikes() {
    return getStorage(KEYS.likes, []);
  }

  function toggleLike(articleId) {
    const likes = getLikes();
    const index = likes.indexOf(articleId);
    let isLiked;

    if (index >= 0) {
      likes.splice(index, 1);
      isLiked = false;
    } else {
      likes.push(articleId);
      addPoints(POINTS.like_article, 'Liked article');
      isLiked = true;
    }

    setStorage(KEYS.likes, likes);
    return isLiked;
  }

  function isLiked(articleId) {
    return getLikes().includes(articleId);
  }

  // --- Comments ---
  function getComments(articleId) {
    const all = getStorage(KEYS.comments, {});
    return all[articleId] || [];
  }

  function addComment(articleId, text) {
    const all = getStorage(KEYS.comments, {});
    if (!all[articleId]) all[articleId] = [];
    const comment = {
      id: Date.now().toString(36),
      text: text.trim(),
      timestamp: new Date().toISOString(),
      author: 'You',
    };
    all[articleId].unshift(comment);
    setStorage(KEYS.comments, all);
    addPoints(POINTS.comment, 'Posted a comment');
    return comment;
  }

  // --- Push Notifications ---
  function isPushSupported() {
    return 'Notification' in window;
  }

  function isPushEnabled() {
    return getStorage(KEYS.pushEnabled, false);
  }

  async function requestPushPermission() {
    if (!isPushSupported()) return false;

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setStorage(KEYS.pushEnabled, true);
      // Send welcome notification
      new Notification('🌍 GlobalPulse', {
        body: 'You\'re all set! We\'ll notify you about breaking news.',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌍</text></svg>',
      });
      addPoints(POINTS.share, 'Enabled push notifications');
      return true;
    }
    return false;
  }

  function sendNotification(title, body) {
    if (!isPushEnabled() || Notification.permission !== 'granted') return;
    new Notification(title, {
      body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌍</text></svg>',
    });
  }

  // --- Social Sharing ---
  async function shareArticle(article) {
    addPoints(POINTS.share, 'Shared article');

    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.summary,
          url: article.link,
        });
        return { success: true, method: 'native' };
      } catch {
        // User cancelled or API failed
      }
    }

    // Fallback: show share modal
    return { success: false, method: 'modal' };
  }

  function getShareUrl(platform, article) {
    const text = encodeURIComponent(article.title);
    const url = encodeURIComponent(article.link);
    switch (platform) {
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      case 'whatsapp':
        return `https://wa.me/?text=${text}%20${url}`;
      case 'telegram':
        return `https://t.me/share/url?url=${url}&text=${text}`;
      case 'linkedin':
        return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
      default:
        return '#';
    }
  }

  // --- Theme ---
  function getTheme() {
    return getStorage(KEYS.theme, 'dark');
  }

  function setTheme(theme) {
    setStorage(KEYS.theme, theme);
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
  }

  function toggleTheme() {
    const current = getTheme();
    return setTheme(current === 'dark' ? 'light' : 'dark');
  }

  // --- Action Log ---
  function logAction(type, data = {}) {
    const log = getStorage(KEYS.actions, []);
    log.unshift({
      type,
      data,
      timestamp: new Date().toISOString(),
    });
    // Keep last 100 actions
    setStorage(KEYS.actions, log.slice(0, 100));
  }

  function getActionLog() {
    return getStorage(KEYS.actions, []);
  }

  // --- Article read tracking ---
  function trackRead(articleId) {
    addPoints(POINTS.read_article, 'Read article');
    logAction('read', { articleId });
  }

  // --- Public API ---
  return {
    POINTS,
    getPoints,
    addPoints,
    checkAndUpdateStreak,
    getBookmarks,
    toggleBookmark,
    isBookmarked,
    getLikes,
    toggleLike,
    isLiked,
    getComments,
    addComment,
    isPushSupported,
    isPushEnabled,
    requestPushPermission,
    sendNotification,
    shareArticle,
    getShareUrl,
    getTheme,
    setTheme,
    toggleTheme,
    logAction,
    getActionLog,
    trackRead,
  };
})();
