# Temperature Tracker PWA

A premium weather app that tracks min/max temperatures for 14 Indian cities. Works as a PWA — installable on phone via "Add to Home Screen".

## Tech Stack

- **HTML/CSS/JS** — no build step, no framework
- **Chart.js** (CDN) — line charts with solid/dotted lines for historical vs forecast
- **Open-Meteo API** — free weather data (historical + 16-day forecast), no API key needed
- **PWA** — manifest.json + service worker for install-to-home-screen
- **Google Fonts** — DM Sans + Space Grotesk

## File Structure

```
sk/
├── index.html          # Main single-page app
├── style.css           # Responsive styles (mobile-first, dark theme)
├── app.js              # Main logic: API calls, weather icons, rendering
├── cities.js           # 14 Indian cities with lat/lon coordinates
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (cache app shell)
├── icons/              # PWA icons (192px, 512px)
└── CLAUDE.md           # This file
```

## How to Run

```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

## API Endpoints

- **Historical**: `archive-api.open-meteo.com/v1/archive` (Jan 1 2026 → 5 days ago)
- **Forecast**: `api.open-meteo.com/v1/forecast` (past 5 days + 16 day forecast, includes hourly data)

## Features

- Large weather icon with animated SVGs (sun, clouds, rain, snow, thunder)
- Current temperature, wind speed, humidity, sunshine hours
- Hourly forecast (next 24 hours) as swipeable cards
- 7-day forecast with min/max temperature bars
- Full historical chart overlay (Jan 2026 → forecast) with solid/dotted line styles
- City picker to switch between 14 cities
- Swipe left/right to change cities on mobile
- Ambient glow effect that changes based on temperature (warm orange vs cool blue)
- PWA: installable, cached app shell, offline-capable UI

## Design

- Dark theme with glassmorphism-inspired surfaces
- DM Sans for body text, Space Grotesk for headings/numbers
- Warm red (#f97066) for max temps, cool blue (#60a5fa) for min temps
- Staggered fade-in animations, smooth transitions
- Mobile-first, max-width 480px centered layout

## Git Rules

- Never add `Co-Authored-By` lines to commit messages
- Do not include any Claude/AI attribution in commits
