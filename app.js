/**
 * GlobalPulse — Main Application
 * Orchestrates RSS feeds, engagement, and UI rendering.
 *
 * SECURITY NOTES:
 * - All inline onclick handlers replaced with addEventListener for XSS prevention.
 * - User input is validated with maxlength limits and sanitized before rendering.
 * - Article references use unique IDs, not array indices where possible.
 * - setInterval is cleaned up on page unload to prevent memory leaks.
 */

(function () {
  'use strict';

  // --- Named Constants (Fix #18: no more magic numbers) ---
  const INITIAL_VISIBLE_COUNT = 9;
  const LOAD_MORE_INCREMENT = 6;
  const AUTO_REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
  const BACK_TO_TOP_THRESHOLD = 500;
  const SEARCH_DEBOUNCE_MS = 300;
  const ANIMATION_DURATION_MS = 200;
  const TOAST_DEFAULT_DURATION_MS = 4000;
  const POST_TITLE_MAX_LENGTH = 150;
  const POST_SUMMARY_MAX_LENGTH = 300;

  // --- State ---
  const state = {
    articles: [],
    activeCategory: 'all',
    searchQuery: '',
    isLoading: true,
    visibleCount: INITIAL_VISIBLE_COUNT,
  };

  // --- Interval ID for cleanup (Fix #20) ---
  let autoRefreshIntervalId = null;

  // --- Notifications State ---
  const notifications = [
    { id: 1, icon: '🔥', title: 'Daily Streak!', message: 'You have started a daily visit streak. Keep it up!', time: 'Just now' },
    { id: 2, icon: '🌍', title: 'Welcome to GlobalPulse', message: 'Read news, save bookmarks, and earn engagement points!', time: '1h ago' }
  ];

  // --- Sample Reels Data ---
  const REELS_DATA = [
    {
      title: 'Breathtaking Waterfall in Iceland',
      views: '12.4K',
      image: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400&h=600&fit=crop',
      duration: '0:32',
    },
    {
      title: 'Street Food Tour: Tokyo Ramen District',
      views: '8,931',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=600&fit=crop',
      duration: '1:15',
    },
    {
      title: 'Every Day is a New Chance to Change Your Life',
      views: '7,321',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop',
      duration: '0:45',
    },
    {
      title: 'Golden Retriever Puppy\'s First Snow',
      views: '9,122',
      image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=600&fit=crop',
      duration: '0:28',
    },
    {
      title: 'Northern Lights Timelapse in Norway',
      views: '15.2K',
      image: 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=400&h=600&fit=crop',
      duration: '0:55',
    },
    {
      title: 'Minimalist Home Office Setup Tour',
      views: '5,678',
      image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=600&fit=crop',
      duration: '1:02',
    },
  ];

  // --- Sample Products Data ---
  const PRODUCTS_DATA = [
    {
      name: 'Samsung Galaxy S24 Ultra 5G',
      price: '$1,039',
      originalPrice: '$1,299',
      discount: '-20%',
      image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=400&fit=crop',
    },
    {
      name: 'Noise ColorFit Pro 5 Smartwatch',
      price: '$34.99',
      originalPrice: '$49.99',
      discount: '-30%',
      image: 'https://images.unsplash.com/photo-1546868871-af0de0ae72be?w=400&h=400&fit=crop',
    },
    {
      name: 'Sony WH-1000XM5 Wireless Headphones',
      price: '$224.90',
      originalPrice: '$299.90',
      discount: '-25%',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    },
    {
      name: 'Nike Air Max 270 Men\'s Shoes',
      price: '$59.99',
      originalPrice: '$99.99',
      discount: '-40%',
      image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
    },
    {
      name: 'Fogg Essence Eau De Parfum',
      price: '$8.49',
      originalPrice: '$12.99',
      discount: '-15%',
      image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop',
    },
  ];

  // --- DOM References ---
  const DOM = {};

  function cacheDom() {
    DOM.loadingOverlay = document.getElementById('loading-overlay');
    DOM.newsGrid = document.getElementById('news-grid');
    DOM.reelsContainer = document.getElementById('reels-container');
    DOM.productsGrid = document.getElementById('products-grid');
    DOM.tickerTrack = document.getElementById('ticker-track');
    DOM.searchInput = document.getElementById('search-input');
    DOM.categoryFilters = document.getElementById('category-filters');
    DOM.themeToggle = document.getElementById('theme-toggle');
    DOM.notificationBtn = document.getElementById('notification-btn');
    DOM.notificationBadge = document.getElementById('notification-badge');
    DOM.notificationDropdown = document.getElementById('notification-dropdown');
    DOM.clearNotificationsBtn = document.getElementById('clear-notifications-btn');
    DOM.notificationList = document.getElementById('notification-list');
    DOM.createPostBtn = document.getElementById('create-post-btn');
    DOM.createPostModal = document.getElementById('create-post-modal');
    DOM.createPostForm = document.getElementById('create-post-form');
    DOM.userAvatar = document.getElementById('user-avatar');
    DOM.profileDropdown = document.getElementById('profile-dropdown');
    DOM.dropdownProfileName = document.getElementById('dropdown-profile-name');
    DOM.dropdownProfileEmail = document.getElementById('dropdown-profile-email');
    DOM.dropdownPointsVal = document.getElementById('dropdown-points-val');
    DOM.dropdownLoginBtn = document.getElementById('dropdown-login-btn');
    DOM.dropdownLogoutBtn = document.getElementById('dropdown-logout-btn');
    DOM.authModal = document.getElementById('auth-modal');
    DOM.authModalTitle = document.getElementById('auth-modal-title');
    DOM.tabLogin = document.getElementById('tab-login');
    DOM.tabSignup = document.getElementById('tab-signup');
    DOM.loginForm = document.getElementById('login-form');
    DOM.signupForm = document.getElementById('signup-form');
    DOM.pushCtaBtn = document.getElementById('push-cta-btn');
    DOM.loadMoreBtn = document.getElementById('load-more-btn');
    DOM.pointsDisplay = document.getElementById('points-display');
    DOM.streakDisplay = document.getElementById('streak-display');
    DOM.toastContainer = document.getElementById('toast-container');
    DOM.shareModal = document.getElementById('share-modal');
    DOM.backToTop = document.getElementById('back-to-top');
    DOM.trendingList = document.getElementById('trending-list');
  }

  // --- Initialization ---
  async function init() {
    cacheDom();
    injectCSRFTokens();
    setupTheme();
    setupEventListeners();
    
    // Sync initial auth state
    const currentUser = window.GPAuth ? GPAuth.getCurrentUser() : null;
    updateAuthUI(currentUser);
    updateEngagementUI();
    renderNotifications();

    // Check daily streak
    const streakInfo = Engagement.checkAndUpdateStreak();
    if (streakInfo.isNewDay) {
      setTimeout(() => {
        showToast('🔥', 'Welcome Back!', `Day ${streakInfo.streak} streak! +${Engagement.POINTS.daily_visit + streakInfo.streak * Engagement.POINTS.streak_bonus} points`);
        addNotification('🔥', 'Daily Streak!', `Welcome back! Day ${streakInfo.streak} streak active. +${Engagement.POINTS.daily_visit + streakInfo.streak * Engagement.POINTS.streak_bonus} pts`);
      }, 1500);
    }

    // Fetch and render content
    await loadArticles();
    renderReels();
    renderProducts();

    // Hide loading overlay
    hideLoading();

    // Setup auto-refresh (Fix #20: store interval ID for cleanup)
    autoRefreshIntervalId = setInterval(async () => {
      console.log('[App] Auto-refreshing feeds...');
      await loadArticles(true);
    }, AUTO_REFRESH_INTERVAL_MS);

    // Fix #20: Clean up interval on page unload
    window.addEventListener('beforeunload', () => {
      if (autoRefreshIntervalId) {
        clearInterval(autoRefreshIntervalId);
        autoRefreshIntervalId = null;
      }
    });
  }

  // --- Theme ---
  function setupTheme() {
    const theme = Engagement.getTheme();
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
  }

  function updateThemeIcon(theme) {
    if (DOM.themeToggle) {
      DOM.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
      DOM.themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
    }
  }

  // --- Notifications System ---
  function addNotification(icon, title, message) {
    notifications.unshift({
      id: Date.now(),
      icon,
      title,
      message,
      time: 'Just now'
    });
    renderNotifications();
  }

  function renderNotifications() {
    if (!DOM.notificationList) return;
    
    if (notifications.length === 0) {
      DOM.notificationList.innerHTML = '<div class="dropdown-empty-state">No new notifications</div>';
      if (DOM.notificationBadge) DOM.notificationBadge.style.display = 'none';
      return;
    }

    if (DOM.notificationBadge) {
      DOM.notificationBadge.style.display = 'block';
      DOM.notificationBadge.textContent = notifications.length;
    }

    DOM.notificationList.innerHTML = notifications.map(n => `
      <div class="notification-item" data-id="${n.id}">
        <div class="notification-icon">${n.icon}</div>
        <div class="notification-content">
          <div class="notification-title">${escapeHtml(n.title)}</div>
          <div class="notification-message">${escapeHtml(n.message)}</div>
          <div class="notification-time">${escapeHtml(n.time)}</div>
        </div>
      </div>
    `).join('');
  }

  // --- Auth UI Sync ---
  function updateAuthUI(user) {
    if (user) {
      if (DOM.dropdownProfileName) DOM.dropdownProfileName.textContent = user.name;
      if (DOM.dropdownProfileEmail) DOM.dropdownProfileEmail.textContent = user.email;
      if (DOM.dropdownLoginBtn) DOM.dropdownLoginBtn.style.display = 'none';
      if (DOM.dropdownLogoutBtn) DOM.dropdownLogoutBtn.style.display = 'block';
      
      // Header profile avatar
      if (DOM.userAvatar) {
        DOM.userAvatar.innerHTML = `
          <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--gradient-accent); color: white; font-weight: 700; font-size: var(--text-base);">
            ${escapeHtml(user.name.charAt(0).toUpperCase())}
          </div>
        `;
      }
    } else {
      if (DOM.dropdownProfileName) DOM.dropdownProfileName.textContent = 'Guest User';
      if (DOM.dropdownProfileEmail) DOM.dropdownProfileEmail.textContent = 'Sign in to save points';
      if (DOM.dropdownLoginBtn) DOM.dropdownLoginBtn.style.display = 'block';
      if (DOM.dropdownLogoutBtn) DOM.dropdownLogoutBtn.style.display = 'none';
      
      if (DOM.userAvatar) {
        DOM.userAvatar.innerHTML = `
          <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop&crop=face"
            alt="User avatar">
        `;
      }
    }
  }

  // --- Event Listeners ---
  function setupEventListeners() {
    // Theme toggle
    if (DOM.themeToggle) {
      DOM.themeToggle.addEventListener('click', () => {
        const newTheme = Engagement.toggleTheme();
        updateThemeIcon(newTheme);
        showToast('🎨', 'Theme Changed', `Switched to ${newTheme} mode`);
      });
    }

    // Search
    if (DOM.searchInput) {
      let searchTimeout;
      DOM.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          state.searchQuery = e.target.value.trim();
          renderArticles();
        }, SEARCH_DEBOUNCE_MS);
      });
    }

    // Category filters
    if (DOM.categoryFilters) {
      DOM.categoryFilters.addEventListener('click', (e) => {
        const pill = e.target.closest('.category-pill');
        if (!pill) return;

        DOM.categoryFilters.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.activeCategory = pill.dataset.category;
        state.visibleCount = INITIAL_VISIBLE_COUNT;
        renderArticles();
      });
    }

    // Push notification subscription
    if (DOM.pushCtaBtn) {
      DOM.pushCtaBtn.addEventListener('click', async () => {
        const enabled = await Engagement.requestPushPermission();
        if (enabled) {
          showToast('🔔', 'Notifications Enabled!', 'You\'ll get breaking news alerts. +20 points!');
          DOM.pushCtaBtn.textContent = '✓ Subscribed';
          DOM.pushCtaBtn.disabled = true;
          updateEngagementUI();
          addNotification('🔔', 'Notifications Enabled', 'You subscribed to push notifications (+20 pts).');
        }
      });
    }

    // Load more articles
    if (DOM.loadMoreBtn) {
      DOM.loadMoreBtn.addEventListener('click', () => {
        state.visibleCount += LOAD_MORE_INCREMENT;
        renderArticles();
      });
    }

    // Back to top
    if (DOM.backToTop) {
      DOM.backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Scroll progress listener for Back-to-Top
    let scrollTicking = false;
    window.addEventListener('scroll', () => {
      if (!scrollTicking) {
        requestAnimationFrame(() => {
          if (DOM.backToTop) {
            DOM.backToTop.classList.toggle('visible', window.scrollY > BACK_TO_TOP_THRESHOLD);
          }
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    });

    // --- Dropdown Panel Toggling ---
    
    // Toggle Notifications
    if (DOM.notificationBtn) {
      DOM.notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (DOM.profileDropdown) DOM.profileDropdown.classList.remove('active');
        if (DOM.notificationDropdown) DOM.notificationDropdown.classList.toggle('active');
      });
    }

    // Clear Notifications
    if (DOM.clearNotificationsBtn) {
      DOM.clearNotificationsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifications.length = 0;
        renderNotifications();
        showToast('🗑️', 'Notifications Cleared', 'All notifications cleared.');
      });
    }

    // Toggle Profile Dropdown
    if (DOM.userAvatar) {
      DOM.userAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        if (DOM.notificationDropdown) DOM.notificationDropdown.classList.remove('active');
        if (DOM.profileDropdown) DOM.profileDropdown.classList.toggle('active');
      });
    }

    // Close Dropdowns on Click Outside
    document.addEventListener('click', (e) => {
      if (DOM.notificationDropdown && !DOM.notificationDropdown.contains(e.target) && e.target !== DOM.notificationBtn) {
        DOM.notificationDropdown.classList.remove('active');
      }
      if (DOM.profileDropdown && DOM.userAvatar && !DOM.profileDropdown.contains(e.target) && !DOM.userAvatar.contains(e.target)) {
        DOM.profileDropdown.classList.remove('active');
      }
    });

    // --- Modal Toggles ---

    // Open/Close Create Post Modal
    if (DOM.createPostBtn) {
      DOM.createPostBtn.addEventListener('click', () => {
        if (DOM.createPostModal) DOM.createPostModal.classList.add('active');
      });
    }

    if (DOM.createPostModal) {
      DOM.createPostModal.addEventListener('click', (e) => {
        if (e.target === DOM.createPostModal || e.target.closest('.modal-close')) {
          DOM.createPostModal.classList.remove('active');
        }
      });
    }

    // Submit Create Post Form (Fix #4: input validation and sanitization)
    if (DOM.createPostForm) {
      DOM.createPostForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // CSRF Token Validation (Fix #6)
        const csrfTokenEl = DOM.createPostForm.querySelector('input[name="csrf_token"]');
        if (!csrfTokenEl || !window.GPAuth || !GPAuth.validateCSRFToken(csrfTokenEl.value)) {
          showToast('⚠️', 'Security Error', 'CSRF token is missing or invalid.');
          return;
        }
        
        const titleEl = document.getElementById('post-title');
        const summaryEl = document.getElementById('post-summary');
        const categoryEl = document.getElementById('post-category');
        const imageEl = document.getElementById('post-image');
        const linkEl = document.getElementById('post-link');

        if (!titleEl || !summaryEl || !categoryEl) return;

        const title = titleEl.value.trim();
        const summary = summaryEl.value.trim();
        const category = categoryEl.value;
        const image = (imageEl ? imageEl.value.trim() : '') || 'https://images.unsplash.com/photo-1504711434969-e33886168d13?w=600&h=400&fit=crop';
        const link = (linkEl ? linkEl.value.trim() : '') || '#';

        // Fix #4: Validate input length
        if (title.length === 0 || title.length > POST_TITLE_MAX_LENGTH) {
          showToast('⚠️', 'Invalid Title', `Title must be 1-${POST_TITLE_MAX_LENGTH} characters.`);
          return;
        }
        if (summary.length === 0 || summary.length > POST_SUMMARY_MAX_LENGTH) {
          showToast('⚠️', 'Invalid Summary', `Summary must be 1-${POST_SUMMARY_MAX_LENGTH} characters.`);
          return;
        }

        // Validate URL format if provided
        if (link !== '#' && !isValidUrl(link)) {
          showToast('⚠️', 'Invalid Link', 'Please enter a valid URL.');
          return;
        }
        if (image !== 'https://images.unsplash.com/photo-1504711434969-e33886168d13?w=600&h=400&fit=crop' && !isValidUrl(image)) {
          showToast('⚠️', 'Invalid Image URL', 'Please enter a valid image URL.');
          return;
        }

        const newArticle = {
          title,
          summary,
          category,
          source: 'User Post',
          sourceIcon: '✍️',
          link,
          image,
          pubDate: new Date().toISOString(),
          likes: 0,
          comments: 0
        };

        // Add to state and render
        state.articles.unshift(newArticle);
        renderArticles();
        renderBreakingTicker();

        // Award points
        Engagement.addPoints(15, 'Created a news post');
        updateEngagementUI();
        
        // Success feedback
        showToast('🚀', 'Post Created!', 'Your article was published successfully! +15 points');
        addNotification('✍️', 'Post Created', `You published "${escapeHtml(title.substring(0, 30))}..." (+15 pts)`);

        // Reset and close
        DOM.createPostForm.reset();
        DOM.createPostModal.classList.remove('active');
      });
    }

    // Open Auth Modal from Profile Dropdown or Widgets
    if (DOM.dropdownLoginBtn) {
      DOM.dropdownLoginBtn.addEventListener('click', () => {
        if (DOM.profileDropdown) DOM.profileDropdown.classList.remove('active');
        if (DOM.authModal) DOM.authModal.classList.add('active');
      });
    }

    if (DOM.authModal) {
      DOM.authModal.addEventListener('click', (e) => {
        if (e.target === DOM.authModal || e.target.closest('.modal-close')) {
          DOM.authModal.classList.remove('active');
        }
      });
    }

    // Auth Tab Switching
    if (DOM.tabLogin && DOM.tabSignup) {
      DOM.tabLogin.addEventListener('click', () => {
        DOM.tabSignup.classList.remove('active');
        DOM.tabLogin.classList.add('active');
        if (DOM.authModalTitle) DOM.authModalTitle.textContent = 'Sign In';
        if (DOM.signupForm) DOM.signupForm.style.display = 'none';
        if (DOM.loginForm) DOM.loginForm.style.display = 'flex';
      });

      DOM.tabSignup.addEventListener('click', () => {
        DOM.tabLogin.classList.remove('active');
        DOM.tabSignup.classList.add('active');
        if (DOM.authModalTitle) DOM.authModalTitle.textContent = 'Register';
        if (DOM.loginForm) DOM.loginForm.style.display = 'none';
        if (DOM.signupForm) DOM.signupForm.style.display = 'flex';
      });
    }

    // Submit Sign In / Login Form
    if (DOM.loginForm) {
      DOM.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // CSRF Token Validation (Fix #6)
        const csrfTokenEl = DOM.loginForm.querySelector('input[name="csrf_token"]');
        if (!csrfTokenEl || !window.GPAuth || !GPAuth.validateCSRFToken(csrfTokenEl.value)) {
          showToast('⚠️', 'Security Error', 'CSRF token is missing or invalid.');
          return;
        }
        const emailEl = document.getElementById('login-email');
        const passwordEl = document.getElementById('login-password');
        if (!emailEl || !passwordEl) return;

        const email = emailEl.value;
        const password = passwordEl.value;

        try {
          if (window.GPAuth) {
            await GPAuth.login(email, password);
            DOM.loginForm.reset();
            if (DOM.authModal) DOM.authModal.classList.remove('active');
          }
        } catch (error) {
          showToast('⚠️', 'Login Failed', error.message);
        }
      });
    }

    // Submit Sign Up / Registration Form
    if (DOM.signupForm) {
      DOM.signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // CSRF Token Validation (Fix #6)
        const csrfTokenEl = DOM.signupForm.querySelector('input[name="csrf_token"]');
        if (!csrfTokenEl || !window.GPAuth || !GPAuth.validateCSRFToken(csrfTokenEl.value)) {
          showToast('⚠️', 'Security Error', 'CSRF token is missing or invalid.');
          return;
        }
        const nameEl = document.getElementById('signup-name');
        const emailEl = document.getElementById('signup-email');
        const passwordEl = document.getElementById('signup-password');
        if (!nameEl || !emailEl || !passwordEl) return;

        const name = nameEl.value;
        const email = emailEl.value;
        const password = passwordEl.value;

        try {
          if (window.GPAuth) {
            await GPAuth.register(name, email, password);
            DOM.signupForm.reset();
            if (DOM.authModal) DOM.authModal.classList.remove('active');
          }
        } catch (error) {
          showToast('⚠️', 'Registration Failed', error.message);
        }
      });
    }

    // Logout
    if (DOM.dropdownLogoutBtn) {
      DOM.dropdownLogoutBtn.addEventListener('click', () => {
        if (window.GPAuth) {
          GPAuth.logout();
          if (DOM.profileDropdown) DOM.profileDropdown.classList.remove('active');
        }
      });
    }

    // --- Global Window Listeners ---

    // Auth change listener
    window.addEventListener('gp-auth-change', (e) => {
      const user = e.detail ? e.detail.user : null;
      updateAuthUI(user);
      updateEngagementUI();
      if (user) {
        showToast('🔑', 'Welcome Back!', `Logged in as ${escapeHtml(user.name)}`);
        addNotification('🔑', 'Session Started', `Welcome back, ${escapeHtml(user.name)}!`);
      } else {
        showToast('🚪', 'Signed Out', 'You have successfully signed out.');
        addNotification('🚪', 'Session Ended', 'Logged out. Progress is saved locally.');
      }
    });

    // Close Share Modal
    if (DOM.shareModal) {
      DOM.shareModal.addEventListener('click', (e) => {
        if (e.target === DOM.shareModal || e.target.closest('.modal-close')) {
          DOM.shareModal.classList.remove('active');
        }
      });
    }

    // Escape Key to Close Everything
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (DOM.shareModal) DOM.shareModal.classList.remove('active');
        if (DOM.createPostModal) DOM.createPostModal.classList.remove('active');
        if (DOM.authModal) DOM.authModal.classList.remove('active');
        if (DOM.notificationDropdown) DOM.notificationDropdown.classList.remove('active');
        if (DOM.profileDropdown) DOM.profileDropdown.classList.remove('active');
      }
    });
  }

  // --- Load Articles ---
  async function loadArticles(forceRefresh = false) {
    state.isLoading = true;
    showSkeletons();

    try {
      state.articles = await RSSEngine.fetchAllFeeds({ forceRefresh });
      renderArticles();
      renderBreakingTicker();
      renderTrending();
    } catch (error) {
      console.error('[App] Failed to load articles:', error);
      state.articles = RSSEngine.FALLBACK_ARTICLES;
      renderArticles();
      renderBreakingTicker();
      renderTrending();
    }

    state.isLoading = false;
  }

  // --- Render Articles ---
  function renderArticles() {
    if (!DOM.newsGrid) return;

    let articles = [...state.articles];

    // Filter by category
    if (state.activeCategory !== 'all') {
      articles = articles.filter(a => a.category === state.activeCategory);
    }

    // Filter by search
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      articles = articles.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q)
      );
    }

    if (articles.length === 0) {
      DOM.newsGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🔍</div>
          <h3 class="empty-state-title">No articles found</h3>
          <p class="empty-state-desc">Try a different search term or category.</p>
        </div>
      `;
      if (DOM.loadMoreBtn) DOM.loadMoreBtn.style.display = 'none';
      return;
    }

    const visible = articles.slice(0, state.visibleCount);
    DOM.newsGrid.innerHTML = visible.map((article, index) => {
      const articleId = generateArticleId(article);
      const liked = Engagement.isLiked(articleId);
      const bookmarked = Engagement.isBookmarked(articleId);
      const isFeatured = index === 0 && state.activeCategory === 'all' && !state.searchQuery;

      // Fix #3 & #7: Use data attributes instead of inline onclick. Article IDs used, not raw indices.
      return `
        <article class="news-card ${isFeatured ? 'featured' : ''}" data-article-id="${articleId}" data-index="${index}">
          <div class="news-card-image">
            <img src="${article.image}" alt="${escapeHtml(article.title)}" loading="lazy"
                 onerror="this.src='https://images.unsplash.com/photo-1504711434969-e33886168d13?w=600&h=400&fit=crop'">
            <span class="category-badge ${escapeHtml(article.category)}">${escapeHtml(article.category)}</span>
            <span class="source-icon" title="${escapeHtml(article.source)}">${article.sourceIcon || '📰'}</span>
          </div>
          <div class="news-card-body">
            <h3 class="news-card-title">${escapeHtml(article.title)}</h3>
            <p class="news-card-summary">${escapeHtml(article.summary)}</p>
            <div class="news-card-meta">
              <div class="news-card-stats">
                <button class="news-card-stat ${liked ? 'liked' : ''}" data-action="like" data-article-id="${articleId}" aria-label="Like">
                  <span class="stat-icon">${liked ? '❤️' : '🤍'}</span>
                  <span class="stat-count">${formatCount(article.likes + (liked ? 1 : 0))}</span>
                </button>
                <button class="news-card-stat" data-action="comment" data-article-id="${articleId}" aria-label="Comment">
                  <span class="stat-icon">💬</span>
                  <span class="stat-count">${formatCount(article.comments)}</span>
                </button>
              </div>
              <div class="news-card-actions">
                <button class="news-card-action" data-action="share" data-article-id="${articleId}" aria-label="Share">📤</button>
                <button class="news-card-action ${bookmarked ? 'bookmarked' : ''}" data-action="bookmark" data-article-id="${articleId}" aria-label="Bookmark">
                  ${bookmarked ? '🔖' : '🏷️'}
                </button>
              </div>
            </div>
            <div class="news-card-time">${RSSEngine.timeAgo(article.pubDate)} · ${escapeHtml(article.source)}</div>
          </div>
          <a href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer" class="sr-only" data-action="read" data-article-id="${articleId}">Read full article</a>
        </article>
      `;
    }).join('');

    // Show/hide load more
    if (DOM.loadMoreBtn) {
      DOM.loadMoreBtn.style.display = state.visibleCount < articles.length ? 'block' : 'none';
    }

    // Fix #3: Use event delegation instead of inline onclick
    DOM.newsGrid.addEventListener('click', handleNewsGridClick);
  }

  /**
   * Event delegation handler for the news grid (Fix #3: replaces inline onclick).
   * Uses data-action and data-article-id attributes.
   */
  function handleNewsGridClick(e) {
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      const articleId = actionBtn.dataset.articleId;

      switch (action) {
        case 'like':
          handleLike(articleId, actionBtn);
          return;
        case 'comment':
          handleComment(articleId);
          return;
        case 'share':
          handleShareById(articleId);
          return;
        case 'bookmark':
          handleBookmarkById(articleId, actionBtn);
          return;
        case 'read':
          handleRead(articleId);
          return;
      }
    }

    // Click on card (not a button/link) opens article
    const card = e.target.closest('.news-card');
    if (card && !e.target.closest('button') && !e.target.closest('a')) {
      const articleId = card.dataset.articleId;
      const article = findArticleById(articleId);
      if (article && article.link && article.link !== '#') {
        window.open(article.link, '_blank', 'noopener');
        Engagement.trackRead(articleId);
        updateEngagementUI();
      }
    }
  }

  // --- Render Breaking Ticker ---
  function renderBreakingTicker() {
    if (!DOM.tickerTrack) return;

    const breaking = state.articles.slice(0, 8);
    const items = breaking.map(a => `<span class="ticker-item">${escapeHtml(a.title)}</span>`).join('');
    // Duplicate for seamless loop
    DOM.tickerTrack.innerHTML = items + items;
  }

  // --- Render Trending Sidebar (Fix: escape article.link in onclick → use data attributes) ---
  function renderTrending() {
    if (!DOM.trendingList) return;

    const trending = [...state.articles]
      .sort((a, b) => (b.likes + b.comments * 3) - (a.likes + a.comments * 3))
      .slice(0, 5);

    DOM.trendingList.innerHTML = trending.map((article, i) => `
      <div class="trending-item" data-link="${escapeHtml(article.link)}" role="button" tabindex="0">
        <span class="trending-rank">${i + 1}</span>
        <div class="trending-content">
          <div class="trending-topic">${escapeHtml(article.title)}</div>
          <div class="trending-posts">${formatCount(article.likes + article.comments)} engagements · ${escapeHtml(article.category)}</div>
        </div>
      </div>
    `).join('');

    // Fix: Use addEventListener instead of inline onclick for trending items
    DOM.trendingList.querySelectorAll('.trending-item').forEach(item => {
      item.addEventListener('click', () => {
        const link = item.dataset.link;
        if (link && link !== '#') {
          window.open(link, '_blank', 'noopener');
        }
      });
    });
  }

  // --- Render Reels ---
  function renderReels() {
    if (!DOM.reelsContainer) return;

    DOM.reelsContainer.innerHTML = REELS_DATA.map((reel, idx) => {
      const likesCount = Math.floor(Math.random() * 200) + 45;
      const commentsCount = Math.floor(Math.random() * 50) + 12;

      return `
        <div class="reel-card" tabindex="0" role="button" aria-label="Play reel: ${escapeHtml(reel.title)}">
          <img src="${reel.image}" alt="${escapeHtml(reel.title)}" loading="lazy">
          <div class="reel-play-btn" aria-hidden="true">▶</div>
          <span class="reel-badge">🎬 ${escapeHtml(reel.duration)}</span>
          
          <div class="reel-actions">
            <button class="reel-action-btn like-btn" data-reel-action="like" aria-label="Like reel">
              <span class="icon">🤍</span>
              <span class="count">${likesCount}</span>
            </button>
            <button class="reel-action-btn comment-btn" data-reel-action="comment" aria-label="Comment on reel">
              <span class="icon">💬</span>
              <span class="count">${commentsCount}</span>
            </button>
            <button class="reel-action-btn share-btn" data-reel-action="share" aria-label="Share reel">
              <span class="icon">📤</span>
            </button>
          </div>

          <div class="reel-info">
            <div class="reel-title">${escapeHtml(reel.title)}</div>
            <div class="reel-views">▶ ${escapeHtml(reel.views)} views</div>
          </div>
        </div>
      `;
    }).join('');

    // Fix #3: Use event delegation for reel actions instead of inline onclick
    DOM.reelsContainer.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-reel-action]');
      if (!actionBtn) return;
      e.stopPropagation();

      const action = actionBtn.dataset.reelAction;
      switch (action) {
        case 'like':
          handleReelLike(actionBtn);
          break;
        case 'comment':
          handleReelComment(actionBtn);
          break;
        case 'share':
          handleReelShare(actionBtn);
          break;
      }
    });
  }

  // --- Render Products ---
  function renderProducts() {
    if (!DOM.productsGrid) return;

    DOM.productsGrid.innerHTML = PRODUCTS_DATA.map(product => `
      <div class="product-card" tabindex="0">
        <div class="product-card-image">
          <img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy">
          <span class="product-discount">${escapeHtml(product.discount)}</span>
          <button class="product-wishlist" aria-label="Add to wishlist">🤍</button>
        </div>
        <div class="product-card-body">
          <div class="product-name">${escapeHtml(product.name)}</div>
          <div class="product-pricing">
            <span class="product-price">${escapeHtml(product.price)}</span>
            <span class="product-original-price">${escapeHtml(product.originalPrice)}</span>
          </div>
        </div>
      </div>
    `).join('');

    // Wishlist toggle
    DOM.productsGrid.querySelectorAll('.product-wishlist').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = btn.textContent.trim() === '❤️';
        btn.textContent = isActive ? '🤍' : '❤️';
        btn.style.transform = 'scale(1.3)';
        setTimeout(() => { btn.style.transform = ''; }, ANIMATION_DURATION_MS);
      });
    });
  }

  // --- Show Skeletons ---
  function showSkeletons() {
    if (!DOM.newsGrid) return;
    DOM.newsGrid.innerHTML = Array(6).fill(0).map(() => `
      <div class="news-card">
        <div class="news-card-image skeleton" style="height: 200px;"></div>
        <div class="news-card-body">
          <div class="skeleton" style="height: 20px; width: 80%; margin-bottom: 8px;"></div>
          <div class="skeleton" style="height: 14px; width: 100%; margin-bottom: 6px;"></div>
          <div class="skeleton" style="height: 14px; width: 60%;"></div>
        </div>
      </div>
    `).join('');
  }

  // --- Hide Loading ---
  function hideLoading() {
    if (DOM.loadingOverlay) {
      DOM.loadingOverlay.classList.add('hidden');
      setTimeout(() => {
        DOM.loadingOverlay.style.display = 'none';
      }, 500);
    }
  }

  // --- Update Engagement UI ---
  function updateEngagementUI() {
    const isLoggedIn = window.GPAuth && !!GPAuth.getCurrentUser();
    const points = Engagement.getPoints();
    const streak = Engagement.checkAndUpdateStreak();

    if (isLoggedIn) {
      if (DOM.pointsDisplay) {
        DOM.pointsDisplay.innerHTML = `<div class="points-number" id="points-display">${formatCount(points)}</div>`;
      }
      if (DOM.streakDisplay) {
        DOM.streakDisplay.innerHTML = `🔥 ${streak.streak} day streak`;
        DOM.streakDisplay.style.color = '';
      }
      if (DOM.dropdownPointsVal) {
        DOM.dropdownPointsVal.textContent = formatCount(points);
      }
    } else {
      if (DOM.pointsDisplay) {
        DOM.pointsDisplay.innerHTML = `<span style="font-size: var(--text-lg); font-weight: 700; color: var(--text-muted);">🔒 Locked</span><div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: 4px;">Sign in to see points</div>`;
      }
      if (DOM.streakDisplay) {
        DOM.streakDisplay.innerHTML = `<a href="#" class="streak-signin-link" style="color: var(--accent-primary); text-decoration: underline; cursor: pointer;">Sign in to start streak</a>`;
        DOM.streakDisplay.style.color = 'var(--accent-primary)';
        // Use addEventListener for the streak sign-in link
        const streakLink = DOM.streakDisplay.querySelector('.streak-signin-link');
        if (streakLink) {
          streakLink.addEventListener('click', (e) => {
            e.preventDefault();
            openAuthModal();
          });
        }
      }
      if (DOM.dropdownPointsVal) {
        DOM.dropdownPointsVal.textContent = '🔒';
      }
    }

    if (DOM.pushCtaBtn && Engagement.isPushEnabled()) {
      DOM.pushCtaBtn.textContent = '✓ Subscribed';
      DOM.pushCtaBtn.disabled = true;
      DOM.pushCtaBtn.style.opacity = '0.6';
    }
  }

  // --- Toast Notifications (Fix: complete the broken function) ---
  function showToast(icon, title, message, duration = TOAST_DEFAULT_DURATION_MS) {
    if (!DOM.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${escapeHtml(title)}</div>
        <div class="toast-message">${escapeHtml(message)}</div>
      </div>
      <button class="toast-close" aria-label="Dismiss">&times;</button>
    `;

    DOM.toastContainer.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Close button
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => dismissToast(toast));
    }

    // Auto dismiss
    setTimeout(() => dismissToast(toast), duration);
  }

  function dismissToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }

  // --- Interaction Handlers ---
  function handleLike(articleId, btn) {
    if (!articleId) return;
    const isLiked = Engagement.toggleLike(articleId);
    if (btn) {
      const icon = btn.querySelector('.stat-icon');
      const count = btn.querySelector('.stat-count');
      if (icon) {
        icon.textContent = isLiked ? '❤️' : '🤍';
        icon.style.transform = 'scale(1.4)';
        setTimeout(() => { icon.style.transform = ''; }, ANIMATION_DURATION_MS);
      }
      btn.classList.toggle('liked', isLiked);
    }
    if (isLiked) {
      showToast('❤️', 'Liked!', '+2 points');
    }
    updateEngagementUI();
  }

  /**
   * Fix #7: Find article by unique ID instead of array index.
   */
  function findArticleById(articleId) {
    if (!articleId) return null;
    return state.articles.find(a => generateArticleId(a) === articleId) || null;
  }

  function handleBookmarkById(articleId, btn) {
    const article = findArticleById(articleId);
    if (!article) return;

    const isBookmarked = Engagement.toggleBookmark(articleId, article);
    if (btn) {
      btn.textContent = isBookmarked ? '🔖' : '🏷️';
      btn.classList.toggle('bookmarked', isBookmarked);
      btn.style.transform = 'scale(1.3)';
      setTimeout(() => { btn.style.transform = ''; }, ANIMATION_DURATION_MS);
    }
    showToast(
      isBookmarked ? '🔖' : '🏷️',
      isBookmarked ? 'Saved!' : 'Removed',
      isBookmarked ? 'Article bookmarked. +3 points' : 'Bookmark removed'
    );
    updateEngagementUI();
  }

  function handleShareById(articleId) {
    const article = findArticleById(articleId);
    if (!article) return;

    // Try native share first
    Engagement.shareArticle(article).then(result => {
      if (!result.success && DOM.shareModal) {
        renderShareModal(article, articleId);
        DOM.shareModal.classList.add('active');
      }
    });
    updateEngagementUI();
  }

  /**
   * Fix #3: Share modal rendered with addEventListener, not inline onclick.
   */
  function renderShareModal(article, articleId) {
    const optionsContainer = DOM.shareModal ? DOM.shareModal.querySelector('.share-options') : null;
    if (!optionsContainer) return;

    const platforms = ['twitter', 'facebook', 'whatsapp', 'telegram', 'linkedin', 'copy'];
    const icons = {
      twitter: '𝕏', facebook: 'f', whatsapp: '📱',
      telegram: '✈️', linkedin: 'in', copy: '🔗',
    };
    const labels = {
      twitter: 'Twitter', facebook: 'Facebook', whatsapp: 'WhatsApp',
      telegram: 'Telegram', linkedin: 'LinkedIn', copy: 'Copy Link',
    };

    optionsContainer.innerHTML = '';
    platforms.forEach(platform => {
      const btn = document.createElement('button');
      btn.className = 'share-option';
      btn.innerHTML = `
        <div class="share-option-icon ${escapeHtml(platform)}">${icons[platform]}</div>
        <span class="share-option-label">${labels[platform]}</span>
      `;
      btn.addEventListener('click', () => {
        openShareLink(platform, article);
      });
      optionsContainer.appendChild(btn);
    });
  }

  function openShareLink(platform, article) {
    if (!article) return;

    if (platform === 'copy') {
      navigator.clipboard.writeText(article.link).then(() => {
        showToast('🔗', 'Link Copied!', 'Article link copied to clipboard');
      }).catch(() => {
        showToast('⚠️', 'Copy Failed', 'Could not copy link');
      });
    } else {
      const url = Engagement.getShareUrl(platform, article);
      window.open(url, '_blank', 'noopener,width=600,height=400');
    }

    if (DOM.shareModal) DOM.shareModal.classList.remove('active');
  }

  function handleComment(articleId) {
    showToast('💬', 'Comments', 'Comment section coming soon!');
    updateEngagementUI();
  }

  function handleRead(articleId) {
    if (!articleId) return;
    Engagement.trackRead(articleId);
    updateEngagementUI();
  }

  // --- Helpers ---
  function injectCSRFTokens() {
    if (!window.GPAuth) return;
    const token = GPAuth.getCSRFToken();
    const forms = [DOM.loginForm, DOM.signupForm, DOM.createPostForm];
    forms.forEach(form => {
      if (form) {
        const existing = form.querySelector('input[name="csrf_token"]');
        if (existing) existing.remove();
        
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'csrf_token';
        input.value = token;
        form.appendChild(input);
      }
    });
  }

  function generateArticleId(article) {
    if (!article || !article.title) return '';
    return btoa(unescape(encodeURIComponent(article.title))).substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatCount(num) {
    if (typeof num !== 'number') num = parseInt(num) || 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  /**
   * Validate URL format (Fix #4: input validation for user posts).
   */
  function isValidUrl(str) {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function openAuthModal() {
    if (DOM.authModal) DOM.authModal.classList.add('active');
  }

  // --- Reel Engagement Handlers (Fix #3: no more inline onclick) ---
  function handleReelLike(btn) {
    const icon = btn.querySelector('.icon');
    const countSpan = btn.querySelector('.count');
    if (!icon || !countSpan) return;

    const isLiked = btn.classList.contains('liked');

    btn.classList.toggle('liked', !isLiked);
    icon.textContent = !isLiked ? '❤️' : '🤍';
    
    let currentCount = parseInt(countSpan.textContent) || 0;
    countSpan.textContent = !isLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

    // Animate
    icon.style.transform = 'scale(1.4)';
    setTimeout(() => { icon.style.transform = ''; }, ANIMATION_DURATION_MS);

    if (!isLiked) {
      Engagement.addPoints(2, 'Liked a reel');
      showToast('❤️', 'Reel Liked!', '+2 points');
    } else {
      Engagement.addPoints(-2, 'Unliked a reel');
      showToast('🤍', 'Reel Unliked', '-2 points');
    }
    updateEngagementUI();
  }

  function handleReelComment(btn) {
    showToast('💬', 'Reel Comments', 'Comment posted! +15 points');
    
    const countSpan = btn.querySelector('.count');
    if (countSpan) {
      let currentCount = parseInt(countSpan.textContent) || 0;
      countSpan.textContent = currentCount + 1;
    }
    
    Engagement.addPoints(15, 'Commented on a reel');
    updateEngagementUI();
  }

  function handleReelShare(btn) {
    navigator.clipboard.writeText(window.location.href + '#reel').then(() => {
      showToast('🔗', 'Link Copied!', 'Reel share link copied! +20 points');
    }).catch(() => {
      showToast('📤', 'Reel Shared!', 'Reel shared! +20 points');
    });

    Engagement.addPoints(20, 'Shared a reel');
    updateEngagementUI();
  }

  // --- Expose public API ---
  window.App = {
    init,
    handleLike,
    handleComment,
    handleRead,
    showToast,
    openAuthModal,
  };

  // --- Boot ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
