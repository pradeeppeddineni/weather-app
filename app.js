/* ══════════════════════════════════════════════════════
   Temperature Tracker — app.js
   India map → city detail weather app
   ══════════════════════════════════════════════════════ */

/* ── Helpers ───────────────────────────────────────── */

function toIST(date) {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function todayStr() {
  return toIST(new Date());
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toIST(d);
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toIST(d);
}

function nowHourIST() {
  return parseInt(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }), 10);
}

function formatLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function formatDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (d - today) / 86400000;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tmrw";
  return d.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 3);
}

function formatHour(h) {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? h + "am" : (h - 12) + "pm";
}

function formatFullDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
}

function formatNewsDate(dateKey) {
  const today = todayStr();
  const yesterday = daysAgo(1);
  if (dateKey === today) return "Today";
  if (dateKey === yesterday) return "Yesterday";
  const d = new Date(dateKey + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
}

function getTimeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  return days + "d ago";
}

/* ── Coordinate mapping ───────────────────────────── */
/* viewBox: 0 0 500 600
   x = (lon - 66) * (500/33)
   y = (38 - lat) * (600/32) */

function latLonToPercent(lat, lon) {
  const x = (lon - 66) * (500 / 33);
  const y = (38 - lat) * (600 / 32);
  return { xPct: (x / 500) * 100, yPct: (y / 600) * 100 };
}

/* ── Weather Code → Description & Icon ─────────────── */

const WMO = {
  0: { desc: "Clear sky", icon: "sun" },
  1: { desc: "Mainly clear", icon: "sun" },
  2: { desc: "Partly cloudy", icon: "cloud-sun" },
  3: { desc: "Overcast", icon: "cloud" },
  45: { desc: "Foggy", icon: "fog" },
  47: { desc: "Depositing rime fog", icon: "fog" },
  51: { desc: "Light drizzle", icon: "drizzle" },
  53: { desc: "Moderate drizzle", icon: "drizzle" },
  55: { desc: "Dense drizzle", icon: "drizzle" },
  61: { desc: "Slight rain", icon: "rain" },
  63: { desc: "Moderate rain", icon: "rain" },
  65: { desc: "Heavy rain", icon: "rain-heavy" },
  71: { desc: "Slight snow", icon: "snow" },
  73: { desc: "Moderate snow", icon: "snow" },
  75: { desc: "Heavy snow", icon: "snow" },
  77: { desc: "Snow grains", icon: "snow" },
  80: { desc: "Slight rain showers", icon: "rain" },
  81: { desc: "Moderate rain showers", icon: "rain-heavy" },
  82: { desc: "Violent rain showers", icon: "rain-heavy" },
  85: { desc: "Slight snow showers", icon: "snow" },
  86: { desc: "Heavy snow showers", icon: "snow" },
  95: { desc: "Thunderstorm", icon: "thunder" },
  96: { desc: "Thunderstorm with hail", icon: "thunder" },
  99: { desc: "Thunderstorm with heavy hail", icon: "thunder" },
};

function getWeatherInfo(code) {
  return WMO[code] || { desc: "Unknown", icon: "cloud" };
}

/* ── SVG Weather Icons ─────────────────────────────── */

let _svgIdCounter = 0;

function weatherSVG(type, size = 140) {
  const s = size;
  const u = ++_svgIdCounter;
  const icons = {
    sun: `<svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sg${u}" cx="50%" cy="40%">
          <stop offset="0%" stop-color="#FFD93D"/>
          <stop offset="100%" stop-color="#F09819"/>
        </radialGradient>
      </defs>
      <circle cx="${s*.5}" cy="${s*.5}" r="${s*.28}" fill="url(#sg${u})"/>
      ${[0,45,90,135,180,225,270,315].map(a => {
        const rad = a * Math.PI / 180;
        const x1 = s*.5 + Math.cos(rad)*s*.36;
        const y1 = s*.5 + Math.sin(rad)*s*.36;
        const x2 = s*.5 + Math.cos(rad)*s*.44;
        const y2 = s*.5 + Math.sin(rad)*s*.44;
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#FFD93D" stroke-width="${s*.03}" stroke-linecap="round" opacity="0.7"/>`;
      }).join('')}
    </svg>`,

    "cloud-sun": `<svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="csg${u}" cx="50%" cy="40%">
          <stop offset="0%" stop-color="#FFD93D"/>
          <stop offset="100%" stop-color="#F09819"/>
        </radialGradient>
        <linearGradient id="ccg${u}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#d0d5dd" stop-opacity="0.9"/>
        </linearGradient>
      </defs>
      <circle cx="${s*.58}" cy="${s*.3}" r="${s*.18}" fill="url(#csg${u})"/>
      <ellipse cx="${s*.45}" cy="${s*.58}" rx="${s*.3}" ry="${s*.16}" fill="url(#ccg${u})"/>
      <circle cx="${s*.25}" cy="${s*.55}" r="${s*.12}" fill="url(#ccg${u})"/>
      <circle cx="${s*.6}" cy="${s*.53}" r="${s*.1}" fill="url(#ccg${u})"/>
    </svg>`,

    cloud: `<svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="clg${u}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e0e4ec" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#b0b8c8" stop-opacity="0.85"/>
        </linearGradient>
      </defs>
      <ellipse cx="${s*.5}" cy="${s*.55}" rx="${s*.32}" ry="${s*.17}" fill="url(#clg${u})"/>
      <circle cx="${s*.33}" cy="${s*.48}" r="${s*.14}" fill="url(#clg${u})"/>
      <circle cx="${s*.58}" cy="${s*.42}" r="${s*.16}" fill="url(#clg${u})"/>
      <circle cx="${s*.42}" cy="${s*.38}" r="${s*.13}" fill="url(#clg${u})"/>
    </svg>`,

    fog: `<svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="${s*.5}" cy="${s*.42}" rx="${s*.28}" ry="${s*.13}" fill="#b0b8c8" opacity="0.6"/>
      ${[0.48, 0.55, 0.62].map(y =>
        `<line x1="${s*.2}" y1="${s*y}" x2="${s*.8}" y2="${s*y}" stroke="#b0b8c8" stroke-width="${s*.025}" stroke-linecap="round" opacity="0.5"/>`
      ).join('')}
    </svg>`,

    drizzle: `<svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="drg${u}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e0e4ec" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#b0b8c8" stop-opacity="0.8"/>
        </linearGradient>
      </defs>
      <ellipse cx="${s*.5}" cy="${s*.4}" rx="${s*.3}" ry="${s*.14}" fill="url(#drg${u})"/>
      <circle cx="${s*.3}" cy="${s*.38}" r="${s*.11}" fill="url(#drg${u})"/>
      <circle cx="${s*.62}" cy="${s*.35}" r="${s*.12}" fill="url(#drg${u})"/>
      ${[s*.38, s*.5, s*.62].map((x, i) =>
        `<line x1="${x}" y1="${s*.58 + i*2}" x2="${x - s*.02}" y2="${s*.65 + i*2}" stroke="#60a5fa" stroke-width="${s*.025}" stroke-linecap="round" opacity="0.7"/>`
      ).join('')}
    </svg>`,

    rain: `<svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="rsg${u}" cx="60%" cy="30%">
          <stop offset="0%" stop-color="#FFD93D"/>
          <stop offset="100%" stop-color="#F09819"/>
        </radialGradient>
        <linearGradient id="rcg${u}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#d0d5dd" stop-opacity="0.9"/>
        </linearGradient>
      </defs>
      <circle cx="${s*.62}" cy="${s*.22}" r="${s*.14}" fill="url(#rsg${u})"/>
      <ellipse cx="${s*.45}" cy="${s*.42}" rx="${s*.3}" ry="${s*.15}" fill="url(#rcg${u})"/>
      <circle cx="${s*.25}" cy="${s*.4}" r="${s*.12}" fill="url(#rcg${u})"/>
      <circle cx="${s*.6}" cy="${s*.37}" r="${s*.11}" fill="url(#rcg${u})"/>
      ${[s*.32, s*.44, s*.56].map((x, i) =>
        `<line x1="${x}" y1="${s*.6}" x2="${x - s*.03}" y2="${s*.72}" stroke="#3B82F6" stroke-width="${s*.035}" stroke-linecap="round">
          <animate attributeName="y1" values="${s*.6};${s*.63};${s*.6}" dur="${1.2 + i*0.2}s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="${s*.72};${s*.75};${s*.72}" dur="${1.2 + i*0.2}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1;0.5;1" dur="${1.2 + i*0.2}s" repeatCount="indefinite"/>
        </line>`
      ).join('')}
    </svg>`,

    "rain-heavy": `<svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rhg${u}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#9ca3af" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#6b7280" stop-opacity="0.9"/>
        </linearGradient>
      </defs>
      <ellipse cx="${s*.48}" cy="${s*.38}" rx="${s*.32}" ry="${s*.16}" fill="url(#rhg${u})"/>
      <circle cx="${s*.28}" cy="${s*.35}" r="${s*.13}" fill="url(#rhg${u})"/>
      <circle cx="${s*.64}" cy="${s*.33}" r="${s*.12}" fill="url(#rhg${u})"/>
      ${[s*.28, s*.38, s*.48, s*.58, s*.68].map((x, i) =>
        `<line x1="${x}" y1="${s*.58}" x2="${x - s*.04}" y2="${s*.74}" stroke="#2563EB" stroke-width="${s*.035}" stroke-linecap="round">
          <animate attributeName="y1" values="${s*.58};${s*.62};${s*.58}" dur="${1 + i*0.15}s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="${s*.74};${s*.78};${s*.74}" dur="${1 + i*0.15}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1;0.4;1" dur="${1 + i*0.15}s" repeatCount="indefinite"/>
        </line>`
      ).join('')}
    </svg>`,

    snow: `<svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sng${u}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e0e4ec" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#b0b8c8" stop-opacity="0.8"/>
        </linearGradient>
      </defs>
      <ellipse cx="${s*.5}" cy="${s*.38}" rx="${s*.3}" ry="${s*.14}" fill="url(#sng${u})"/>
      <circle cx="${s*.32}" cy="${s*.35}" r="${s*.12}" fill="url(#sng${u})"/>
      <circle cx="${s*.62}" cy="${s*.33}" r="${s*.11}" fill="url(#sng${u})"/>
      ${[s*.35, s*.5, s*.65].map((x, i) =>
        `<circle cx="${x}" cy="${s*(.58 + i*.05)}" r="${s*.02}" fill="#bfdbfe" opacity="0.9">
          <animate attributeName="cy" values="${s*(.58+i*.05)};${s*(.72+i*.03)};${s*(.58+i*.05)}" dur="${1.5 + i*0.3}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.9;0.3;0.9" dur="${1.5 + i*0.3}s" repeatCount="indefinite"/>
        </circle>`
      ).join('')}
    </svg>`,

    thunder: `<svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="thg${u}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#6b7280" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#4b5563" stop-opacity="0.9"/>
        </linearGradient>
      </defs>
      <ellipse cx="${s*.48}" cy="${s*.35}" rx="${s*.32}" ry="${s*.16}" fill="url(#thg${u})"/>
      <circle cx="${s*.28}" cy="${s*.32}" r="${s*.13}" fill="url(#thg${u})"/>
      <circle cx="${s*.64}" cy="${s*.3}" r="${s*.12}" fill="url(#thg${u})"/>
      <polygon points="${s*.46},${s*.52} ${s*.52},${s*.52} ${s*.48},${s*.62} ${s*.56},${s*.62} ${s*.44},${s*.78} ${s*.48},${s*.65} ${s*.42},${s*.65}" fill="#FBBF24">
        <animate attributeName="opacity" values="1;0.3;1;0.5;1" dur="2s" repeatCount="indefinite"/>
      </polygon>
    </svg>`,
  };

  return icons[type] || icons.cloud;
}

function weatherSVGSmall(type, size = 32) {
  return weatherSVG(type, size);
}

/* ── API ───────────────────────────────────────────── */

async function fetchHistorical(city) {
  const start = "2026-01-01";
  const end = daysAgo(5);
  const url =
    `https://archive-api.open-meteo.com/v1/archive?` +
    `latitude=${city.lat}&longitude=${city.lon}` +
    `&start_date=${start}&end_date=${end}` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
    `&timezone=Asia%2FKolkata`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Historical API ${res.status}`);
  return res.json();
}

async function fetchForecast(city) {
  const url =
    `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${city.lat}&longitude=${city.lon}` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code,sunshine_duration` +
    `&hourly=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m` +
    `&timezone=Asia%2FKolkata&forecast_days=16&past_days=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Forecast API ${res.status}`);
  return res.json();
}

function mergeDailyData(historical, forecast) {
  const map = new Map();

  if (historical?.daily?.time) {
    historical.daily.time.forEach((date, i) => {
      map.set(date, {
        date,
        max: historical.daily.temperature_2m_max[i],
        min: historical.daily.temperature_2m_min[i],
        code: historical.daily.weather_code?.[i] ?? 0,
        sunshine: null,
      });
    });
  }

  if (forecast?.daily?.time) {
    forecast.daily.time.forEach((date, i) => {
      if (!map.has(date)) {
        map.set(date, {
          date,
          max: forecast.daily.temperature_2m_max[i],
          min: forecast.daily.temperature_2m_min[i],
          code: forecast.daily.weather_code?.[i] ?? 0,
          sunshine: forecast.daily.sunshine_duration?.[i] ?? null,
        });
      }
    });
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function extractHourly(forecast) {
  if (!forecast?.hourly?.time) return [];
  return forecast.hourly.time.map((t, i) => ({
    time: t,
    temp: forecast.hourly.temperature_2m[i],
    code: forecast.hourly.weather_code?.[i] ?? 0,
    humidity: forecast.hourly.relative_humidity_2m?.[i] ?? null,
    wind: forecast.hourly.wind_speed_10m?.[i] ?? null,
  }));
}

/* ── State ─────────────────────────────────────────── */

let cityDataMap = {};
let currentCityIdx = 0;
let historyChart = null;
let isZooming = false;
let navigatedFrom = "map"; // "map" or "cities"
let newsLoaded = false;
let activeChartRange = "all";
let activeChartPred = "both";

/* ── Tab Switching ─────────────────────────────────── */

function switchTab(tabId) {
  // Close detail & chart if open
  document.getElementById("detailView").classList.remove("visible");
  closeChartOverlay();

  // Reset map zoom if we were in detail from map
  if (navigatedFrom === "map") {
    const container = document.getElementById("mapContainer");
    document.getElementById("mapView").classList.remove("hidden");
    container.classList.remove("zooming");
    container.style.transform = "";
  }

  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tab-bar-btn").forEach(el => el.classList.remove("active"));

  const tab = document.getElementById(tabId);
  if (tab) tab.classList.add("active");

  const btn = document.querySelector(`.tab-bar-btn[data-tab="${tabId}"]`);
  if (btn) btn.classList.add("active");

  // Lazy load news on first visit
  if (tabId === "tabNews" && !newsLoaded) {
    newsLoaded = true;
    loadNews();
  }

  // Re-render cities list when switching to it
  if (tabId === "tabCities") {
    renderCitiesList();
  }
}

/* ── Map Rendering ─────────────────────────────────── */

function latLonToSVG(lat, lon) {
  const x = (lon - 66) * (500 / 33);
  const y = (38 - lat) * (600 / 32);
  return { x, y };
}

const WEATHER_EMOJI = {
  sun: "\u2600\uFE0F", "cloud-sun": "\u26C5", cloud: "\u2601\uFE0F",
  fog: "\u2601\uFE0F", drizzle: "\uD83C\uDF26\uFE0F", rain: "\uD83C\uDF27\uFE0F",
  "rain-heavy": "\uD83C\uDF27\uFE0F", snow: "\u2744\uFE0F", thunder: "\u26A1",
};

function renderMap() {
  const svg = document.getElementById("indiaSvg");

  // Preserve <defs> from HTML
  const defs = svg.querySelector("defs");
  const defsHTML = defs ? defs.outerHTML : "";

  let content = defsHTML + `<path class="india-path" d="${INDIA_SVG_PATH}"/>`;

  let hottest = null, coldest = null;
  const cityTemps = [];

  // Build label positions first, then resolve overlaps
  const labels = CITIES.map((city, idx) => {
    const { x, y } = latLonToSVG(city.lat, city.lon);
    const info = getCityCurrentData(city);
    const isLeft = city.anchor === "l";
    return { city, idx, x, y, info, isLeft, labelY: y };
  });

  // Simple collision avoidance: if two labels are close, push them apart
  const MIN_Y_GAP = 16;
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i], b = labels[j];
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.labelY - b.labelY);
      if (dx < 60 && dy < MIN_Y_GAP) {
        const mid = (a.labelY + b.labelY) / 2;
        if (a.labelY <= b.labelY) {
          a.labelY = mid - MIN_Y_GAP / 2;
          b.labelY = mid + MIN_Y_GAP / 2;
        } else {
          b.labelY = mid - MIN_Y_GAP / 2;
          a.labelY = mid + MIN_Y_GAP / 2;
        }
      }
    }
  }

  labels.forEach(({ city, idx, x, y, info, isLeft, labelY }) => {
    const temp = info && info.temp != null ? info.temp + "\u00B0" : "--\u00B0";
    const emoji = info ? (WEATHER_EMOJI[info.icon] || "") : "";

    if (info && info.temp != null) {
      cityTemps.push({ name: city.name, temp: info.temp, icon: info.icon });
      if (!hottest || info.temp > hottest.temp) hottest = { name: city.name, temp: info.temp };
      if (!coldest || info.temp < coldest.temp) coldest = { name: city.name, temp: info.temp };
    }

    const textAnchor = isLeft ? "end" : "start";
    const tdx = isLeft ? -8 : 8;
    const emojiDx = isLeft ? tdx - 14 : tdx + (temp.length * 6 + 2);

    content += `
      <g class="svg-marker" data-idx="${idx}">
        <circle class="marker-dot-glow" cx="${x}" cy="${y}" r="14"/>
        <circle class="marker-dot-outer" cx="${x}" cy="${y}" r="7"/>
        <circle class="marker-dot-inner" cx="${x}" cy="${y}" r="3"/>
        <text class="marker-temp-text" x="${x + tdx}" y="${labelY - 3}" text-anchor="${textAnchor}">${temp}</text>
        <text class="marker-emoji" x="${x + emojiDx}" y="${labelY - 3}" font-size="10" text-anchor="${textAnchor}">${emoji}</text>
        <text class="marker-name-text" x="${x + tdx}" y="${labelY + 7}" text-anchor="${textAnchor}">${city.name}</text>
      </g>`;
  });

  svg.innerHTML = content;

  // Attach click handlers
  svg.querySelectorAll(".svg-marker").forEach(g => {
    g.addEventListener("click", () => zoomToCity(parseInt(g.dataset.idx)));
  });

  // Render summary chips
  const summary = document.getElementById("mapSummary");
  if (summary && cityTemps.length > 0) {
    const avg = Math.round(cityTemps.reduce((s, c) => s + c.temp, 0) / cityTemps.length);
    const rainyCount = cityTemps.filter(c => ["rain", "rain-heavy", "drizzle", "thunder"].includes(c.icon)).length;
    let chips = "";
    if (hottest) chips += `<div class="map-summary-chip chip-hot"><span class="chip-icon">\u{1F525}</span>${hottest.name} <span class="chip-val">${hottest.temp}\u00B0</span></div>`;
    if (coldest) chips += `<div class="map-summary-chip chip-cold"><span class="chip-icon">\u{1F9CA}</span>${coldest.name} <span class="chip-val">${coldest.temp}\u00B0</span></div>`;
    chips += `<div class="map-summary-chip"><span class="chip-icon">\u{1F321}\uFE0F</span>Avg <span class="chip-val">${avg}\u00B0</span></div>`;
    if (rainyCount > 0) chips += `<div class="map-summary-chip"><span class="chip-icon">\u{1F327}\uFE0F</span><span class="chip-val">${rainyCount}</span> rain</div>`;
    chips += `<div class="map-summary-chip"><span class="chip-icon">\u{1F4CD}</span><span class="chip-val">${CITIES.length}</span> cities</div>`;
    summary.innerHTML = chips;
  }
}

/* ── Map Pinch-Zoom & Pan ─────────────────────────── */

function setupMapZoom() {
  const container = document.getElementById("mapContainer");
  const svg = document.getElementById("indiaSvg");

  let scale = 1, panX = 0, panY = 0;
  let startDist = 0, startScale = 1;
  let startX = 0, startY = 0, startPanX = 0, startPanY = 0;
  let isPanning = false;
  const MIN_SCALE = 1, MAX_SCALE = 5;

  function applyTransform() {
    // Clamp pan so map doesn't go off screen
    const rect = container.getBoundingClientRect();
    const maxPanX = (rect.width * (scale - 1)) / 2;
    const maxPanY = (rect.height * (scale - 1)) / 2;
    panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
    panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
    svg.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    svg.style.transformOrigin = "center center";
  }

  function getDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  container.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      startDist = getDist(e.touches);
      startScale = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      isPanning = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startPanX = panX;
      startPanY = panY;
    }
  }, { passive: false });

  container.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = getDist(e.touches);
      scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, startScale * (dist / startDist)));
      if (scale <= 1) { panX = 0; panY = 0; }
      applyTransform();
    } else if (e.touches.length === 1 && isPanning && scale > 1) {
      e.preventDefault();
      panX = startPanX + (e.touches[0].clientX - startX);
      panY = startPanY + (e.touches[0].clientY - startY);
      applyTransform();
    }
  }, { passive: false });

  container.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) {
      isPanning = false;
    }
    // Snap back to 1x if close
    if (scale < 1.1) {
      scale = 1; panX = 0; panY = 0;
      applyTransform();
    }
  });

  // Mouse wheel zoom for desktop
  container.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * delta));
    if (scale <= 1) { panX = 0; panY = 0; }
    applyTransform();
  }, { passive: false });

  // Double-tap to reset
  let lastTap = 0;
  container.addEventListener("touchend", (e) => {
    if (e.touches.length > 0) return;
    const now = Date.now();
    if (now - lastTap < 300) {
      scale = 1; panX = 0; panY = 0;
      applyTransform();
    }
    lastTap = now;
  });
}

/* ── Zoom-to-City Animation ───────────────────────── */

function zoomToCity(idx) {
  if (isZooming) return;
  isZooming = true;
  currentCityIdx = idx;
  navigatedFrom = "map";

  const city = CITIES[idx];
  const { xPct, yPct } = latLonToPercent(city.lat, city.lon);
  const container = document.getElementById("mapContainer");

  // Set transform-origin to the city's position
  container.style.transformOrigin = `${xPct}% ${yPct}%`;

  // Apply zoom + blur
  container.classList.add("zooming");
  container.style.transform = "scale(12)";

  // After zoom animation, show detail view
  setTimeout(() => {
    renderCity(idx);
    document.getElementById("backLabel").textContent = "Map";
    document.getElementById("mapView").classList.add("hidden");
    const dv = document.getElementById("detailView");
    dv.scrollTop = 0;
    dv.classList.add("visible");
    isZooming = false;
  }, 700);
}

/* ── Cities List (Tab 2) ──────────────────────────── */

function getCityCurrentData(city) {
  const data = cityDataMap[city.name];
  if (!data) return null;

  const today = todayStr();
  const nowHour = nowHourIST();
  const todayDaily = data.daily.find(d => d.date === today);

  let currentTemp = null;
  let currentCode = 0;

  const nearestHourly = data.hourly.find(h => {
    const hDate = h.time.slice(0, 10);
    const hHour = parseInt(h.time.slice(11, 13), 10);
    return hDate === today && hHour === nowHour;
  });

  if (nearestHourly) {
    currentTemp = Math.round(nearestHourly.temp);
    currentCode = nearestHourly.code;
  } else if (todayDaily) {
    currentTemp = Math.round((todayDaily.max + todayDaily.min) / 2);
    currentCode = todayDaily.code;
  }

  return {
    temp: currentTemp,
    code: currentCode,
    high: todayDaily ? Math.round(todayDaily.max) : null,
    low: todayDaily ? Math.round(todayDaily.min) : null,
    desc: getWeatherInfo(currentCode).desc,
    icon: getWeatherInfo(currentCode).icon,
  };
}

function renderCitiesList(filter) {
  const container = document.getElementById("citiesList");
  const query = (filter != null ? filter : document.getElementById("citySearch").value).trim().toLowerCase();

  const filtered = CITIES.map((city, idx) => ({ city, idx }))
    .filter(({ city }) => city.name.toLowerCase().includes(query));

  if (filtered.length === 0) {
    container.innerHTML = `<div class="cities-empty">No cities match "${query}"</div>`;
    return;
  }

  const CARD_COLORS = {
    sun: "#fbbf24", "cloud-sun": "#f59e0b", cloud: "#94a3b8",
    fog: "#94a3b8", drizzle: "#60a5fa", rain: "#3b82f6",
    "rain-heavy": "#2563eb", snow: "#93c5fd", thunder: "#a78bfa",
  };

  container.innerHTML = "";
  filtered.forEach(({ city, idx }) => {
    const info = getCityCurrentData(city);
    const card = document.createElement("div");
    card.className = "city-card";
    const accentColor = info ? (CARD_COLORS[info.icon] || "rgba(255,255,255,0.08)") : "rgba(255,255,255,0.08)";
    card.style.setProperty("--card-accent", accentColor);
    card.addEventListener("click", () => openCityFromList(idx));

    const iconHtml = info ? weatherSVGSmall(info.icon, 36) : weatherSVGSmall("cloud", 36);
    const tempStr = info && info.temp != null ? info.temp + "°" : "--°";
    const desc = info ? info.desc : "Loading...";
    const rangeHtml = info && info.high != null
      ? `<span class="hi">${info.high}°</span> / <span class="lo">${info.low}°</span>`
      : "--";

    card.innerHTML = `
      <div class="city-card-icon">${iconHtml}</div>
      <div class="city-card-info">
        <div class="city-card-name">${city.name}</div>
        <div class="city-card-desc">${desc}</div>
      </div>
      <div class="city-card-temps">
        <div class="city-card-current">${tempStr}</div>
        <div class="city-card-range">${rangeHtml}</div>
      </div>
    `;
    container.appendChild(card);
  });
}

/* ── Add City Feature ─────────────────────────────── */

function loadCustomCities() {
  try {
    const saved = localStorage.getItem("customCities");
    if (saved) {
      const custom = JSON.parse(saved);
      custom.forEach(c => {
        if (!CITIES.find(existing => existing.name === c.name)) {
          CITIES.push(c);
        }
      });
    }
  } catch (e) {}
}

function saveCustomCities() {
  // Save only user-added cities (those not in the original 14)
  const origNames = [
    "Bikaner","Ludhiana","Amritsar","Kota","Rajkot","Nadiad",
    "Nagpur","Indore","Lalitpur","Shahjahanpur","Gonda",
    "Begusarai","Hajipur","Kolkata"
  ];
  const custom = CITIES.filter(c => !origNames.includes(c.name));
  localStorage.setItem("customCities", JSON.stringify(custom));
}

let addCityTimer = null;

function openAddCityModal() {
  document.getElementById("addCityModal").classList.add("open");
  document.getElementById("addCitySearch").value = "";
  document.getElementById("addCityResults").innerHTML =
    '<p class="add-city-hint">Type a city name to search</p>';
  setTimeout(() => document.getElementById("addCitySearch").focus(), 100);
}

function closeAddCityModal() {
  document.getElementById("addCityModal").classList.remove("open");
}

async function searchGeoCity(query) {
  if (query.length < 2) {
    document.getElementById("addCityResults").innerHTML =
      '<p class="add-city-hint">Type a city name to search</p>';
    return;
  }

  document.getElementById("addCityResults").innerHTML =
    '<p class="add-city-hint">Searching...</p>';

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
    const res = await fetch(url);
    const data = await res.json();

    const container = document.getElementById("addCityResults");
    if (!data.results || data.results.length === 0) {
      container.innerHTML = '<p class="add-city-hint">No cities found</p>';
      return;
    }

    container.innerHTML = "";
    data.results.forEach(r => {
      const exists = CITIES.find(c => c.name === r.name && Math.abs(c.lat - r.latitude) < 0.5);
      const div = document.createElement("div");
      div.className = "add-city-result" + (exists ? " already" : "");

      const region = [r.admin1, r.country].filter(Boolean).join(", ");
      div.innerHTML = `
        <div class="add-city-result-info">
          <div class="add-city-result-name">${r.name}</div>
          <div class="add-city-result-country">${region}</div>
        </div>
        <div class="add-city-result-add">${exists ? "Added" : "Add"}</div>
      `;

      if (!exists) {
        div.addEventListener("click", () => addNewCity(r));
      }
      container.appendChild(div);
    });
  } catch (e) {
    document.getElementById("addCityResults").innerHTML =
      '<p class="add-city-hint">Search failed. Try again.</p>';
  }
}

async function addNewCity(geoResult) {
  const newCity = {
    name: geoResult.name,
    lat: geoResult.latitude,
    lon: geoResult.longitude,
    anchor: geoResult.longitude > 78 ? "r" : "l",
  };

  CITIES.push(newCity);
  saveCustomCities();

  // Fetch weather data for the new city
  try {
    const [historical, forecast] = await Promise.all([
      fetchHistorical(newCity),
      fetchForecast(newCity),
    ]);
    const daily = mergeDailyData(historical, forecast);
    const hourly = extractHourly(forecast);
    cityDataMap[newCity.name] = { daily, hourly };
  } catch (err) {
    cityDataMap[newCity.name] = { daily: [], hourly: [] };
  }

  // Refresh map and close modal
  renderMap();
  closeAddCityModal();
  renderCitiesList();
}

function openCityFromList(idx) {
  currentCityIdx = idx;
  navigatedFrom = "cities";
  renderCity(idx);
  document.getElementById("backLabel").textContent = "Cities";
  const dv = document.getElementById("detailView");
  dv.classList.remove("from-map");
  dv.classList.add("visible");
}

/* ── News (Tab 3) ─────────────────────────────────── */

async function loadNews() {
  const container = document.getElementById("newsList");
  try {
    const rssUrl = encodeURIComponent(
      "https://news.google.com/rss/search?q=india+weather+OR+monsoon+OR+cyclone+OR+IMD&hl=en-IN&gl=IN&ceid=IN:en"
    );
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error("RSS fetch failed");
    const data = await res.json();

    if (!data.items || data.items.length === 0) throw new Error("No articles");

    container.innerHTML = "";

    // Group articles by date
    const grouped = {};
    data.items.slice(0, 15).forEach(item => {
      const d = new Date(item.pubDate);
      const key = d.toISOString().slice(0, 10);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    const newsIcons = [
      `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>`,
      `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>`,
      `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>`,
      `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>`,
    ];

    Object.keys(grouped).sort().reverse().forEach(dateKey => {
      const dateLabel = formatNewsDate(dateKey);
      const header = document.createElement("div");
      header.className = "news-date-header";
      header.textContent = dateLabel;
      container.appendChild(header);

      grouped[dateKey].forEach((item, i) => {
        const a = document.createElement("a");
        a.className = "news-card";
        a.href = item.link;
        a.target = "_blank";
        a.rel = "noopener noreferrer";

        const iconIdx = i % newsIcons.length;
        const thumbHtml = item.thumbnail
          ? `<img src="${item.thumbnail}" alt="" loading="lazy">`
          : `<div class="news-thumb-placeholder">${newsIcons[iconIdx]}</div>`;

        const source = item.author || (item.title.match(/- (.+)$/) || [])[1] || "News";
        const cleanTitle = item.title.replace(/ - [^-]+$/, "");

        a.innerHTML = `
          <div class="news-thumb">${thumbHtml}</div>
          <div class="news-body">
            <div class="news-card-title">${cleanTitle}</div>
            <div class="news-meta">
              <span class="news-source">${source}</span>
              <span>${getTimeAgo(item.pubDate)}</span>
            </div>
          </div>
        `;
        container.appendChild(a);
      });
    });
  } catch (err) {
    console.error("News load error:", err);
    renderNewsFallback(container);
  }
}

function renderNewsFallback(container) {
  container.innerHTML = `
    <div class="news-fallback">
      <div class="news-fallback-title">Could not load news. Try these sources:</div>
      <a class="news-fallback-link" href="https://mausam.imd.gov.in/" target="_blank" rel="noopener">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        IMD — India Meteorological Dept
      </a>
      <a class="news-fallback-link" href="https://www.skymetweather.com/" target="_blank" rel="noopener">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        Skymet Weather
      </a>
      <a class="news-fallback-link" href="https://weather.com/en-IN" target="_blank" rel="noopener">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        Weather.com India
      </a>
    </div>
  `;
}

/* ── Back Navigation ──────────────────────────────── */

function backFromDetail() {
  document.getElementById("detailView").classList.remove("visible");
  closeChartOverlay();

  if (navigatedFrom === "cities") {
    // Just hide detail, cities tab is already visible
    return;
  }

  // Default: back to map with zoom-out
  const container = document.getElementById("mapContainer");
  setTimeout(() => {
    document.getElementById("mapView").classList.remove("hidden");
    requestAnimationFrame(() => {
      container.classList.remove("zooming");
      container.style.transform = "";
    });
  }, 300);
}

/* ── City Detail Rendering ─────────────────────────── */

function renderCity(idx) {
  currentCityIdx = idx;
  const city = CITIES[idx];
  const data = cityDataMap[city.name];
  if (!data) return;

  const { daily, hourly } = data;
  const today = todayStr();
  const todayDaily = daily.find(d => d.date === today);
  const nowHour = nowHourIST();

  // City name + date
  document.getElementById("cityName").innerHTML =
    `${city.name}, <span>India</span>`;
  document.getElementById("detailDate").textContent = formatFullDate(today);

  // Current temp
  let currentTemp = "--";
  let currentCode = 0;
  let currentWind = "--";
  let currentHumidity = "--";
  let sunshineHrs = "--";

  const nearestHourly = hourly.find(h => {
    const hDate = h.time.slice(0, 10);
    const hHour = parseInt(h.time.slice(11, 13), 10);
    return hDate === today && hHour === nowHour;
  });

  if (nearestHourly) {
    currentTemp = Math.round(nearestHourly.temp);
    currentCode = nearestHourly.code;
    currentWind = nearestHourly.wind != null ? nearestHourly.wind + "km/hr" : "--";
    currentHumidity = nearestHourly.humidity != null ? nearestHourly.humidity + "%" : "--";
  } else if (todayDaily) {
    currentTemp = Math.round((todayDaily.max + todayDaily.min) / 2);
    currentCode = todayDaily.code;
  }

  if (todayDaily?.sunshine != null) {
    sunshineHrs = Math.round(todayDaily.sunshine / 3600) + "hr";
  }

  const weatherInfo = getWeatherInfo(currentCode);

  // Weather icon
  const iconWrap = document.getElementById("weatherIconWrap");
  iconWrap.innerHTML = weatherSVG(weatherInfo.icon);
  iconWrap.style.animation = "none";
  void iconWrap.offsetHeight;
  iconWrap.style.animation = "heroIn 0.6s ease-out";

  // Icon drop shadow
  const svgEl = iconWrap.querySelector("svg");
  if (svgEl) {
    const isWarm = ["sun", "cloud-sun"].includes(weatherInfo.icon);
    svgEl.style.filter = isWarm
      ? "drop-shadow(0 8px 32px rgba(249, 150, 80, 0.35))"
      : "drop-shadow(0 8px 32px rgba(96, 165, 250, 0.25))";
  }

  // Temperature
  document.getElementById("tempValue").textContent = currentTemp;

  // Description
  const descEl = document.getElementById("weatherDesc");
  const todayMaxMin = todayDaily
    ? `High ${Math.round(todayDaily.max)}° / Low ${Math.round(todayDaily.min)}°`
    : "";
  descEl.textContent = weatherInfo.desc + (todayMaxMin ? ". " + todayMaxMin : "");

  // Stats
  document.getElementById("windSpeed").textContent = currentWind;
  document.getElementById("humidity").textContent = currentHumidity;
  document.getElementById("sunHours").textContent = sunshineHrs;

  // Ambient glow
  const detailView = document.getElementById("detailView");
  const isWarm = currentTemp !== "--" && currentTemp > 28;
  detailView.style.setProperty(
    "--warm-glow",
    isWarm
      ? "rgba(249, 150, 80, 0.25)"
      : "rgba(96, 165, 250, 0.15)"
  );

  // Hourly forecast
  renderHourly(hourly, today, nowHour);

  // Daily forecast
  renderDaily(daily);
}

function renderHourly(hourly, today, nowHour) {
  const container = document.getElementById("hourlyScroll");
  container.innerHTML = "";

  const startIdx = hourly.findIndex(h => {
    const hDate = h.time.slice(0, 10);
    const hHour = parseInt(h.time.slice(11, 13), 10);
    return hDate === today && hHour >= nowHour;
  });

  if (startIdx === -1) return;

  const hours = hourly.slice(startIdx, startIdx + 24);
  hours.forEach((h, i) => {
    const hHour = parseInt(h.time.slice(11, 13), 10);
    const info = getWeatherInfo(h.code);
    const card = document.createElement("div");
    card.className = "hourly-card" + (i === 0 ? " now" : "");
    card.innerHTML = `
      <span class="hourly-time">${i === 0 ? "Now" : formatHour(hHour)}</span>
      <span class="hourly-icon">${weatherSVGSmall(info.icon, 32)}</span>
      <span class="hourly-temp">${Math.round(h.temp)}°</span>
    `;
    container.appendChild(card);
  });
}

function renderDaily(daily) {
  const container = document.getElementById("dailyList");
  container.innerHTML = "";

  const today = todayStr();
  const futureDays = daily.filter(d => d.date >= today).slice(0, 7);

  const allMin = Math.min(...futureDays.map(d => d.min));
  const allMax = Math.max(...futureDays.map(d => d.max));
  const range = allMax - allMin || 1;

  futureDays.forEach(d => {
    const info = getWeatherInfo(d.code);
    const left = ((d.min - allMin) / range) * 100;
    const width = ((d.max - d.min) / range) * 100;

    const row = document.createElement("div");
    row.className = "daily-row";
    row.innerHTML = `
      <span class="daily-day">${formatDay(d.date)}</span>
      <span class="daily-icon">${weatherSVGSmall(info.icon, 24)}</span>
      <div class="daily-bar-wrap">
        <span class="daily-min">${Math.round(d.min)}°</span>
        <div class="daily-bar">
          <div class="daily-bar-fill" style="left:${left}%;width:${Math.max(width, 5)}%"></div>
        </div>
        <span class="daily-max">${Math.round(d.max)}°</span>
      </div>
    `;
    container.appendChild(row);
  });
}

/* ── Chart Overlay ─────────────────────────────────── */

function getChartDateRange(daily, range) {
  const today = todayStr();
  let startDate, endDate;

  switch (range) {
    case "3d":
      startDate = daysAgo(3);
      endDate = daysFromNow(3);
      break;
    case "7d":
      startDate = daysAgo(7);
      endDate = daysFromNow(7);
      break;
    case "1m":
      startDate = daysAgo(30);
      endDate = daysFromNow(16);
      break;
    case "3m":
      startDate = daysAgo(90);
      endDate = daysFromNow(16);
      break;
    default: // "all"
      return daily;
  }

  return daily.filter(d => d.date >= startDate && d.date <= endDate);
}

function applyPredictionFilter(daily, todayStr, pred) {
  switch (pred) {
    case "historical":
      return daily.filter(d => d.date < todayStr);
    case "forecast":
      return daily.filter(d => d.date >= todayStr);
    default: // "both"
      return daily;
  }
}

function openChartOverlay() {
  const city = CITIES[currentCityIdx];
  const data = cityDataMap[city.name];
  if (!data) return;

  document.getElementById("chartTitle").textContent = city.name + " — Temperature";
  document.getElementById("chartBackLabel").textContent = city.name;
  document.getElementById("chartOverlay").classList.add("open");

  // Reset filter states
  activeChartRange = "all";
  activeChartPred = "both";
  updateFilterButtonStates();

  renderChart();
}

/* Weather-based chart color palettes */
const CHART_PALETTES = {
  sun:     { max: "#f97066", min: "#fbbf24", fill: "rgba(249,112,102,0.10)", fillMin: "rgba(251,191,36,0.08)", accent: "rgba(249,150,80,0.4)" },
  "cloud-sun": { max: "#f97066", min: "#60a5fa", fill: "rgba(249,112,102,0.08)", fillMin: "rgba(96,165,250,0.06)", accent: "rgba(200,160,80,0.3)" },
  cloud:   { max: "#94a3b8", min: "#64748b", fill: "rgba(148,163,184,0.08)", fillMin: "rgba(100,116,139,0.06)", accent: "rgba(148,163,184,0.25)" },
  rain:    { max: "#60a5fa", min: "#3b82f6", fill: "rgba(96,165,250,0.10)", fillMin: "rgba(59,130,246,0.08)", accent: "rgba(59,130,246,0.3)" },
  "rain-heavy": { max: "#3b82f6", min: "#2563eb", fill: "rgba(59,130,246,0.12)", fillMin: "rgba(37,99,235,0.08)", accent: "rgba(37,99,235,0.35)" },
  drizzle: { max: "#60a5fa", min: "#93c5fd", fill: "rgba(96,165,250,0.08)", fillMin: "rgba(147,197,253,0.06)", accent: "rgba(96,165,250,0.25)" },
  thunder: { max: "#a78bfa", min: "#7c3aed", fill: "rgba(167,139,250,0.10)", fillMin: "rgba(124,58,237,0.08)", accent: "rgba(124,58,237,0.3)" },
  snow:    { max: "#e2e8f0", min: "#93c5fd", fill: "rgba(226,232,240,0.08)", fillMin: "rgba(147,197,253,0.06)", accent: "rgba(147,197,253,0.25)" },
  fog:     { max: "#94a3b8", min: "#cbd5e1", fill: "rgba(148,163,184,0.06)", fillMin: "rgba(203,213,225,0.05)", accent: "rgba(148,163,184,0.2)" },
  default: { max: "#f97066", min: "#60a5fa", fill: "rgba(249,112,102,0.08)", fillMin: "rgba(96,165,250,0.06)", accent: "rgba(78,168,245,0.2)" },
};

function getChartPalette(cityName) {
  const data = cityDataMap[cityName];
  if (!data) return CHART_PALETTES.default;
  const today = todayStr();
  const todayDaily = data.daily.find(d => d.date === today);
  if (!todayDaily) return CHART_PALETTES.default;
  const icon = getWeatherInfo(todayDaily.code).icon;
  return CHART_PALETTES[icon] || CHART_PALETTES.default;
}

/* "Today" vertical line plugin — stores index on the chart instance */
let _chartTodayIdx = -1;

const todayLinePlugin = {
  id: "todayLine",
  afterDraw(chart) {
    if (_chartTodayIdx == null || _chartTodayIdx < 0) return;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    const x = xScale.getPixelForValue(_chartTodayIdx);
    if (x < xScale.left || x > xScale.right) return;

    const ctx = chart.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.moveTo(x, yScale.top);
    ctx.lineTo(x, yScale.bottom);
    ctx.stroke();

    // "Today" label
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "500 9px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Today", x, yScale.top - 6);
    ctx.restore();
  },
};

// Register globally so it runs for all charts
Chart.register(todayLinePlugin);

function renderChart() {
  const city = CITIES[currentCityIdx];
  const data = cityDataMap[city.name];
  if (!data) return;

  if (historyChart) {
    historyChart.destroy();
    historyChart = null;
  }

  const today = todayStr();
  let daily = getChartDateRange(data.daily, activeChartRange);
  daily = applyPredictionFilter(daily, today, activeChartPred);

  if (daily.length === 0) return;

  const canvas = document.getElementById("historyChart");
  const ctx = canvas.getContext("2d");
  const todayIdx = daily.findIndex(d => d.date >= today);
  _chartTodayIdx = todayIdx;
  const labels = daily.map(d => formatLabel(d.date));
  const maxTemps = daily.map(d => d.max);
  const minTemps = daily.map(d => d.min);
  const palette = getChartPalette(city.name);

  // Gradient fills
  const maxGrad = ctx.createLinearGradient(0, 0, 0, 300);
  maxGrad.addColorStop(0, palette.fill);
  maxGrad.addColorStop(1, "transparent");

  const minGrad = ctx.createLinearGradient(0, 0, 0, 300);
  minGrad.addColorStop(0, palette.fillMin);
  minGrad.addColorStop(1, "transparent");

  const segmentStyle = (borderDash) => ({
    segment: {
      borderDash: c =>
        todayIdx >= 0 && c.p0DataIndex >= todayIdx - 1 ? borderDash : undefined,
    },
  });

  const chartConfig = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Max",
          data: maxTemps,
          borderColor: palette.max,
          backgroundColor: maxGrad,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: palette.max,
          tension: 0.35,
          fill: true,
          ...segmentStyle([5, 4]),
        },
        {
          label: "Min",
          data: minTemps,
          borderColor: palette.min,
          backgroundColor: minGrad,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: palette.min,
          tension: 0.35,
          fill: true,
          ...segmentStyle([5, 4]),
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(15,17,24,0.92)",
          titleColor: "#e4e4e7",
          bodyColor: "#a1a1aa",
          borderColor: "rgba(255,255,255,0.08)",
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
          displayColors: true,
          usePointStyle: true,
          callbacks: {
            label: c => {
              const val = c.parsed.y;
              return ` ${c.dataset.label}: ${val != null ? val.toFixed(1) + "°C" : "N/A"}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "rgba(255,255,255,0.3)",
            font: { size: 10, family: "DM Sans" },
            maxTicksLimit: 7,
            maxRotation: 0,
          },
          grid: { color: "rgba(255,255,255,0.03)", drawBorder: false },
        },
        y: {
          ticks: {
            color: "rgba(255,255,255,0.3)",
            font: { size: 10, family: "DM Sans" },
            callback: v => v + "°",
            padding: 8,
          },
          grid: { color: "rgba(255,255,255,0.03)", drawBorder: false },
        },
      },
      animation: { duration: 500, easing: "easeOutQuart" },
    },
  };

  historyChart = new Chart(canvas, chartConfig);
}

function updateFilterButtonStates() {
  // Date range buttons
  document.querySelectorAll(".chart-filter-btn[data-range]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.range === activeChartRange);
  });
  // Prediction buttons
  document.querySelectorAll(".chart-filter-btn[data-pred]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.pred === activeChartPred);
  });
}

function closeChartOverlay() {
  document.getElementById("chartOverlay").classList.remove("open");
}

/* ── Navigation ────────────────────────────────────── */

function setupNav() {
  // Back button
  document.getElementById("backBtn").addEventListener("click", backFromDetail);

  // Chart button in detail view
  document.getElementById("chartBtnDetail").addEventListener("click", openChartOverlay);

  // Chart close
  document.getElementById("chartClose").addEventListener("click", closeChartOverlay);

  // Tab bar buttons
  document.querySelectorAll(".tab-bar-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // City search
  document.getElementById("citySearch").addEventListener("input", (e) => {
    renderCitiesList(e.target.value);
  });

  // Add city
  document.getElementById("addCityBtn").addEventListener("click", openAddCityModal);
  document.getElementById("addCityClose").addEventListener("click", closeAddCityModal);
  document.getElementById("addCityModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeAddCityModal();
  });
  document.getElementById("addCitySearch").addEventListener("input", (e) => {
    clearTimeout(addCityTimer);
    addCityTimer = setTimeout(() => searchGeoCity(e.target.value.trim()), 350);
  });

  // Chart filter buttons — date range
  document.querySelectorAll(".chart-filter-btn[data-range]").forEach(btn => {
    btn.addEventListener("click", () => {
      activeChartRange = btn.dataset.range;
      updateFilterButtonStates();
      renderChart();
    });
  });

  // Chart filter buttons — prediction
  document.querySelectorAll(".chart-filter-btn[data-pred]").forEach(btn => {
    btn.addEventListener("click", () => {
      activeChartPred = btn.dataset.pred;
      updateFilterButtonStates();
      renderChart();
    });
  });
}

/* ── Init ──────────────────────────────────────────── */

async function loadAllCities() {
  const loadingBar = document.getElementById("loadingBar");
  let loaded = 0;
  const total = CITIES.length;

  const promises = CITIES.map(async city => {
    try {
      const [historical, forecast] = await Promise.all([
        fetchHistorical(city),
        fetchForecast(city),
      ]);
      const daily = mergeDailyData(historical, forecast);
      const hourly = extractHourly(forecast);
      cityDataMap[city.name] = { daily, hourly };
    } catch (err) {
      console.error(`Error loading ${city.name}:`, err);
      cityDataMap[city.name] = { daily: [], hourly: [] };
    } finally {
      loaded++;
      loadingBar.style.width = Math.round((loaded / total) * 100) + "%";
    }
  });

  await Promise.all(promises);
}

async function init() {
  loadCustomCities();
  await loadAllCities();

  // Hide loading screen
  document.getElementById("loadingScreen").classList.add("hidden");

  // Set today's date
  document.getElementById("mapDate").textContent = formatFullDate(todayStr());

  // Render map with city markers
  renderMap();

  // Setup map pinch-zoom & pan
  setupMapZoom();

  // Setup navigation
  setupNav();
}

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

init();
