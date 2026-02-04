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

function formatTimeIST(isoStr) {
  if (!isoStr) return "--";
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getUVLevel(uv) {
  if (uv == null) return { label: "UV --", cls: "" };
  const v = Math.round(uv);
  if (v <= 2) return { label: `UV ${v}`, cls: "uv-low" };
  if (v <= 5) return { label: `UV ${v}`, cls: "uv-moderate" };
  if (v <= 7) return { label: `UV ${v}`, cls: "uv-high" };
  if (v <= 10) return { label: `UV ${v}`, cls: "uv-very-high" };
  return { label: `UV ${v}`, cls: "uv-extreme" };
}

function getAQILevel(aqi) {
  if (aqi == null) return { label: "AQI --", cls: "" };
  if (aqi <= 50) return { label: `AQI ${aqi}`, cls: "aqi-good" };
  if (aqi <= 100) return { label: `AQI ${aqi}`, cls: "aqi-fair" };
  if (aqi <= 150) return { label: `AQI ${aqi}`, cls: "aqi-moderate" };
  if (aqi <= 200) return { label: `AQI ${aqi}`, cls: "aqi-poor" };
  return { label: `AQI ${aqi}`, cls: "aqi-very-poor" };
}

function degreesToCompass(deg) {
  if (deg == null) return "";
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
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
    `&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,precipitation_hours,sunshine_duration,wind_speed_10m_max,wind_gusts_10m_max` +
    `&timezone=Asia%2FKolkata`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Historical API ${res.status}`);
  return res.json();
}

async function fetchForecast(city) {
  const url =
    `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${city.lat}&longitude=${city.lon}` +
    `&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,wind_direction_10m,apparent_temperature,dew_point_2m,pressure_msl,cloud_cover,wind_gusts_10m,is_day` +
    `&daily=temperature_2m_max,temperature_2m_min,weather_code,sunshine_duration,precipitation_sum,precipitation_probability_max,sunrise,sunset,uv_index_max,precipitation_hours,daylight_duration,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,apparent_temperature_max,apparent_temperature_min` +
    `&hourly=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,precipitation_probability,precipitation,apparent_temperature,dew_point_2m,visibility,wind_direction_10m,wind_gusts_10m,cloud_cover,is_day,cape,pressure_msl` +
    `&timezone=Asia%2FKolkata&forecast_days=16&past_days=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Forecast API ${res.status}`);
  return res.json();
}

async function fetchAirQuality(city) {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?` +
    `latitude=${city.lat}&longitude=${city.lon}` +
    `&current=european_aqi,us_aqi,pm10,pm2_5,nitrogen_dioxide,ozone,dust,carbon_monoxide,sulphur_dioxide` +
    `&hourly=us_aqi,pm2_5,pm10` +
    `&timezone=Asia%2FKolkata&forecast_days=2`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`AQI API ${res.status}`);
  return res.json();
}

async function fetchFloodRisk(city) {
  const url =
    `https://flood-api.open-meteo.com/v1/flood?` +
    `latitude=${city.lat}&longitude=${city.lon}` +
    `&daily=river_discharge,river_discharge_mean,river_discharge_max&forecast_days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Flood API ${res.status}`);
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
        sunshine: historical.daily.sunshine_duration?.[i] ?? null,
        precip: historical.daily.precipitation_sum?.[i] ?? null,
        precipHours: historical.daily.precipitation_hours?.[i] ?? null,
        precipProb: null,
        sunrise: null,
        sunset: null,
        uvIndex: null,
        daylightDuration: null,
        windMax: historical.daily.wind_speed_10m_max?.[i] ?? null,
        gustsMax: historical.daily.wind_gusts_10m_max?.[i] ?? null,
        windDir: null,
        feelsLikeMax: null,
        feelsLikeMin: null,
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
          precip: forecast.daily.precipitation_sum?.[i] ?? null,
          precipHours: forecast.daily.precipitation_hours?.[i] ?? null,
          precipProb: forecast.daily.precipitation_probability_max?.[i] ?? null,
          sunrise: forecast.daily.sunrise?.[i] ?? null,
          sunset: forecast.daily.sunset?.[i] ?? null,
          uvIndex: forecast.daily.uv_index_max?.[i] ?? null,
          daylightDuration: forecast.daily.daylight_duration?.[i] ?? null,
          windMax: forecast.daily.wind_speed_10m_max?.[i] ?? null,
          gustsMax: forecast.daily.wind_gusts_10m_max?.[i] ?? null,
          windDir: forecast.daily.wind_direction_10m_dominant?.[i] ?? null,
          feelsLikeMax: forecast.daily.apparent_temperature_max?.[i] ?? null,
          feelsLikeMin: forecast.daily.apparent_temperature_min?.[i] ?? null,
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
    precipProb: forecast.hourly.precipitation_probability?.[i] ?? null,
    precip: forecast.hourly.precipitation?.[i] ?? null,
    feelsLike: forecast.hourly.apparent_temperature?.[i] ?? null,
    dewPoint: forecast.hourly.dew_point_2m?.[i] ?? null,
    visibility: forecast.hourly.visibility?.[i] ?? null,
    windDir: forecast.hourly.wind_direction_10m?.[i] ?? null,
    gusts: forecast.hourly.wind_gusts_10m?.[i] ?? null,
    cloudCover: forecast.hourly.cloud_cover?.[i] ?? null,
    isDay: forecast.hourly.is_day?.[i] ?? null,
    cape: forecast.hourly.cape?.[i] ?? null,
    pressure: forecast.hourly.pressure_msl?.[i] ?? null,
  }));
}

function extractAqiHourly(aqiData) {
  if (!aqiData?.hourly?.time) return [];
  return aqiData.hourly.time.map((t, i) => ({
    time: t,
    usAqi: aqiData.hourly.us_aqi?.[i] ?? null,
    pm25: aqiData.hourly.pm2_5?.[i] ?? null,
    pm10: aqiData.hourly.pm10?.[i] ?? null,
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
let activeMapMode = "default";

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

/* ── Map Overlay Helpers ──────────────────────────── */

function lerpColor(a, b, t) {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 255, ag = (ah >> 8) & 255, ab = ah & 255;
  const br = (bh >> 16) & 255, bg = (bh >> 8) & 255, bb = bh & 255;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr},${rg},${rb})`;
}

function interpolateColor(value, stops) {
  if (value <= stops[0].val) return stops[0].color;
  if (value >= stops[stops.length - 1].val) return stops[stops.length - 1].color;
  for (let i = 0; i < stops.length - 1; i++) {
    if (value >= stops[i].val && value <= stops[i + 1].val) {
      const t = (value - stops[i].val) / (stops[i + 1].val - stops[i].val);
      return lerpColor(stops[i].color, stops[i + 1].color, t);
    }
  }
  return stops[stops.length - 1].color;
}

const COLOR_SCALES = {
  temp: [
    { val: 15, color: "#3b82f6" },
    { val: 20, color: "#22c55e" },
    { val: 30, color: "#eab308" },
    { val: 35, color: "#f97316" },
    { val: 40, color: "#ef4444" },
  ],
  aqi: [
    { val: 0, color: "#22c55e" },
    { val: 50, color: "#eab308" },
    { val: 100, color: "#f97316" },
    { val: 150, color: "#ef4444" },
    { val: 200, color: "#a855f7" },
  ],
  rain: [
    { val: 0, color: "#1e3a5f" },
    { val: 1, color: "#60a5fa" },
    { val: 5, color: "#3b82f6" },
    { val: 10, color: "#1e40af" },
  ],
  wind: [
    { val: 0, color: "#22c55e" },
    { val: 10, color: "#eab308" },
    { val: 20, color: "#f97316" },
    { val: 30, color: "#ef4444" },
  ],
};

function getOverlayValue(city, mode) {
  const info = getCityCurrentData(city);
  if (!info) return null;
  switch (mode) {
    case "temp": return info.temp;
    case "aqi": return info.aqi;
    case "rain": {
      const data = cityDataMap[city.name];
      const today = todayStr();
      const todayDaily = data?.daily?.find(d => d.date === today);
      return todayDaily?.precip ?? 0;
    }
    case "wind": return info.windSpeed;
    default: return null;
  }
}

function getOverlayLabel(city, mode) {
  const val = getOverlayValue(city, mode);
  if (val == null) return "--";
  switch (mode) {
    case "temp": return val + "°";
    case "aqi": return "AQI " + Math.round(val);
    case "rain": return val.toFixed(1) + "mm";
    case "wind": return Math.round(val) + " km/h";
    default: return "--";
  }
}

function renderMapOverlay() {
  const mode = activeMapMode;
  if (mode === "default") { renderMap(); return; }

  // Re-render base map first (resets labels to default)
  renderMap();

  const svg = document.getElementById("indiaSvg");
  const legendEl = document.getElementById("mapLegend");

  const scale = COLOR_SCALES[mode];
  if (!scale) return;

  // Create overlay group
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("class", "map-overlay-g");
  g.setAttribute("clip-path", "url(#indiaClip)");
  g.setAttribute("filter", "url(#heatBlur)");

  CITIES.forEach(city => {
    const val = getOverlayValue(city, mode);
    if (val == null) return;
    const { x, y } = latLonToSVG(city.lat, city.lon);
    const color = interpolateColor(val, scale);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x);
    circle.setAttribute("cy", y);
    circle.setAttribute("r", "80");
    circle.setAttribute("fill", color);
    circle.setAttribute("opacity", "0.5");
    g.appendChild(circle);
  });

  // Insert overlay before markers
  const firstMarker = svg.querySelector(".svg-marker");
  if (firstMarker) {
    svg.insertBefore(g, firstMarker);
  } else {
    svg.appendChild(g);
  }

  // Ensure defs has clipPath and filter
  let defs = svg.querySelector("defs");
  if (defs && !defs.querySelector("#indiaClip")) {
    const ns = "http://www.w3.org/2000/svg";
    const clip = document.createElementNS(ns, "clipPath");
    clip.setAttribute("id", "indiaClip");
    const clipPath = document.createElementNS(ns, "path");
    clipPath.setAttribute("d", INDIA_SVG_PATH);
    clip.appendChild(clipPath);
    defs.appendChild(clip);

    const filter = document.createElementNS(ns, "filter");
    filter.setAttribute("id", "heatBlur");
    const blur = document.createElementNS(ns, "feGaussianBlur");
    blur.setAttribute("stdDeviation", "40");
    filter.appendChild(blur);
    defs.appendChild(filter);
  }

  // Update marker labels for overlay mode
  svg.querySelectorAll(".svg-marker").forEach(marker => {
    const idx = parseInt(marker.dataset.idx);
    const city = CITIES[idx];
    const label = getOverlayLabel(city, mode);
    const tempText = marker.querySelector(".marker-temp-text");
    if (tempText) tempText.textContent = label;
    const emojiText = marker.querySelector(".marker-emoji");
    if (emojiText) emojiText.textContent = "";
  });

  // Show legend
  if (legendEl) {
    const min = scale[0];
    const max = scale[scale.length - 1];
    const gradColors = scale.map((s, i) => {
      const pct = (i / (scale.length - 1)) * 100;
      return `${s.color} ${pct}%`;
    }).join(", ");
    const unit = mode === "temp" ? "°" : mode === "aqi" ? "" : mode === "rain" ? "mm" : "km/h";
    legendEl.innerHTML = `
      <div class="map-legend-bar" style="background:linear-gradient(to right,${gradColors})"></div>
      <div class="map-legend-labels"><span>${min.val}${unit}</span><span>${max.val}${unit}</span></div>
    `;
    legendEl.style.display = "";
  }
}

function setMapMode(mode) {
  activeMapMode = mode;
  document.querySelectorAll(".map-mode-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  if (mode === "default") {
    renderMap();
    const legendEl = document.getElementById("mapLegend");
    if (legendEl) legendEl.style.display = "none";
  } else {
    renderMapOverlay();
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
  const cur = data.current;

  let currentTemp = null;
  let currentCode = 0;
  let windSpeed = null;
  let windDir = null;
  let humidity = null;
  let cloudCover = null;

  // Prefer current API data
  if (cur) {
    currentTemp = Math.round(cur.temperature_2m);
    currentCode = cur.weather_code;
    windSpeed = cur.wind_speed_10m;
    windDir = cur.wind_direction_10m;
    humidity = cur.relative_humidity_2m;
    cloudCover = cur.cloud_cover;
  } else {
    const nearestHourly = data.hourly.find(h => {
      const hDate = h.time.slice(0, 10);
      const hHour = parseInt(h.time.slice(11, 13), 10);
      return hDate === today && hHour === nowHour;
    });

    if (nearestHourly) {
      currentTemp = Math.round(nearestHourly.temp);
      currentCode = nearestHourly.code;
      windSpeed = nearestHourly.wind;
      windDir = nearestHourly.windDir;
      humidity = nearestHourly.humidity;
      cloudCover = nearestHourly.cloudCover;
    } else if (todayDaily) {
      currentTemp = Math.round((todayDaily.max + todayDaily.min) / 2);
      currentCode = todayDaily.code;
    }
  }

  let precipProb = null;
  const nearestH = data.hourly.find(h => {
    const hDate = h.time.slice(0, 10);
    const hHour = parseInt(h.time.slice(11, 13), 10);
    return hDate === today && hHour === nowHour;
  });
  if (nearestH?.precipProb != null) {
    precipProb = nearestH.precipProb;
  } else if (todayDaily?.precipProb != null) {
    precipProb = todayDaily.precipProb;
  }

  const aqiVal = data.aqi?.us_aqi ?? data.aqi?.european_aqi ?? null;

  return {
    temp: currentTemp,
    code: currentCode,
    high: todayDaily ? Math.round(todayDaily.max) : null,
    low: todayDaily ? Math.round(todayDaily.min) : null,
    desc: getWeatherInfo(currentCode).desc,
    icon: getWeatherInfo(currentCode).icon,
    precipProb,
    windSpeed,
    windDir,
    humidity,
    cloudCover,
    aqi: aqiVal,
  };
}

/* Weather-condition gradient backgrounds for city cards */
const CARD_GRADIENTS = {
  sun:          "linear-gradient(135deg, #4a9bd9 0%, #f0a030 50%, #e8823a 100%)",
  "cloud-sun":  "linear-gradient(135deg, #5a8db8 0%, #7aa8cc 50%, #c4a050 100%)",
  cloud:        "linear-gradient(135deg, #5a6f8a 0%, #6b809a 50%, #4a5f78 100%)",
  fog:          "linear-gradient(135deg, #6a7a8a 0%, #8a96a4 50%, #5a6878 100%)",
  drizzle:      "linear-gradient(135deg, #4a6888 0%, #5a7898 50%, #3a5a7a 100%)",
  rain:         "linear-gradient(135deg, #3a5878 0%, #4a6888 50%, #2a4868 100%)",
  "rain-heavy": "linear-gradient(135deg, #2a3f5a 0%, #3a4f6a 50%, #1a2f4a 100%)",
  snow:         "linear-gradient(135deg, #6a8aaa 0%, #8aaac4 50%, #5a7a9a 100%)",
  thunder:      "linear-gradient(135deg, #3a3f5a 0%, #4a4f6a 50%, #2a2f4a 100%)",
};

/* Generate weather particle HTML for city cards */
function generateWeatherParticles(icon) {
  let html = '<div class="city-card-particles">';
  switch (icon) {
    case "snow":
      for (let i = 0; i < 20; i++) {
        const left = Math.random() * 100;
        const delay = Math.random() * 4;
        const dur = 2.5 + Math.random() * 2;
        const size = 2 + Math.random() * 3;
        html += `<span class="particle-snow" style="left:${left}%;top:-8px;width:${size}px;height:${size}px;animation-delay:${delay}s;animation-duration:${dur}s;opacity:${0.4 + Math.random() * 0.5}"></span>`;
      }
      break;
    case "rain":
      for (let i = 0; i < 16; i++) {
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const dur = 0.8 + Math.random() * 0.6;
        html += `<span class="particle-rain" style="left:${left}%;top:-16px;animation-delay:${delay}s;animation-duration:${dur}s"></span>`;
      }
      break;
    case "rain-heavy":
      for (let i = 0; i < 24; i++) {
        const left = Math.random() * 100;
        const delay = Math.random() * 1.5;
        const dur = 0.5 + Math.random() * 0.4;
        html += `<span class="particle-rain-heavy" style="left:${left}%;top:-20px;animation-delay:${delay}s;animation-duration:${dur}s"></span>`;
      }
      break;
    case "drizzle":
      for (let i = 0; i < 10; i++) {
        const left = Math.random() * 100;
        const delay = Math.random() * 3;
        const dur = 1.5 + Math.random() * 1;
        html += `<span class="particle-drizzle" style="left:${left}%;top:-10px;animation-delay:${delay}s;animation-duration:${dur}s"></span>`;
      }
      break;
    case "sun":
      for (let i = 0; i < 5; i++) {
        const left = 60 + Math.random() * 35;
        const top = Math.random() * 20;
        const rot = -30 + Math.random() * 60;
        const delay = Math.random() * 2;
        html += `<span class="particle-sun" style="left:${left}%;top:${top}px;transform:rotate(${rot}deg);animation-delay:${delay}s"></span>`;
      }
      break;
    case "cloud-sun":
      for (let i = 0; i < 2; i++) {
        const top = 15 + Math.random() * 40;
        const dur = 20 + Math.random() * 15;
        const delay = Math.random() * 10;
        html += `<span class="particle-cloud" style="top:${top}px;animation-delay:${delay}s;animation-duration:${dur}s"></span>`;
      }
      break;
    case "cloud":
      for (let i = 0; i < 3; i++) {
        const top = 10 + Math.random() * 50;
        const dur = 18 + Math.random() * 12;
        const delay = Math.random() * 8;
        const w = 40 + Math.random() * 50;
        html += `<span class="particle-cloud" style="top:${top}px;width:${w}px;animation-delay:${delay}s;animation-duration:${dur}s"></span>`;
      }
      break;
    case "fog":
      for (let i = 0; i < 4; i++) {
        const top = 15 + i * 20;
        const dur = 4 + Math.random() * 3;
        const delay = Math.random() * 2;
        html += `<span class="particle-fog" style="top:${top}px;animation-delay:${delay}s;animation-duration:${dur}s"></span>`;
      }
      break;
    case "thunder":
      html += `<span class="particle-thunder" style="animation-delay:${Math.random() * 3}s"></span>`;
      for (let i = 0; i < 18; i++) {
        const left = Math.random() * 100;
        const delay = Math.random() * 1.5;
        const dur = 0.5 + Math.random() * 0.4;
        html += `<span class="particle-rain-heavy" style="left:${left}%;top:-20px;animation-delay:${delay}s;animation-duration:${dur}s"></span>`;
      }
      break;
  }
  html += '</div>';
  return html;
}

/* Generate full-page weather particles for detail view background */
function generateDetailParticles(icon) {
  let html = '';
  switch (icon) {
    case "snow":
      for (let i = 0; i < 50; i++) {
        const left = Math.random() * 100;
        const delay = Math.random() * 8;
        const dur = 4 + Math.random() * 4;
        const size = 2 + Math.random() * 4;
        html += `<span class="particle-snow" style="left:${left}%;top:-10px;width:${size}px;height:${size}px;animation-delay:${delay}s;animation-duration:${dur}s;opacity:${0.3 + Math.random() * 0.5}"></span>`;
      }
      break;
    case "rain":
      for (let i = 0; i < 40; i++) {
        const left = Math.random() * 100;
        const delay = Math.random() * 3;
        const dur = 0.8 + Math.random() * 0.6;
        html += `<span class="particle-rain" style="left:${left}%;top:-16px;animation-delay:${delay}s;animation-duration:${dur}s"></span>`;
      }
      break;
    case "rain-heavy":
      for (let i = 0; i < 60; i++) {
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const dur = 0.5 + Math.random() * 0.4;
        html += `<span class="particle-rain-heavy" style="left:${left}%;top:-20px;animation-delay:${delay}s;animation-duration:${dur}s"></span>`;
      }
      break;
    case "drizzle":
      for (let i = 0; i < 25; i++) {
        const left = Math.random() * 100;
        const delay = Math.random() * 4;
        const dur = 1.5 + Math.random() * 1;
        html += `<span class="particle-drizzle" style="left:${left}%;top:-10px;animation-delay:${delay}s;animation-duration:${dur}s"></span>`;
      }
      break;
    case "sun":
      for (let i = 0; i < 8; i++) {
        const left = 50 + Math.random() * 45;
        const top = Math.random() * 30;
        const rot = -40 + Math.random() * 80;
        const delay = Math.random() * 3;
        html += `<span class="particle-sun" style="left:${left}%;top:${top}%;transform:rotate(${rot}deg);animation-delay:${delay}s;height:80px"></span>`;
      }
      break;
    case "cloud-sun":
    case "cloud":
      for (let i = 0; i < 5; i++) {
        const top = 5 + Math.random() * 60;
        const dur = 25 + Math.random() * 20;
        const delay = Math.random() * 15;
        const w = 60 + Math.random() * 80;
        html += `<span class="particle-cloud" style="top:${top}%;width:${w}px;height:${w*0.35}px;animation-delay:${delay}s;animation-duration:${dur}s"></span>`;
      }
      break;
    case "fog":
      for (let i = 0; i < 8; i++) {
        const top = 10 + i * 12;
        const dur = 5 + Math.random() * 4;
        const delay = Math.random() * 3;
        html += `<span class="particle-fog" style="top:${top}%;animation-delay:${delay}s;animation-duration:${dur}s"></span>`;
      }
      break;
    case "thunder":
      html += `<span class="particle-thunder" style="animation-delay:${Math.random() * 2}s"></span>`;
      html += `<span class="particle-thunder" style="animation-delay:${2 + Math.random() * 2}s"></span>`;
      for (let i = 0; i < 50; i++) {
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const dur = 0.5 + Math.random() * 0.4;
        html += `<span class="particle-rain-heavy" style="left:${left}%;top:-20px;animation-delay:${delay}s;animation-duration:${dur}s"></span>`;
      }
      break;
  }
  return html;
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

  container.innerHTML = "";
  filtered.forEach(({ city, idx }) => {
    const info = getCityCurrentData(city);

    // Swipe wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "city-card-wrapper";
    wrapper.dataset.idx = idx;

    // Delete background
    const deleteBg = document.createElement("div");
    deleteBg.className = "city-card-delete-bg";
    deleteBg.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>Delete`;
    wrapper.appendChild(deleteBg);

    // Card
    const card = document.createElement("div");
    card.className = "city-card";
    const iconType = info ? info.icon : "cloud";
    const gradient = CARD_GRADIENTS[iconType] || CARD_GRADIENTS.cloud;
    card.style.setProperty("--card-bg", gradient);

    const iconHtml = info ? weatherSVGSmall(iconType, 32) : weatherSVGSmall("cloud", 32);
    const tempStr = info && info.temp != null ? info.temp + "°" : "--°";
    const desc = info ? info.desc : "Loading...";
    const rangeHtml = info && info.high != null
      ? `H:<span class="hi">${info.high}°</span>  L:<span class="lo">${info.low}°</span>`
      : "--";

    const precipChip = info && info.precipProb > 0
      ? `<div class="city-card-precip">${info.precipProb}%</div>`
      : "";

    card.innerHTML = `
      ${generateWeatherParticles(iconType)}
      <div class="city-card-icon">${iconHtml}</div>
      <div class="city-card-left">
        <div class="city-card-name">${city.name}</div>
        <div class="city-card-desc">${desc}</div>
        ${precipChip}
      </div>
      <div class="city-card-right">
        <div class="city-card-current">${tempStr}</div>
        <div class="city-card-range">${rangeHtml}</div>
      </div>
    `;
    wrapper.appendChild(card);
    container.appendChild(wrapper);

    // Setup swipe & tap handlers
    setupCardSwipe(wrapper, card, deleteBg, idx, city);
  });
}

/* ── Swipe-to-Delete ──────────────────────────────── */

let _openSwipeWrapper = null;

function closeOpenSwipe() {
  if (_openSwipeWrapper) {
    _openSwipeWrapper.classList.remove("swiped");
    _openSwipeWrapper.querySelector(".city-card").style.transform = "";
    _openSwipeWrapper = null;
  }
}

function setupCardSwipe(wrapper, card, deleteBg, idx, city) {
  let startX = 0, startY = 0, currentX = 0;
  let isSwiping = false, directionLocked = false;
  let touchHandled = false;
  let movedSignificantly = false;

  wrapper.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentX = 0;
    isSwiping = false;
    directionLocked = false;
    touchHandled = false;
    movedSignificantly = false;
    card.style.transition = "none";
  }, { passive: true });

  wrapper.addEventListener("touchmove", (e) => {
    if (e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    // Track if finger moved enough to be a scroll/swipe (not a tap)
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      movedSignificantly = true;
    }

    if (!directionLocked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      directionLocked = true;
      // If vertical movement dominates, don't swipe
      if (Math.abs(dy) > Math.abs(dx)) return;
      isSwiping = true;
      // Close any other open swipe
      if (_openSwipeWrapper && _openSwipeWrapper !== wrapper) {
        closeOpenSwipe();
      }
    }

    if (!isSwiping) return;
    e.preventDefault();

    // Only allow left swipe (negative dx), cap at -80px
    currentX = Math.max(-80, Math.min(0, dx));
    card.style.transform = `translateX(${currentX}px)`;

    // Show delete bg once we start moving
    if (currentX < -5) {
      deleteBg.style.opacity = "1";
      deleteBg.style.pointerEvents = "auto";
    }
  }, { passive: false });

  wrapper.addEventListener("touchend", () => {
    touchHandled = true;
    card.style.transition = "transform .25s cubic-bezier(.4,0,.2,1)";

    if (!isSwiping) {
      // Only open city on a true tap (no significant finger movement)
      if (!movedSignificantly) {
        if (wrapper.classList.contains("swiped")) {
          closeOpenSwipe();
        } else {
          openCityFromList(idx);
        }
      }
      return;
    }

    if (currentX < -40) {
      // Snap open
      card.style.transform = "translateX(-80px)";
      wrapper.classList.add("swiped");
      _openSwipeWrapper = wrapper;
    } else {
      // Snap back
      card.style.transform = "";
      wrapper.classList.remove("swiped");
      deleteBg.style.opacity = "0";
      deleteBg.style.pointerEvents = "none";
      if (_openSwipeWrapper === wrapper) _openSwipeWrapper = null;
    }
  });

  // Click handler for mouse (desktop) — skip if touch already handled
  card.addEventListener("click", () => {
    if (touchHandled) { touchHandled = false; return; }
    if (wrapper.classList.contains("swiped")) {
      closeOpenSwipe();
    } else {
      openCityFromList(idx);
    }
  });

  // Delete button tap
  deleteBg.addEventListener("click", (e) => {
    e.stopPropagation();
    showDeleteConfirm(idx, city.name);
  });
}

let _pendingDeleteIdx = null;

function showDeleteConfirm(idx, cityName) {
  _pendingDeleteIdx = idx;
  document.getElementById("confirmCityName").textContent = `Remove "${cityName}" from your list`;
  document.getElementById("confirmModal").classList.add("open");
}

function hideDeleteConfirm() {
  document.getElementById("confirmModal").classList.remove("open");
  _pendingDeleteIdx = null;
  closeOpenSwipe();
}

function removeCity(idx) {
  const cityName = CITIES[idx].name;
  CITIES.splice(idx, 1);
  delete cityDataMap[cityName];
  saveCustomCities();
  // Adjust currentCityIdx if needed
  if (currentCityIdx >= CITIES.length) {
    currentCityIdx = Math.max(0, CITIES.length - 1);
  }
  renderCitiesList();
  renderMap();
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
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=20&language=en&format=json`;
    const res = await fetch(url);
    const data = await res.json();

    const container = document.getElementById("addCityResults");
    // Filter to India only (country_code "IN")
    const indiaResults = (data.results || []).filter(r => r.country_code === "IN");
    if (indiaResults.length === 0) {
      container.innerHTML = '<p class="add-city-hint">No Indian cities found</p>';
      return;
    }

    container.innerHTML = "";
    indiaResults.slice(0, 8).forEach(r => {
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
    const [historical, forecast, aqi, flood] = await Promise.all([
      fetchHistorical(newCity),
      fetchForecast(newCity),
      fetchAirQuality(newCity).catch(() => null),
      fetchFloodRisk(newCity).catch(() => null),
    ]);
    const daily = mergeDailyData(historical, forecast);
    const hourly = extractHourly(forecast);
    const aqiHourly = aqi ? extractAqiHourly(aqi) : [];
    cityDataMap[newCity.name] = {
      daily, hourly,
      current: forecast.current || null,
      aqi: aqi?.current || null,
      aqiHourly,
      flood: flood?.daily || null,
    };
  } catch (err) {
    cityDataMap[newCity.name] = { daily: [], hourly: [], current: null, aqi: null, aqiHourly: [], flood: null };
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
  document.getElementById("detailBgParticles").innerHTML = "";
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
  const cur = data.current;
  const today = todayStr();
  const todayDaily = daily.find(d => d.date === today);
  const nowHour = nowHourIST();

  // City name + date
  document.getElementById("cityName").innerHTML =
    `${city.name}, <span>India</span>`;
  document.getElementById("detailDate").textContent = formatFullDate(today);

  // Current temp — prefer current API, fallback to hourly
  let currentTemp = "--";
  let currentCode = 0;
  let currentWind = "--";
  let currentWindDir = null;
  let currentHumidity = "--";
  let currentDewPoint = null;
  let currentPressure = null;
  let currentCloudCover = null;
  let currentGusts = null;
  let currentFeelsLike = null;
  let currentVisibility = null;
  let sunshineHrs = "--";

  const nearestHourly = hourly.find(h => {
    const hDate = h.time.slice(0, 10);
    const hHour = parseInt(h.time.slice(11, 13), 10);
    return hDate === today && hHour === nowHour;
  });

  if (cur) {
    currentTemp = Math.round(cur.temperature_2m);
    currentCode = cur.weather_code;
    currentWind = cur.wind_speed_10m != null ? Math.round(cur.wind_speed_10m) + " " + degreesToCompass(cur.wind_direction_10m) : "--";
    currentWindDir = cur.wind_direction_10m;
    currentHumidity = cur.relative_humidity_2m != null ? cur.relative_humidity_2m + "%" : "--";
    currentDewPoint = cur.dew_point_2m;
    currentPressure = cur.pressure_msl;
    currentCloudCover = cur.cloud_cover;
    currentGusts = cur.wind_gusts_10m;
    currentFeelsLike = cur.apparent_temperature;
    currentVisibility = nearestHourly?.visibility ?? null;
  } else if (nearestHourly) {
    currentTemp = Math.round(nearestHourly.temp);
    currentCode = nearestHourly.code;
    currentWind = nearestHourly.wind != null ? Math.round(nearestHourly.wind) + " " + degreesToCompass(nearestHourly.windDir) : "--";
    currentWindDir = nearestHourly.windDir;
    currentHumidity = nearestHourly.humidity != null ? nearestHourly.humidity + "%" : "--";
    currentDewPoint = nearestHourly.dewPoint;
    currentPressure = nearestHourly.pressure;
    currentCloudCover = nearestHourly.cloudCover;
    currentGusts = nearestHourly.gusts;
    currentFeelsLike = nearestHourly.feelsLike;
    currentVisibility = nearestHourly.visibility;
  } else if (todayDaily) {
    currentTemp = Math.round((todayDaily.max + todayDaily.min) / 2);
    currentCode = todayDaily.code;
  }

  if (todayDaily?.sunshine != null) {
    sunshineHrs = Math.round(todayDaily.sunshine / 3600) + "hr";
  }

  const weatherInfo = getWeatherInfo(currentCode);

  // Temperature
  document.getElementById("tempValue").textContent = currentTemp;

  // Description
  const descEl = document.getElementById("weatherDesc");
  const todayMaxMin = todayDaily
    ? `H:${Math.round(todayDaily.max)}°  L:${Math.round(todayDaily.min)}°`
    : "";
  descEl.textContent = weatherInfo.desc + (todayMaxMin ? "  ·  " + todayMaxMin : "");

  // Feels-like + Dew point + Comfort
  const feelsLikeEl = document.getElementById("feelsLike");
  let feelsText = "";
  if (currentFeelsLike != null && currentTemp !== "--") {
    const diff = Math.abs(Math.round(currentFeelsLike) - currentTemp);
    if (diff >= 2) feelsText = `Feels like ${Math.round(currentFeelsLike)}°`;
  }
  let dewText = "";
  if (currentDewPoint != null) dewText = `Dew point ${Math.round(currentDewPoint)}°`;
  feelsLikeEl.textContent = [feelsText, dewText].filter(Boolean).join("  ·  ");

  // Comfort chip
  const comfortChip = document.getElementById("comfortChip");
  if (comfortChip) {
    if (currentDewPoint != null) {
      let comfortLabel, comfortCls;
      if (currentDewPoint < 16) { comfortLabel = "Comfortable"; comfortCls = "comfort-ok"; }
      else if (currentDewPoint < 21) { comfortLabel = "Warm"; comfortCls = "comfort-warm"; }
      else if (currentDewPoint < 24) { comfortLabel = "Hot"; comfortCls = "comfort-hot"; }
      else { comfortLabel = "Oppressive"; comfortCls = "comfort-oppressive"; }
      comfortChip.textContent = comfortLabel;
      comfortChip.className = "comfort-chip " + comfortCls;
      comfortChip.style.display = "";
    } else {
      comfortChip.style.display = "none";
    }
  }

  // Yesterday comparison
  const yesterdayComp = document.getElementById("yesterdayComp");
  if (yesterdayComp) {
    const yesterday = daysAgo(1);
    const yesterdayHourly = hourly.find(h => {
      const hDate = h.time.slice(0, 10);
      const hHour = parseInt(h.time.slice(11, 13), 10);
      return hDate === yesterday && hHour === nowHour;
    });
    if (yesterdayHourly && currentTemp !== "--") {
      const diff = currentTemp - Math.round(yesterdayHourly.temp);
      if (diff !== 0) {
        const absDiff = Math.abs(diff);
        const word = diff > 0 ? "warmer" : "cooler";
        const cls = diff > 0 ? "yesterday-warmer" : "yesterday-cooler";
        yesterdayComp.textContent = `${absDiff}° ${word} than yesterday`;
        yesterdayComp.className = "yesterday-comp " + cls;
        yesterdayComp.style.display = "";
      } else {
        yesterdayComp.style.display = "none";
      }
    } else {
      yesterdayComp.style.display = "none";
    }
  }

  // (Stats are now rendered inside glass cards above)

  // Weather-condition background gradient + particles
  const DETAIL_BG_GRADIENTS = {
    sun:          "linear-gradient(180deg, #4a8ec4 0%, #3a6e9a 30%, #1a3a5a 70%, #0d1a2a 100%)",
    "cloud-sun":  "linear-gradient(180deg, #5a8aaa 0%, #4a6a88 30%, #1a3050 70%, #0d1a2a 100%)",
    cloud:        "linear-gradient(180deg, #4a5a6e 0%, #3a4a5e 30%, #1a2838 70%, #0d1520 100%)",
    fog:          "linear-gradient(180deg, #5a6878 0%, #4a5868 30%, #1a2838 70%, #0d1520 100%)",
    drizzle:      "linear-gradient(180deg, #3a5878 0%, #2a4868 30%, #142838 70%, #0a1520 100%)",
    rain:         "linear-gradient(180deg, #2a4a6a 0%, #1a3a5a 30%, #0f2238 70%, #08121e 100%)",
    "rain-heavy": "linear-gradient(180deg, #1a2a40 0%, #142234 30%, #0a1520 70%, #060e18 100%)",
    snow:         "linear-gradient(180deg, #6888a8 0%, #5878a0 30%, #2a4060 70%, #1a2a3a 100%)",
    thunder:      "linear-gradient(180deg, #2a2a40 0%, #1a1a30 30%, #0e0e1a 70%, #080812 100%)",
  };

  const detailView = document.getElementById("detailView");
  const bgGradient = DETAIL_BG_GRADIENTS[weatherInfo.icon] || DETAIL_BG_GRADIENTS.cloud;
  detailView.style.setProperty("--detail-bg", bgGradient);

  // Full-page weather particles
  const bgParticles = document.getElementById("detailBgParticles");
  bgParticles.innerHTML = generateDetailParticles(weatherInfo.icon);

  // ── Populate Glass Cards ──

  // Sunrise / Sunset card
  const sunriseStr = formatTimeIST(todayDaily?.sunrise);
  const sunsetStr = formatTimeIST(todayDaily?.sunset);
  const daylightHrs = todayDaily?.daylightDuration != null
    ? (todayDaily.daylightDuration / 3600).toFixed(1) + "hr daylight"
    : "";
  const sunsetBody = document.getElementById("sunsetBody");
  if (sunsetBody) {
    sunsetBody.innerHTML = `
      <div class="glass-info-value">${sunsetStr}</div>
      <div class="glass-info-subtitle">Sunrise: ${sunriseStr}</div>
      ${daylightHrs ? `<div class="glass-info-desc">${daylightHrs}</div>` : ""}
    `;
  }

  // UV Index card
  const uvInfo = getUVLevel(todayDaily?.uvIndex);
  const uvVal = todayDaily?.uvIndex != null ? Math.round(todayDaily.uvIndex) : "--";
  const uvBody = document.getElementById("uvBody");
  if (uvBody) {
    const uvPct = todayDaily?.uvIndex != null ? Math.min(todayDaily.uvIndex / 11 * 100, 100) : 0;
    const uvLabel = uvVal <= 2 ? "Low" : uvVal <= 5 ? "Moderate" : uvVal <= 7 ? "High" : uvVal <= 10 ? "Very High" : "Extreme";
    uvBody.innerHTML = `
      <div class="glass-info-value">${uvVal}</div>
      <div class="glass-info-subtitle">${uvLabel}</div>
      <div class="uv-color-bar"><div class="uv-color-dot" style="left:${uvPct}%"></div></div>
    `;
  }

  // Feels Like card
  const feelsLikeBody = document.getElementById("feelsLikeBody");
  if (feelsLikeBody) {
    const flVal = currentFeelsLike != null ? Math.round(currentFeelsLike) + "°" : "--°";
    const flDesc = currentFeelsLike != null && currentTemp !== "--"
      ? (Math.round(currentFeelsLike) < currentTemp ? "Wind is making it feel cooler." : Math.round(currentFeelsLike) > currentTemp ? "Humidity is making it feel warmer." : "Similar to the actual temperature.")
      : "";
    feelsLikeBody.innerHTML = `
      <div class="glass-info-value">${flVal}</div>
      <div class="glass-info-subtitle">Actual: ${currentTemp}°</div>
      ${flDesc ? `<div class="glass-info-desc">${flDesc}</div>` : ""}
    `;
  }

  // Humidity card
  const humidityBody = document.getElementById("humidityBody");
  if (humidityBody) {
    const humVal = cur?.relative_humidity_2m ?? nearestHourly?.humidity ?? null;
    const dewVal = currentDewPoint != null ? Math.round(currentDewPoint) + "°" : "--°";
    humidityBody.innerHTML = `
      <div class="glass-info-value">${humVal != null ? humVal + "%" : "--%"}</div>
      <div class="glass-info-subtitle">Dew point: ${dewVal}</div>
    `;
  }

  // Visibility card
  const visibilityBody = document.getElementById("visibilityBody");
  if (visibilityBody) {
    let visVal = "--";
    let visDesc = "";
    if (currentVisibility != null) {
      const km = currentVisibility / 1000;
      visVal = km.toFixed(1) + " km";
      if (km >= 10) visDesc = "Perfectly clear view.";
      else if (km >= 5) visDesc = "Good visibility.";
      else if (km >= 2) visDesc = "Moderate visibility.";
      else visDesc = "Poor visibility.";
    }
    visibilityBody.innerHTML = `
      <div class="glass-info-value">${visVal}</div>
      ${visDesc ? `<div class="glass-info-desc">${visDesc}</div>` : ""}
    `;
  }

  // Precipitation card
  const precipBody = document.getElementById("precipBody");
  if (precipBody) {
    let precipProbVal = "--";
    if (nearestHourly?.precipProb != null) precipProbVal = nearestHourly.precipProb + "%";
    else if (todayDaily?.precipProb != null) precipProbVal = todayDaily.precipProb + "%";
    const todayPrecip = todayDaily?.precip != null ? todayDaily.precip.toFixed(1) + "mm" : "0mm";
    precipBody.innerHTML = `
      <div class="glass-info-value">${precipProbVal}</div>
      <div class="glass-info-subtitle">${todayPrecip} today</div>
    `;
  }

  // Wind card stats
  const windStats = document.getElementById("windCardStats");
  if (windStats) {
    const windSpd = cur?.wind_speed_10m ?? nearestHourly?.wind;
    const windDirStr = currentWindDir != null ? degreesToCompass(currentWindDir) : "--";
    const gustsVal = currentGusts != null ? Math.round(currentGusts) + " km/h" : "--";
    windStats.innerHTML = `
      <div class="wind-stat-row"><span class="wind-stat-label">Wind</span><span class="wind-stat-val">${windSpd != null ? Math.round(windSpd) + " km/h" : "--"}</span></div>
      <div class="wind-stat-row"><span class="wind-stat-label">Gusts</span><span class="wind-stat-val">${gustsVal}</span></div>
      <div class="wind-stat-row"><span class="wind-stat-label">Direction</span><span class="wind-stat-val">${currentWindDir != null ? Math.round(currentWindDir) + "° " + windDirStr : "--"}</span></div>
    `;
  }

  // AQI card body
  const aqiData = data.aqi;
  const aqiVal = aqiData?.us_aqi ?? aqiData?.european_aqi ?? null;
  const aqiInfo = getAQILevel(aqiVal);
  const aqiBody = document.getElementById("aqiBody");
  if (aqiBody) {
    const aqiLabel = aqiVal != null
      ? (aqiVal <= 50 ? "Good" : aqiVal <= 100 ? "Moderate" : aqiVal <= 150 ? "Unhealthy for Sensitive" : aqiVal <= 200 ? "Unhealthy" : "Very Unhealthy")
      : "--";
    const aqiPct = aqiVal != null ? Math.min(aqiVal / 300 * 100, 100) : 0;
    let aqiDesc = "";
    if (aqiVal != null) {
      if (aqiVal <= 50) aqiDesc = "Air quality is satisfactory.";
      else if (aqiVal <= 100) aqiDesc = "Acceptable for most people.";
      else if (aqiVal <= 150) aqiDesc = "Sensitive groups should limit outdoor exertion.";
      else if (aqiVal <= 200) aqiDesc = "Everyone may experience health effects.";
      else aqiDesc = "Health alert: avoid outdoor activities.";
    }
    aqiBody.innerHTML = `
      <div class="glass-info-value">${aqiVal ?? "--"}</div>
      <div class="glass-info-subtitle">${aqiLabel}</div>
      <div class="aqi-gradient-bar"><div class="aqi-gradient-dot" style="left:${aqiPct}%"></div></div>
      ${aqiDesc ? `<div class="glass-info-desc">${aqiDesc}</div>` : ""}
    `;
  }

  // Show/hide glass cards based on data availability
  const aqiCardEl = document.getElementById("aqiCard");
  if (aqiCardEl) aqiCardEl.style.display = aqiVal != null ? "" : "none";
  const pressureWrap = document.getElementById("pressureCardWrap");
  if (pressureWrap) pressureWrap.style.display = currentPressure != null ? "" : "none";

  // Legacy hidden elements (used by other parts of code)
  const aqiChip = document.getElementById("aqiChip");
  if (aqiChip) { aqiChip.textContent = aqiInfo.label; }
  const uvChip = document.getElementById("uvChip");
  if (uvChip) { uvChip.textContent = uvInfo.label; }

  // Storm risk chip (CAPE-based)
  const stormChip = document.getElementById("stormChip");
  if (stormChip) {
    const cape = nearestHourly?.cape ?? null;
    if (cape != null && cape >= 300) {
      let stormLabel, stormCls;
      if (cape >= 2500) { stormLabel = "Severe Storm Risk"; stormCls = "storm-severe"; }
      else if (cape >= 1000) { stormLabel = "High Storm Risk"; stormCls = "storm-high"; }
      else { stormLabel = "Moderate Storm Risk"; stormCls = "storm-moderate"; }
      stormChip.textContent = stormLabel;
      stormChip.className = "storm-chip " + stormCls;
      stormChip.style.display = "";
    } else {
      stormChip.style.display = "none";
    }
  }

  // Dust alert chip
  const dustChip = document.getElementById("dustChip");
  if (dustChip) {
    const dust = aqiData?.dust ?? null;
    if (dust != null && dust > 50) {
      if (dust > 150) {
        dustChip.textContent = "Dust Severe";
        dustChip.className = "dust-chip dust-severe";
      } else {
        dustChip.textContent = "Dust Alert";
        dustChip.className = "dust-chip dust-alert";
      }
      dustChip.style.display = "";
    } else {
      dustChip.style.display = "none";
    }
  }

  // Flood risk chip
  const floodChip = document.getElementById("floodChip");
  if (floodChip) {
    const floodData = data.flood;
    if (floodData?.river_discharge_max && floodData?.river_discharge_mean) {
      const maxDischarge = Math.max(...floodData.river_discharge_max.filter(v => v != null));
      const meanDischarge = floodData.river_discharge_mean.filter(v => v != null);
      const avgMean = meanDischarge.length > 0 ? meanDischarge.reduce((a, b) => a + b, 0) / meanDischarge.length : 0;
      if (avgMean > 0 && maxDischarge / avgMean > 3) {
        floodChip.textContent = "Flood Risk";
        floodChip.className = "flood-chip flood-risk";
        floodChip.style.display = "";
      } else if (avgMean > 0 && maxDischarge / avgMean > 2) {
        floodChip.textContent = "Flood Watch";
        floodChip.className = "flood-chip flood-watch";
        floodChip.style.display = "";
      } else {
        floodChip.style.display = "none";
      }
    } else {
      floodChip.style.display = "none";
    }
  }

  // Wind compass
  renderWindCompass(cur?.wind_speed_10m ?? nearestHourly?.wind, currentWindDir, currentGusts);

  // Pressure card
  renderPressureCard(currentPressure, hourly, today, nowHour);

  // AQI breakdown and trend are now shown inside the glass AQI card
  // (rendered above in aqiBody)

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
    const precipHtml = h.precipProb > 0
      ? `<span class="hourly-precip">${h.precipProb}%</span>`
      : "";
    const cloudHtml = h.cloudCover != null
      ? `<span class="hourly-cloud">${h.cloudCover}%</span>`
      : "";
    card.innerHTML = `
      <span class="hourly-time">${i === 0 ? "Now" : formatHour(hHour)}</span>
      <span class="hourly-icon">${weatherSVGSmall(info.icon, 32)}</span>
      <span class="hourly-temp">${Math.round(h.temp)}°</span>
      ${precipHtml}
      ${cloudHtml}
    `;
    container.appendChild(card);
  });
}

function renderDaily(daily) {
  const container = document.getElementById("dailyList");
  container.innerHTML = "";

  const today = todayStr();
  const futureDays = daily.filter(d => d.date >= today).slice(0, 16);

  const allMin = Math.min(...futureDays.map(d => d.min));
  const allMax = Math.max(...futureDays.map(d => d.max));
  const range = allMax - allMin || 1;

  futureDays.forEach(d => {
    const info = getWeatherInfo(d.code);
    const left = ((d.min - allMin) / range) * 100;
    const width = ((d.max - d.min) / range) * 100;
    const precipHtml = d.precipProb > 0
      ? `<span class="daily-precip">${d.precipProb}%</span>`
      : "";
    const rainDurHtml = d.precipHours != null && d.precipHours > 0
      ? `<span class="daily-rain-dur">~${Math.round(d.precipHours)}hr</span>`
      : "";

    const row = document.createElement("div");
    row.className = "daily-row";
    row.innerHTML = `
      <span class="daily-day">${formatDay(d.date)}</span>
      <span class="daily-icon">${weatherSVGSmall(info.icon, 24)}</span>
      ${precipHtml}
      ${rainDurHtml}
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

/* ── Wind Compass ─────────────────────────────────── */

function renderWindCompass(speed, dir, gusts) {
  const container = document.getElementById("windCompass");
  if (!container) return;
  if (speed == null || dir == null) { container.innerHTML = ""; return; }

  const arrowAngle = dir;
  const speedStr = Math.round(speed);
  const gustsStr = gusts != null ? Math.round(gusts) : null;

  container.innerHTML = `
    <svg viewBox="0 0 120 120" width="120" height="120">
      <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>
      <circle cx="60" cy="60" r="40" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
      <text x="60" y="14" text-anchor="middle" fill="rgba(255,255,255,0.35)" font-size="9" font-family="DM Sans" font-weight="600">N</text>
      <text x="110" y="63" text-anchor="middle" fill="rgba(255,255,255,0.25)" font-size="9" font-family="DM Sans">E</text>
      <text x="60" y="116" text-anchor="middle" fill="rgba(255,255,255,0.25)" font-size="9" font-family="DM Sans">S</text>
      <text x="10" y="63" text-anchor="middle" fill="rgba(255,255,255,0.25)" font-size="9" font-family="DM Sans">W</text>
      <g transform="rotate(${arrowAngle}, 60, 60)">
        <line x1="60" y1="22" x2="60" y2="55" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>
        <polygon points="60,18 55,28 65,28" fill="var(--accent)"/>
      </g>
      <text x="60" y="58" text-anchor="middle" fill="#fff" font-size="14" font-weight="700" font-family="Space Grotesk">${speedStr}</text>
      <text x="60" y="72" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="8" font-family="DM Sans">km/h</text>
      ${gustsStr != null ? `<text x="60" y="84" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="7.5" font-family="DM Sans">Gusts ${gustsStr}</text>` : ""}
    </svg>
  `;
}

/* ── Pressure Card ────────────────────────────────── */

function renderPressureCard(currentPressure, hourly, today, nowHour) {
  const container = document.getElementById("pressureCard");
  if (!container) return;
  if (currentPressure == null) { container.innerHTML = ""; return; }

  // Gather past 6h and next 6h pressure from hourly
  const startIdx = hourly.findIndex(h => {
    const hDate = h.time.slice(0, 10);
    const hHour = parseInt(h.time.slice(11, 13), 10);
    return hDate === today && hHour === nowHour;
  });

  let trendArrow = "→";
  let trendLabel = "Steady";
  let trendCls = "trend-steady";
  const sparkData = [];

  if (startIdx >= 3) {
    const past3h = hourly[startIdx - 3]?.pressure;
    if (past3h != null) {
      const diff = currentPressure - past3h;
      if (diff > 1) { trendArrow = "↑"; trendLabel = "Rising"; trendCls = "trend-rising"; }
      else if (diff < -1) { trendArrow = "↓"; trendLabel = "Falling"; trendCls = "trend-falling"; }
    }
  }

  // Sparkline data: 6h back to 6h forward
  const sparkStart = Math.max(0, startIdx - 6);
  const sparkEnd = Math.min(hourly.length, startIdx + 7);
  for (let i = sparkStart; i < sparkEnd; i++) {
    if (hourly[i]?.pressure != null) sparkData.push(hourly[i].pressure);
  }

  let sparkSvg = "";
  if (sparkData.length > 2) {
    const min = Math.min(...sparkData);
    const max = Math.max(...sparkData);
    const range = max - min || 1;
    const w = 140, h = 32;
    const points = sparkData.map((v, i) => {
      const x = (i / (sparkData.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    }).join(" ");
    sparkSvg = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="pressure-spark">
      <polyline points="${points}" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
    </svg>`;
  }

  container.innerHTML = `
    <div class="pressure-value">${Math.round(currentPressure)} <span>hPa</span></div>
    <div class="pressure-trend ${trendCls}">${trendArrow} ${trendLabel}</div>
    ${sparkSvg}
  `;
}

/* ── AQI Breakdown Panel ─────────────────────────── */

function renderAqiBreakdown(aqiData, overallAqi) {
  const container = document.getElementById("aqiBreakdown");
  if (!container) return;
  if (!aqiData) { container.innerHTML = ""; return; }

  const pollutants = [
    { key: "pm2_5", label: "PM2.5", max: 75, unit: "µg/m³" },
    { key: "pm10", label: "PM10", max: 150, unit: "µg/m³" },
    { key: "nitrogen_dioxide", label: "NO₂", max: 200, unit: "µg/m³" },
    { key: "ozone", label: "O₃", max: 180, unit: "µg/m³" },
    { key: "sulphur_dioxide", label: "SO₂", max: 350, unit: "µg/m³" },
    { key: "carbon_monoxide", label: "CO", max: 15000, unit: "µg/m³" },
  ];

  let barsHtml = "";
  let hasData = false;
  pollutants.forEach(p => {
    const val = aqiData[p.key];
    if (val == null) return;
    hasData = true;
    const pct = Math.min((val / p.max) * 100, 100);
    let color = "#22c55e";
    if (pct > 75) color = "#ef4444";
    else if (pct > 50) color = "#f97316";
    else if (pct > 25) color = "#eab308";
    barsHtml += `
      <div class="aqi-bar-row">
        <span class="aqi-bar-label">${p.label}</span>
        <div class="aqi-bar-track">
          <div class="aqi-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="aqi-bar-val">${Math.round(val)}</span>
      </div>`;
  });

  if (!hasData) { container.innerHTML = ""; return; }

  let healthText = "";
  if (overallAqi != null) {
    if (overallAqi <= 50) healthText = "Air quality is satisfactory. No health risk.";
    else if (overallAqi <= 100) healthText = "Moderate. Acceptable for most people.";
    else if (overallAqi <= 150) healthText = "Unhealthy for sensitive groups. Limit outdoor exertion.";
    else if (overallAqi <= 200) healthText = "Unhealthy. Everyone may experience effects.";
    else healthText = "Very unhealthy. Avoid outdoor activities.";
  }

  container.innerHTML = `
    <div class="aqi-breakdown-header">Air Quality Breakdown</div>
    ${barsHtml}
    ${healthText ? `<div class="aqi-health-text">${healthText}</div>` : ""}
  `;
}

/* ── AQI 24h Trend Strip ─────────────────────────── */

function renderAqiTrend(aqiHourly, today, nowHour) {
  const container = document.getElementById("aqiTrend");
  if (!container) return;
  if (!aqiHourly || aqiHourly.length === 0) { container.innerHTML = ""; return; }

  const startIdx = aqiHourly.findIndex(h => {
    const hDate = h.time.slice(0, 10);
    const hHour = parseInt(h.time.slice(11, 13), 10);
    return hDate === today && hHour >= nowHour;
  });
  if (startIdx === -1) { container.innerHTML = ""; return; }

  const hours = aqiHourly.slice(startIdx, startIdx + 24);
  if (hours.length < 4) { container.innerHTML = ""; return; }

  function aqiColor(val) {
    if (val == null) return "rgba(255,255,255,0.06)";
    if (val <= 50) return "#22c55e";
    if (val <= 100) return "#eab308";
    if (val <= 150) return "#f97316";
    if (val <= 200) return "#ef4444";
    return "#a855f7";
  }

  const segments = hours.map(h =>
    `<div class="aqi-trend-seg" style="background:${aqiColor(h.usAqi)}" title="AQI ${h.usAqi ?? '--'}"></div>`
  ).join("");

  container.innerHTML = `
    <div class="aqi-trend-header">24h AQI Trend</div>
    <div class="aqi-trend-strip">${segments}</div>
    <div class="aqi-trend-labels"><span>Now</span><span>+12h</span><span>+24h</span></div>
  `;
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
  const precipData = daily.map(d => d.precip ?? 0);
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
        {
          label: "Rain",
          data: precipData,
          type: "bar",
          yAxisID: "yPrecip",
          backgroundColor: "rgba(96,165,250,0.25)",
          hoverBackgroundColor: "rgba(96,165,250,0.4)",
          borderRadius: 2,
          barPercentage: 0.6,
          categoryPercentage: 0.8,
          order: 1,
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
              if (c.dataset.label === "Rain") {
                return ` Rain: ${val != null ? val.toFixed(1) + "mm" : "N/A"}`;
              }
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
        yPrecip: {
          position: "right",
          beginAtZero: true,
          ticks: {
            color: "rgba(96,165,250,0.35)",
            font: { size: 9, family: "DM Sans" },
            callback: v => v + "mm",
            maxTicksLimit: 4,
          },
          grid: { display: false },
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

  // Confirm delete modal
  document.getElementById("confirmCancel").addEventListener("click", hideDeleteConfirm);
  document.getElementById("confirmYes").addEventListener("click", () => {
    if (_pendingDeleteIdx != null) {
      removeCity(_pendingDeleteIdx);
    }
    hideDeleteConfirm();
  });
  document.getElementById("confirmModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) hideDeleteConfirm();
  });

  // Map mode buttons
  document.querySelectorAll(".map-mode-btn").forEach(btn => {
    btn.addEventListener("click", () => setMapMode(btn.dataset.mode));
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

/* ── Pull-to-Refresh ───────────────────────────────── */

async function refreshCurrentCity() {
  const city = CITIES[currentCityIdx];
  if (!city) return;
  try {
    const [historical, forecast, aqi, flood] = await Promise.all([
      fetchHistorical(city),
      fetchForecast(city),
      fetchAirQuality(city).catch(() => null),
      fetchFloodRisk(city).catch(() => null),
    ]);
    const daily = mergeDailyData(historical, forecast);
    const hourly = extractHourly(forecast);
    const aqiHourly = aqi ? extractAqiHourly(aqi) : [];
    cityDataMap[city.name] = {
      daily, hourly,
      current: forecast.current || null,
      aqi: aqi?.current || null,
      aqiHourly,
      flood: flood?.daily || null,
    };
    renderCity(currentCityIdx);
  } catch (err) {
    console.error("Refresh failed:", err);
  }
}

function setupPullToRefresh() {
  const dv = document.getElementById("detailView");
  const indicator = document.getElementById("pullRefresh");
  let startY = 0, pulling = false, refreshing = false;

  dv.addEventListener("touchstart", (e) => {
    if (dv.scrollTop <= 0 && !refreshing && e.touches.length === 1) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  dv.addEventListener("touchmove", (e) => {
    if (!pulling || refreshing) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 0 && dv.scrollTop <= 0) {
      const progress = Math.min(dy / 80, 1);
      indicator.style.top = (-50 + progress * 58) + "px";
      indicator.style.opacity = progress;
      indicator.querySelector(".pull-refresh-spinner").style.transform =
        `rotate(${progress * 360}deg)`;
    }
  }, { passive: true });

  dv.addEventListener("touchend", async () => {
    if (!pulling || refreshing) return;
    pulling = false;
    const top = parseFloat(indicator.style.top) || -50;
    if (top >= 0) {
      refreshing = true;
      indicator.classList.add("refreshing");
      indicator.style.top = "8px";
      indicator.style.opacity = "1";
      await refreshCurrentCity();
      indicator.classList.remove("refreshing");
      refreshing = false;
    }
    indicator.style.top = "-50px";
    indicator.style.opacity = "0";
  });
}

/* ── Init ──────────────────────────────────────────── */

async function loadAllCities() {
  const loadingBar = document.getElementById("loadingBar");
  let loaded = 0;
  const total = CITIES.length;

  const promises = CITIES.map(async city => {
    try {
      const [historical, forecast, aqi, flood] = await Promise.all([
        fetchHistorical(city),
        fetchForecast(city),
        fetchAirQuality(city).catch(() => null),
        fetchFloodRisk(city).catch(() => null),
      ]);
      const daily = mergeDailyData(historical, forecast);
      const hourly = extractHourly(forecast);
      const aqiHourly = aqi ? extractAqiHourly(aqi) : [];
      cityDataMap[city.name] = {
        daily, hourly,
        current: forecast.current || null,
        aqi: aqi?.current || null,
        aqiHourly,
        flood: flood?.daily || null,
      };
    } catch (err) {
      console.error(`Error loading ${city.name}:`, err);
      cityDataMap[city.name] = { daily: [], hourly: [], current: null, aqi: null, aqiHourly: [], flood: null };
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

  // Setup pull-to-refresh
  setupPullToRefresh();
}

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

init();
