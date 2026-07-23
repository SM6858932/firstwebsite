# AdSense-Ready Content Plan for GlobalPulse

## Information Gathered

### Current State:
- **index.html**: Single-page app with RSS news feed, reels, products, gamification, auth modals. Footer has legal/category links disabled with `onclick="return false;"`. Breaking ticker shows "Loading latest headlines..." placeholder.
- **style.css**: Complete dark/light theme design system. Fully responsive. Good mobile support.
- **app.js**: Main app logic - fetches RSS, renders articles, handles engagement/interactions. Uses fallback articles when RSS fails.
- **rss-engine.js**: Fetches 25+ RSS sources across 7 categories. Has fallback articles. Caches results.
- **auth.js**: Firebase-ready auth with localStorage fallback. CSRF protection.
- **engagement.js**: Points, streaks, bookmarks, likes, push notifications.
- **ads.txt**: Published correctly.
- **vercel.json**: Simple clean URLs config.

### Issues for AdSense Readiness:
1. **Breaking ticker placeholder** - Shows "Loading latest headlines..." until RSS loads
2. **No static content** - Entirely dependent on RSS/fetch. AdSense crawlers may not see content.
3. **Footer links broken** - "About Us", "Contact", "Privacy Policy", "Terms of Service" all use `onclick="return false;"`
4. **No pillar/original articles** - No long-form content demonstrating authority
5. **No unique introductions** - RSS content is truncated without original commentary
6. **No dedicated legal pages** - Privacy Policy, Terms, About, Contact missing
7. **Featured section not prominent** - Category stories and filter pills exist but no clear featured/hero section
8. **Content depth** - Need to ensure 10-15 articles visible on initial load

