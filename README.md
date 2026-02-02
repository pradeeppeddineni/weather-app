# Temperature Tracker

A premium weather PWA that tracks real-time and historical temperatures for 14 Indian cities. Installable on phone via "Add to Home Screen".

## Features

- **India Map View** — Interactive SVG map with live temperature markers for all cities
- **City Detail** — Current temperature, weather icon, wind speed, humidity, sunshine hours, hourly and 7-day forecast
- **Searchable Cities List** — Browse all cities with weather icons, descriptions, and H/L temps; color-coded by weather condition
- **Weather News** — Live weather news feed for India via Google News RSS, grouped by date
- **Temperature Charts** — Historical + forecast chart with gradient fills and weather-aware color palettes
  - Date range filters: 3D / 7D / 1M / 3M / All
  - Prediction toggle: Historical / Forecast / Both
  - "Today" marker line
- **PWA** — Installable, cached app shell, offline-capable UI
- **Dark Theme** — Glassmorphism surfaces, ambient glow effects that adapt to weather conditions

## Tech Stack

- **HTML / CSS / JS** — No build step, no framework
- **Chart.js** (CDN) — Temperature charts with gradient fills
- **Open-Meteo API** — Free weather data (historical + 16-day forecast), no API key needed
- **Google News RSS via rss2json.com** — Weather news feed
- **Google Fonts** — DM Sans + Space Grotesk

## Cities

Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad, Jaipur, Lucknow, Chandigarh, Bhopal, Kochi, Shimla

## Run Locally

```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

## Deploy

Hosted on GitHub Pages. Any push to `main` auto-deploys.

## License

MIT
