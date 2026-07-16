/**
 * RSS Feed Engine for GlobalPulse
 * Fetches multiple RSS feeds via CORS proxy, deduplicates, and returns normalized articles.
 * Copyright-safe: only headline + 2-line summary + source link.
 */

const RSSEngine = (() => {
  // --- Configuration ---
  const CORS_PROXY = 'https://api.rss2json.com/v1/api.json';
  const API_KEY = ''; // Free tier works without key (limited to 10 calls/sec)
  const CACHE_KEY = 'globalpulse_rss_cache';
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  // RSS feed sources categorized (International + Indian)
  const FEED_SOURCES = {
    world: [
      { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World', icon: '🌐' },
      { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'NY Times', icon: '📰' },
      { url: 'https://feeds.feedburner.com/ndtvnews-world-news', name: 'NDTV World', icon: '🇮🇳' },
      { url: 'https://timesofindia.indiatimes.com/rssfeeds/296589292.cms', name: 'Times of India', icon: '🏛️' },
      { url: 'https://www.thehindu.com/news/international/feeder/default.rss', name: 'The Hindu', icon: '📜' },
    ],
    business: [
      { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', name: 'BBC Business', icon: '💼' },
      { url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147', name: 'CNBC', icon: '📈' },
      { url: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms', name: 'Economic Times', icon: '💹' },
      { url: 'https://feeds.feedburner.com/ndtvprofit-latest', name: 'NDTV Profit', icon: '📊' },
      { url: 'https://www.livemint.com/rss/markets', name: 'Mint Markets', icon: '💰' },
    ],
    technology: [
      { url: 'https://feeds.feedburner.com/TechCrunch', name: 'TechCrunch', icon: '💻' },
      { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge', icon: '🔌' },
      { url: 'https://feeds.feedburner.com/gadgets360-latest', name: 'Gadgets360', icon: '📱' },
      { url: 'https://indianexpress.com/section/technology/feed/', name: 'Indian Express Tech', icon: '🖥️' },
    ],
    sports: [
      { url: 'https://feeds.bbci.co.uk/sport/rss.xml', name: 'BBC Sport', icon: '⚽' },
      { url: 'https://feeds.feedburner.com/ndtvsports-latest', name: 'NDTV Sports', icon: '🏏' },
      { url: 'https://timesofindia.indiatimes.com/rssfeeds/4719148.cms', name: 'TOI Sports', icon: '🏅' },
      { url: 'https://www.cricbuzz.com/rss/cricket-news', name: 'Cricbuzz', icon: '🏏' },
    ],
    entertainment: [
      { url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', name: 'BBC Entertainment', icon: '🎬' },
      { url: 'https://feeds.feedburner.com/ndtventertainment-latest', name: 'NDTV Entertainment', icon: '🎭' },
      { url: 'https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms', name: 'TOI Entertainment', icon: '🎵' },
      { url: 'https://indianexpress.com/section/entertainment/bollywood/feed/', name: 'IE Bollywood', icon: '🎞️' },
    ],
    health: [
      { url: 'https://feeds.bbci.co.uk/news/health/rss.xml', name: 'BBC Health', icon: '🏥' },
      { url: 'https://feeds.feedburner.com/ndtvhealth-latest', name: 'NDTV Health', icon: '💊' },
      { url: 'https://timesofindia.indiatimes.com/rssfeeds/3908999.cms', name: 'TOI Health', icon: '🩺' },
    ],
    science: [
      { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', name: 'BBC Science', icon: '🔬' },
      { url: 'https://feeds.feedburner.com/ndtvscience-latest', name: 'NDTV Science', icon: '🧬' },
      { url: 'https://www.thehindu.com/sci-tech/science/feeder/default.rss', name: 'The Hindu Science', icon: '🔭' },
    ],
  };

  // --- Fallback articles for when RSS fails ---
  const FALLBACK_ARTICLES = [
    {
      title: 'Global Climate Summit Reaches Historic Agreement on Carbon Emissions',
      summary: 'World leaders have agreed to cut carbon emissions by 50% by 2035 in a landmark deal that environmental groups call "a turning point for humanity."',
      category: 'world',
      source: 'GlobalPulse',
      sourceIcon: '🌍',
      link: '#',
      image: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=600&h=400&fit=crop',
      pubDate: new Date().toISOString(),
      likes: 2431,
      comments: 52,
    },
    {
      title: 'Tech Giants Rally as AI Stocks Lead Market Recovery',
      summary: 'Major technology companies saw significant gains as investors bet on the next wave of artificial intelligence innovation driving enterprise productivity.',
      category: 'business',
      source: 'CNBC',
      sourceIcon: '📈',
      link: '#',
      image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop',
      pubDate: new Date(Date.now() - 3600000).toISOString(),
      likes: 1024,
      comments: 18,
    },
    {
      title: 'NASA Announces New Moon Mission in Collaboration with SpaceX',
      summary: 'The space agency has revealed plans for a crewed lunar mission using SpaceX\'s Starship, targeting a 2027 landing date near the lunar south pole.',
      category: 'technology',
      source: 'TechCrunch',
      sourceIcon: '🚀',
      link: '#',
      image: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=600&h=400&fit=crop',
      pubDate: new Date(Date.now() - 7200000).toISOString(),
      likes: 3120,
      comments: 64,
    },
    {
      title: 'Champions League Final: City Wins in Thrilling Penalties',
      summary: 'Manchester City clinched their second consecutive Champions League title in a dramatic penalty shootout that had fans on the edge of their seats.',
      category: 'sports',
      source: 'BBC Sport',
      sourceIcon: '⚽',
      link: '#',
      image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=400&fit=crop',
      pubDate: new Date(Date.now() - 10800000).toISOString(),
      likes: 4580,
      comments: 127,
    },
    {
      title: 'Global Music Festival Returns with Record-Breaking Crowd',
      summary: 'Over 200,000 attendees flocked to the annual music festival, featuring performances from top artists across genres in what organizers called their biggest year yet.',
      category: 'entertainment',
      source: 'BBC Entertainment',
      sourceIcon: '🎵',
      link: '#',
      image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop',
      pubDate: new Date(Date.now() - 14400000).toISOString(),
      likes: 2989,
      comments: 45,
    },
    {
      title: 'New Study Reveals Breakthrough in Cancer Treatment Using mRNA Technology',
      summary: 'Researchers have developed an mRNA-based therapy showing remarkable results in clinical trials, with 87% of patients showing significant tumor reduction.',
      category: 'health',
      source: 'BBC Health',
      sourceIcon: '🏥',
      link: '#',
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop',
      pubDate: new Date(Date.now() - 18000000).toISOString(),
      likes: 1654,
      comments: 23,
    },
    {
      title: 'Tokyo Introduces 4-Day Work Week Trial for Government Employees',
      summary: 'Japan\'s capital city begins a bold experiment allowing government workers a three-day weekend, aiming to improve work-life balance and boost productivity.',
      category: 'world',
      source: 'NY Times',
      sourceIcon: '📰',
      link: '#',
      image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=400&fit=crop',
      pubDate: new Date(Date.now() - 21600000).toISOString(),
      likes: 1248,
      comments: 32,
    },
    {
      title: 'Quantum Computing Milestone: First Error-Corrected Logical Qubit Achieved',
      summary: 'Scientists have demonstrated the first practical error-corrected quantum computer, bringing the technology closer to solving real-world problems at scale.',
      category: 'science',
      source: 'The Verge',
      sourceIcon: '🔬',
      link: '#',
      image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=400&fit=crop',
      pubDate: new Date(Date.now() - 25200000).toISOString(),
      likes: 892,
      comments: 15,
    },
    {
      title: 'Electric Vehicle Sales Surge 40% as Battery Prices Hit Record Low',
      summary: 'Global EV adoption accelerates as new battery manufacturing techniques bring costs down, making electric vehicles more affordable than ever for mainstream buyers.',
      category: 'business',
      source: 'CNBC',
      sourceIcon: '📈',
      link: '#',
      image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&h=400&fit=crop',
      pubDate: new Date(Date.now() - 28800000).toISOString(),
      likes: 756,
      comments: 28,
    },
    {
      title: 'Indie Game Wins Game of the Year at Major Awards Ceremony',
      summary: 'A small studio\'s passion project takes home the top honor, proving that creativity and storytelling can compete with big-budget blockbuster releases.',
      category: 'entertainment',
      source: 'The Verge',
      sourceIcon: '🎮',
      link: '#',
      image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&h=400&fit=crop',
      pubDate: new Date(Date.now() - 32400000).toISOString(),
      likes: 3456,
      comments: 89,
    },
    {
      title: 'Mediterranean Diet Linked to 30% Lower Risk of Heart Disease in New Study',
      summary: 'A comprehensive 20-year study confirms the cardiovascular benefits of the Mediterranean diet, with researchers recommending it as a primary prevention strategy.',
      category: 'health',
      source: 'BBC Health',
      sourceIcon: '❤️',
      link: '#',
      image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600&h=400&fit=crop',
      pubDate: new Date(Date.now() - 36000000).toISOString(),
      likes: 1123,
      comments: 34,
    },
    {
      title: 'Olympic Committee Announces New eSports Category for 2028 Games',
      summary: 'Competitive gaming officially enters the Olympic arena as the committee approves three eSports titles for the next Summer Games in Los Angeles.',
      category: 'sports',
      source: 'BBC Sport',
      sourceIcon: '🏅',
      link: '#',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=400&fit=crop',
      pubDate: new Date(Date.now() - 39600000).toISOString(),
      likes: 2134,
      comments: 67,
    },
  ];

  // --- Helper: Truncate to 2 sentences ---
  function truncateToSummary(text, maxLength = 160) {
    if (!text) return '';
    // Strip HTML tags
    const clean = text.replace(/<[^>]*>/g, '').trim();
    // Try to cut at sentence boundary
    const sentences = clean.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length >= 2) {
      const twoSentences = sentences.slice(0, 2).join(' ').trim();
      return twoSentences.length > maxLength ? twoSentences.substring(0, maxLength) + '…' : twoSentences;
    }
    return clean.length > maxLength ? clean.substring(0, maxLength) + '…' : clean;
  }

  // --- Helper: Extract image from RSS item ---
  function extractImage(item) {
    if (item.thumbnail) return item.thumbnail;
    if (item.enclosure && item.enclosure.link) return item.enclosure.link;
    // Try to find image in description
    const imgMatch = (item.description || '').match(/<img[^>]+src=["']([^"']+)["']/);
    if (imgMatch) return imgMatch[1];
    // Try content
    const contentMatch = (item.content || '').match(/<img[^>]+src=["']([^"']+)["']/);
    if (contentMatch) return contentMatch[1];
    return null;
  }

  // --- Fetch a single feed ---
  async function fetchFeed(source, category) {
    const url = `${CORS_PROXY}?rss_url=${encodeURIComponent(source.url)}${API_KEY ? '&api_key=' + API_KEY : ''}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.status !== 'ok' || !data.items) return [];

      return data.items.slice(0, 5).map(item => ({
        title: item.title || 'Untitled',
        summary: truncateToSummary(item.description || item.content),
        category: category,
        source: source.name,
        sourceIcon: source.icon,
        link: item.link || '#',
        image: extractImage(item),
        pubDate: item.pubDate || new Date().toISOString(),
        likes: Math.floor(Math.random() * 3000) + 200,
        comments: Math.floor(Math.random() * 100) + 5,
      }));
    } catch (error) {
      console.warn(`[RSSEngine] Failed to fetch ${source.name}:`, error.message);
      return [];
    }
  }

  // --- Deduplicate by title similarity ---
  function deduplicateArticles(articles) {
    const seen = new Set();
    return articles.filter(article => {
      const key = article.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 40);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // --- Assign fallback images by category ---
  const CATEGORY_IMAGES = {
    world: [
      'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=600&h=400&fit=crop',
    ],
    business: [
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
    ],
    technology: [
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=600&h=400&fit=crop',
    ],
    sports: [
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1461896836934-bd45ba84a36f?w=600&h=400&fit=crop',
    ],
    entertainment: [
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&h=400&fit=crop',
    ],
    health: [
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&h=400&fit=crop',
    ],
    science: [
      'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600&h=400&fit=crop',
    ],
  };

  function assignFallbackImage(article) {
    if (article.image) return article;
    const images = CATEGORY_IMAGES[article.category] || CATEGORY_IMAGES.world;
    article.image = images[Math.floor(Math.random() * images.length)];
    return article;
  }

  // --- Cache management ---
  function getCache() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp > CACHE_DURATION) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return parsed.articles;
    } catch {
      return null;
    }
  }

  function setCache(articles) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        articles: articles,
      }));
    } catch {
      // Quota exceeded, ignore
    }
  }

  // --- Geolocation & Indian News Reordering ---
  const COUNTRY_CACHE_KEY = 'globalpulse_user_country';

  async function detectCountry() {
    try {
      const cachedCountry = localStorage.getItem(COUNTRY_CACHE_KEY);
      if (cachedCountry) return cachedCountry;
    } catch (e) {}

    try {
      // Use freeipapi.com as primary (HTTPS, free, fast)
      const response = await fetch('https://freeipapi.com/api/json');
      if (response.ok) {
        const data = await response.json();
        const country = data.countryCode || 'US';
        try {
          localStorage.setItem(COUNTRY_CACHE_KEY, country);
        } catch (e) {}
        return country;
      }
    } catch (e) {
      console.warn('[RSSEngine] Failed primary country detection:', e.message);
    }

    try {
      // Fallback to ipapi.co
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        const country = data.country_code || 'US';
        try {
          localStorage.setItem(COUNTRY_CACHE_KEY, country);
        } catch (e) {}
        return country;
      }
    } catch (e) {
      console.warn('[RSSEngine] Fallback country detection failed:', e.message);
    }

    return 'US';
  }

  function isIndianSource(article) {
    const indianSources = [
      'NDTV World', 'Times of India', 'The Hindu', 'Economic Times', 
      'NDTV Profit', 'Mint Markets', 'Gadgets360', 'Indian Express Tech', 
      'NDTV Sports', 'TOI Sports', 'Cricbuzz', 'NDTV Entertainment', 
      'TOI Entertainment', 'IE Bollywood', 'NDTV Health', 'TOI Health', 
      'NDTV Science', 'The Hindu Science'
    ];
    return article.sourceIcon === '🇮🇳' || indianSources.includes(article.source);
  }

  // --- Public API ---
  return {
    FEED_SOURCES,
    FALLBACK_ARTICLES,

    /**
     * Fetch all feeds and return normalized, deduplicated articles.
     * Falls back to preset articles if all feeds fail.
     */
    async fetchAllFeeds(options = {}) {
      const { categories = null, forceRefresh = false } = options;

      // Check cache first
      if (!forceRefresh) {
        const cached = getCache();
        if (cached) {
          console.log('[RSSEngine] Using cached articles');
          return categories
            ? cached.filter(a => categories.includes(a.category))
            : cached;
        }
      }

      console.log('[RSSEngine] Fetching fresh feeds...');
      const feedPromises = [];

      for (const [category, sources] of Object.entries(FEED_SOURCES)) {
        if (categories && !categories.includes(category)) continue;
        for (const source of sources) {
          feedPromises.push(fetchFeed(source, category));
        }
      }

      const results = await Promise.allSettled(feedPromises);
      let articles = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value);

      // If no articles fetched, use fallbacks
      if (articles.length === 0) {
        console.log('[RSSEngine] No feeds available, using fallback articles');
        articles = [...FALLBACK_ARTICLES];
      } else {
        articles = deduplicateArticles(articles);
      }

      // Assign fallback images
      articles = articles.map(assignFallbackImage);

      // Sort by date (newest first)
      articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

      // Geolocation check and IP-based sorting:
      // If user's country code is India (IN), bubble Indian news to the top
      try {
        const country = await detectCountry();
        console.log(`[RSSEngine] User country detected: ${country}`);
        if (country === 'IN') {
          const indianArticles = articles.filter(isIndianSource);
          const globalArticles = articles.filter(a => !isIndianSource(a));
          articles = [...indianArticles, ...globalArticles];
        }
      } catch (e) {
        console.warn('[RSSEngine] Error during geolocation sorting:', e.message);
      }

      // Cache results
      setCache(articles);

      return categories
        ? articles.filter(a => categories.includes(a.category))
        : articles;
    },

    /**
     * Get articles for a specific category
     */
    async fetchByCategory(category) {
      const all = await this.fetchAllFeeds();
      return all.filter(a => a.category === category);
    },

    /**
     * Get trending/breaking articles (top by engagement)
     */
    async fetchBreaking(count = 5) {
      const all = await this.fetchAllFeeds();
      return [...all]
        .sort((a, b) => (b.likes + b.comments * 3) - (a.likes + a.comments * 3))
        .slice(0, count);
    },

    /**
     * Search articles by query
     */
    async searchArticles(query) {
      const all = await this.fetchAllFeeds();
      const q = query.toLowerCase();
      return all.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.category.includes(q) ||
        a.source.toLowerCase().includes(q)
      );
    },

    /**
     * Format time ago string
     */
    timeAgo(dateString) {
      const now = new Date();
      const date = new Date(dateString);
      const seconds = Math.floor((now - date) / 1000);

      if (seconds < 60) return 'just now';
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
      if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    },

    /**
     * Clear cache
     */
    clearCache() {
      localStorage.removeItem(CACHE_KEY);
      console.log('[RSSEngine] Cache cleared');
    },
  };
})();
