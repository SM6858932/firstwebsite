# GlobalPulse — Live Global News & Trending Content

A modern, engagement-driven news aggregation website that auto-fetches global RSS feeds, showcases trending reels and products, and uses gamification to drive repeat visits.

![GlobalPulse](https://images.unsplash.com/photo-1504711434969-e33886168d13?w=1200&h=400&fit=crop)

## Features

- **Live RSS Feeds** — Auto-fetches news from BBC, NYTimes, TechCrunch, CNBC, The Verge, and more
- **Category Filtering** — World, Business, Technology, Sports, Entertainment, Health, Science
- **Breaking News Ticker** — Real-time scrolling headlines at the top of the page
- **Trending Reels** — Video card carousel showcasing viral content
- **Product Deals** — Curated product showcase with discount badges
- **Gamification** — Points system for reading, liking, sharing, commenting, and daily streaks
- **Push Notifications** — Browser notification support for breaking news alerts
- **Dark/Light Mode** — Toggle between premium dark and clean light themes
- **Bookmarks** — Save articles to read later (localStorage)
- **Social Sharing** — Share to Twitter, Facebook, WhatsApp, or copy link
- **Responsive Design** — Works on mobile, tablet, and desktop
- **SEO Optimized** — Full meta tags, Open Graph, structured data

## Tech Stack

- **HTML5** — Semantic markup with accessibility
- **CSS3** — Custom properties, glassmorphism, smooth animations, responsive grid
- **Vanilla JavaScript** — Modular architecture (RSS Engine, Engagement, App)
- **RSS Feeds** — via rss2json.com CORS proxy
- **No dependencies** — Zero npm packages, zero build step

## File Structure

```
├── index.html          # Main homepage
├── style.css           # Complete design system
├── app.js              # Main application logic
├── rss-engine.js       # RSS feed fetching module
├── engagement.js       # Gamification & engagement module
├── README.md           # This file
├── .gitignore          # Git ignore rules
└── plan.txt            # Original project plan
```

## RSS Sources

| Category      | Sources                  |
|---------------|--------------------------|
| World         | BBC World, NY Times      |
| Business      | BBC Business, CNBC       |
| Technology    | TechCrunch, The Verge    |
| Sports        | BBC Sport                |
| Entertainment | BBC Entertainment        |
| Health        | BBC Health               |
| Science       | BBC Science              |

## How It Works

1. On page load, the RSS Engine fetches feeds from multiple sources via the rss2json CORS proxy
2. Articles are deduplicated, normalized, and cached in localStorage (30-min TTL)
3. The App module renders articles in a responsive grid with category badges and engagement stats
4. Users earn points for reading, liking, sharing, and daily visit streaks
5. Breaking headlines scroll in the top ticker bar
6. Push notifications can be enabled for breaking news alerts

## Copyright Safety

- Only headlines and 2-line summaries are displayed (fair use)
- Full articles link back to the original source
- No full-text copying — all content is attributed and linked

## Local Development

Simply open `index.html` in a browser. No build step required.

```bash
# Or use a simple HTTP server
npx serve .
```

## License

MIT
