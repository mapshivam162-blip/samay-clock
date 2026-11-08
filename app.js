/* ============================================================
   Samay — clock, alarm, timer, stopwatch, world clock
   Vanilla JS · localStorage · Web Audio · offline ready
   ============================================================ */

(() => {
  "use strict";

  /* ------------------------------------------------------------
     Helpers
  ------------------------------------------------------------ */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const pad = (n) => String(n).padStart(2, "0");
  const uid = () =>
    Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

  const esc = (value) =>
    String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));

  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* storage full / private mode — app still works in memory */
      }
    },
  };

  /* ------------------------------------------------------------
     Time zone city database
  ------------------------------------------------------------ */

  const CITIES = [
    ["Kolkata", "India", "Asia/Kolkata"],
    ["Mumbai", "India", "Asia/Mumbai"],
    ["Karachi", "Pakistan", "Asia/Karachi"],
    ["Dhaka", "Bangladesh", "Asia/Dhaka"],
    ["Kathmandu", "Nepal", "Asia/Kathmandu"],
    ["Colombo", "Sri Lanka", "Asia/Colombo"],
    ["Dubai", "UAE", "Asia/Dubai"],
    ["Riyadh", "Saudi Arabia", "Asia/Riyadh"],
    ["Tehran", "Iran", "Asia/Tehran"],
    ["Baghdad", "Iraq", "Asia/Baghdad"],
    ["Jerusalem", "Israel", "Asia/Jerusalem"],
    ["Istanbul", "Turkey", "Europe/Istanbul"],
    ["Moscow", "Russia", "Europe/Moscow"],
    ["Beijing", "China", "Asia/Shanghai"],
    ["Hong Kong", "China", "Asia/Hong_Kong"],
    ["Taipei", "Taiwan", "Asia/Taipei"],
    ["Singapore", "Singapore", "Asia/Singapore"],
    ["Bangkok", "Thailand", "Asia/Bangkok"],
    ["Jakarta", "Indonesia", "Asia/Jakarta"],
    ["Kuala Lumpur", "Malaysia", "Asia/Kuala_Lumpur"],
    ["Manila", "Philippines", "Asia/Manila"],
    ["Seoul", "South Korea", "Asia/Seoul"],
    ["Tokyo", "Japan", "Asia/Tokyo"],
    ["Sydney", "Australia", "Australia/Sydney"],
    ["Melbourne", "Australia", "Australia/Melbourne"],
    ["Auckland", "New Zealand", "Pacific/Auckland"],
    ["Honolulu", "USA", "Pacific/Honolulu"],
    ["Anchorage", "USA", "America/Anchorage"],
    ["Los Angeles", "USA", "America/Los_Angeles"],
    ["Denver", "USA", "America/Denver"],
    ["Chicago", "USA", "America/Chicago"],
    ["New York", "USA", "America/New_York"],
    ["Toronto", "Canada", "America/Toronto"],
    ["Mexico City", "Mexico", "America/Mexico_City"],
    ["Bogotá", "Colombia", "America/Bogota"],
    ["Lima", "Peru", "America/Lima"],
    ["Santiago", "Chile", "America/Santiago"],
    ["São Paulo", "Brazil", "America/Sao_Paulo"],
    ["Buenos Aires", "Argentina", "America/Argentina/Buenos_Aires"],
    ["London", "United Kingdom", "Europe/London"],
    ["Dublin", "Ireland", "Europe/Dublin"],
    ["Lisbon", "Portugal", "Europe/Lisbon"],
    ["Paris", "France", "Europe/Paris"],
    ["Berlin", "Germany", "Europe/Berlin"],
    ["Madrid", "Spain", "Europe/Madrid"],
    ["Rome", "Italy", "Europe/Rome"],
    ["Amsterdam", "Netherlands", "Europe/Amsterdam"],
    ["Zurich", "Switzerland", "Europe/Zurich"],
    ["Stockholm", "Sweden", "Europe/Stockholm"],
    ["Oslo", "Norway", "Europe/Oslo"],
    ["Copenhagen", "Denmark", "Europe/Copenhagen"],
    ["Helsinki", "Finland", "Europe/Helsinki"],
    ["Athens", "Greece", "Europe/Athens"],
    ["Cairo", "Egypt", "Africa/Cairo"],
    ["Johannesburg", "South Africa", "Africa/Johannesburg"],
    ["Lagos", "Nigeria", "Africa/Lagos"],
    ["Nairobi", "Kenya", "Africa/Nairobi"],
  ].map(([city, country, tz]) => ({ city, country, tz }));

  const localZone =
    (Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata");

  const cityInfo = (tz) => {
    const found = CITIES.find((c) => c.tz === tz);
    if (found) return found;
    const parts = tz.split("/");
    return {
      city: (parts[parts.length - 1] || tz).replace(/_/g, " "),
      country: parts[0] || "World",
    };
  };

  /* ------------------------------------------------------------
     Settings
  ------------------------------------------------------------ */

  const DEFAULT_SETTINGS = {
    use24: false,
    theme: "dark",
    skin: "material",
    sound: true,
    uiSound: true,
    snoozeMin: 5,
    cities: [
      localZone,
      "Europe/London",
      "Asia/Tokyo",
      "America/New_York",
    ],
  };

  const storedSettings = store.get("samay.settings", {}) || {};
  const settings = Object.assign({}, DEFAULT_SETTINGS, storedSettings);

  if (!Array.isArray(settings.cities) || settings.cities.length === 0) {
    settings.cities = [...new Set(DEFAULT_SETTINGS.cities)];
  }
  settings.cities = [...new Set(settings.cities.filter((z) => typeof z === "string"))];

  const saveSettings = () => store.set("samay.settings", settings);

  const themeColor = $("#themeColor");

  function applySettings() {
    const skin = settings.skin === "ios" ? "ios" : "material";
    const theme = settings.theme === "light" ? "light" : "dark";
    document.documentElement.dataset.skin = skin;
    document.documentElement.dataset.theme = theme;
    themeColor.setAttribute(
      "content",
      (skin === "ios"
        ? (theme === "dark" ? "#000000" : "#f2f2f7")
        : (theme === "dark" ? "#0a0e13" : "#eef2f8"))
    );
    $("#set24").checked = settings.use24;
    $("#setSound").checked = settings.sound;
    $("#setUiSound").checked = settings.uiSound;
    $$("#themeSeg button").forEach((btn) =>
      btn.classList.toggle(
        "on",
        btn.dataset.skin === skin && btn.dataset.theme === theme
      )
    );
    $$("#snoozeSeg button").forEach((btn) =>
      btn.classList.toggle("on", Number(btn.dataset.min) === settings.snoozeMin)
    );
  }

  /* ------------------------------------------------------------
     Time formatting
  ------------------------------------------------------------ */

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function fmtAlarm(hh, mm) {
    if (settings.use24) return { time: `${pad(hh)}:${pad(mm)}`, ampm: "" };
    return { time: `${hh % 12 || 12}:${pad(mm)}`, ampm: hh >= 12 ? "PM" : "AM" };
  }

  function timeInZone(tz, date = new Date()) {
    try {
      return new Intl.DateTimeFormat(settings.use24 ? "en-GB" : "en-US", {
        timeZone: tz,
        hour: settings.use24 ? "2-digit" : "numeric",
        minute: "2-digit",
        hour12: !settings.use24,
      }).format(date);
    } catch {
      return "--:--";
    }
  }

  function tzOffsetMinutes(tz, date = new Date()) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
        .formatToParts(date)
        .reduce((acc, p) => {
          acc[p.type] = p.value;
          return acc;
        }, {});

      const asUTC = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second)
      );
      return Math.round((asUTC - date.getTime()) / 60000);
    } catch {
      return -date.getTimezoneOffset();
    }
  }

  function zoneDayDiff(tz, date = new Date()) {
    try {
      const dayNum = (zone) => {
        const s = new Intl.DateTimeFormat("en-CA", {
          timeZone: zone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(date);
        return Date.parse(s + "T00:00:00Z") / 86400000;
      };
      return Math.round(dayNum(tz) - dayNum(localZone));
    } catch {
      return 0;
    }
  }

  function offsetLabel(tz) {
    const diff = tzOffsetMinutes(tz) + new Date().getTimezoneOffset();
    if (diff === 0) return "Same time";
    const sign = diff > 0 ? "+" : "−";
    const abs = Math.abs(diff);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${sign}${h}${m ? ":" + pad(m) : ""}`;
  }

  function formatTimer(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  function fmtStopwatch(ms) {
    const hundredths = Math.floor(ms / 10) % 100;
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / 60000) % 60;
    const hours = Math.floor(ms / 3600000);
    const base =
      hours > 0
        ? `${hours}:${pad(minutes)}:${pad(seconds)}`
        : `${pad(minutes)}:${pad(seconds)}`;
    return { base, cent: "." + pad(hundredths) };
  }

  /* ------------------------------------------------------------
     Audio + vibration
  ------------------------------------------------------------ */

  let audioCtx = null;

  function ensureAudio() {
    try {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioCtx = new AC();
      }
      if (audioCtx.state === "suspended") audioCtx.resume();
      return audioCtx;
    } catch {
      return null;
    }
  }

  document.addEventListener("pointerdown", () => ensureAudio(), { once: true });

  function tone(freq, delay, duration, volume = 0.2, type = "sine", slideTo = null) {
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      const start = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(1, slideTo),
          start + duration
        );
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    } catch {
      /* no audio available */
    }
  }

  function vibrate(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }

  function stopVibrate() {
    try {
      if (navigator.vibrate) navigator.vibrate(0);
    } catch {
      /* ignore */
    }
  }

  function alarmPattern() {
    tone(880, 0, 0.22, 0.22, "sine");
    tone(660, 0.25, 0.22, 0.18, "sine");
    tone(980, 0.5, 0.3, 0.22, "sine");
  }

  function donePattern() {
    tone(1046.5, 0, 0.16, 0.2, "sine");
    tone(1318.5, 0.16, 0.18, 0.2, "sine");
    tone(1568, 0.34, 0.32, 0.18, "sine");
  }

  /* ------------------------------------------------------------
      Ringtone library — 6 built-in tones
   ------------------------------------------------------------ */

  const RINGTONES = [
    {
      id: "classic",
      name: "Classic",
      period: 1600,
      pattern: () => {
        tone(880, 0, 0.22, 0.22, "sine");
        tone(660, 0.25, 0.22, 0.18, "sine");
        tone(980, 0.5, 0.3, 0.22, "sine");
      },
    },
    {
      id: "radar",
      name: "Radar",
      period: 1800,
      pattern: () => {
        tone(1046.5, 0, 0.14, 0.2, "sine");
        tone(1046.5, 0.18, 0.14, 0.2, "sine");
        tone(1318.5, 0.36, 0.34, 0.2, "sine");
        tone(1046.5, 0.78, 0.14, 0.2, "sine");
        tone(783.9, 0.96, 0.5, 0.2, "sine");
      },
    },
    {
      id: "chime",
      name: "Chime",
      period: 2000,
      pattern: () => {
        tone(1567.98, 0, 0.5, 0.16, "sine");
        tone(1318.5, 0.3, 0.5, 0.16, "sine");
        tone(987.77, 0.6, 0.9, 0.16, "sine");
        tone(2637, 0, 0.6, 0.05, "sine");
      },
    },
    {
      id: "siren",
      name: "Siren",
      period: 1800,
      pattern: () => {
        tone(600, 0, 0.8, 0.22, "sawtooth", 1200);
        tone(1200, 0.85, 0.8, 0.22, "sawtooth", 600);
      },
    },
    {
      id: "digital",
      name: "Digital",
      period: 1700,
      pattern: () => {
        tone(900, 0, 0.09, 0.2, "square");
        tone(900, 0.12, 0.09, 0.2, "square");
        tone(900, 0.24, 0.09, 0.2, "square");
        tone(1200, 0.4, 0.09, 0.2, "square");
        tone(1200, 0.52, 0.09, 0.2, "square");
      },
    },
    {
      id: "dawn",
      name: "Dawn",
      period: 2200,
      pattern: () => {
        tone(523.25, 0, 0.35, 0.18, "sine");
        tone(659.26, 0.4, 0.35, 0.18, "sine");
        tone(783.99, 0.8, 0.5, 0.18, "sine");
        tone(1046.5, 1.3, 0.8, 0.16, "sine");
      },
    },
  ];

  const TONE_IDS = new Set(RINGTONES.map((t) => t.id));
  const toneById = (id) => RINGTONES.find((t) => t.id === id) || RINGTONES[0];

  function playPattern(def) {
    if (!settings.sound) return;
    def.pattern();
  }

  let previewStopper = null;

  function previewTone(toneId) {
    if (!settings.sound) {
      toast("Alarm sound is off in settings");
      return;
    }
    previewStopper && previewStopper();
    previewStopper = null;
    const def = toneById(toneId);
    playPattern(def);
    const iv = setInterval(() => playPattern(def), def.period);
    previewStopper = () => clearInterval(iv);
    clearTimeout(previewStopper.t);
    previewStopper.t = setTimeout(() => {
      clearInterval(iv);
      previewStopper = null;
    }, def.period * 2 + 200);
  }

  /* ------------------------------------------------------------
     Toast
  ------------------------------------------------------------ */

  let toastTimer = null;

  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }

  /* ------------------------------------------------------------
     Tabs
  ------------------------------------------------------------ */

  const PAGE_TITLES = {
    alarm: "Alarm",
    clock: "Clock",
    timer: "Timer",
    stopwatch: "Stopwatch",
  };

  function setTab(name) {
    $$(".tab").forEach((tab) =>
      tab.classList.toggle("active", tab.dataset.tab === name)
    );
    $$(".page").forEach((page) =>
      page.classList.toggle("active", page.dataset.page === name)
    );
    document.title = `Samay · ${PAGE_TITLES[name] || "Clock"}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  $$(".tab").forEach((tab) =>
    tab.addEventListener("click", () => setTab(tab.dataset.tab))
  );

  /* ------------------------------------------------------------
     Clock + world clock
  ------------------------------------------------------------ */

  function renderClock(date = new Date()) {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";

    if (!settings.use24) hours = hours % 12 || 12;

    $("#clockMain").textContent = `${settings.use24 ? pad(hours) : hours}:${pad(minutes)}`;
    $("#clockSec").textContent = `:${pad(date.getSeconds())}`;
    $("#clockAmPm").textContent = settings.use24 ? "" : ampm;
    $("#clockDate").textContent = date.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  function updateWorldTimes() {
    const now = new Date();
    $$(".world-item", $("#worldList")).forEach((row) => {
      const tz = row.dataset.zone;
      const timeEl = $(".city-time", row);
      const metaEl = $(".city-meta", row);
      if (!timeEl || !metaEl) return;

      timeEl.textContent = timeInZone(tz, now);

      const diff = zoneDayDiff(tz, now);
      const day =
        diff === 1 ? "Tomorrow" : diff === -1 ? "Yesterday" : "";
      const offset = offsetLabel(tz);
      metaEl.textContent = day ? `${day} · ${offset}` : offset;
    });
  }

  function renderWorldList() {
    const list = $("#worldList");
    if (!list) return;

    list.innerHTML = settings.cities
      .map((tz) => {
        const info = cityInfo(tz);
        const isLocal = tz === localZone;
        return `<li class="world-item" data-zone="${esc(tz)}">
          <div class="world-main">
            <div class="city-name">${esc(info.city)}${isLocal ? '<span class="badge">Local</span>' : ""}</div>
            <div class="city-meta"></div>
          </div>
          <div class="city-time"></div>
          <button class="city-del" data-del="${esc(tz)}" aria-label="Remove ${esc(info.city)}">✕</button>
        </li>`;
      })
      .join("");

    updateWorldTimes();
  }

  $("#worldList").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-del]");
    if (!btn) return;
    const tz = btn.dataset.del;
    settings.cities = settings.cities.filter((z) => z !== tz);
    saveSettings();
    renderWorldList();
    toast(`${cityInfo(tz).city} removed`);
  });

  /* ------------------------------------------------------------
     Alarm storage + scheduling
  ------------------------------------------------------------ */

  let alarms = store.get("samay.alarms", null);

  if (!Array.isArray(alarms)) {
    alarms = [
      {
        id: uid(),
        hh: 7,
        mm: 0,
        label: "Wake up",
        days: [1, 2, 3, 4, 5],
        enabled: false,
        snoozeUntil: null,
      },
    ];
  }

  alarms = alarms
    .filter((a) => a && typeof a.hh === "number" && typeof a.mm === "number")
    .map((a) => ({
      id: a.id || uid(),
      hh: Math.min(23, Math.max(0, a.hh)),
      mm: Math.min(59, Math.max(0, a.mm)),
      label: typeof a.label === "string" ? a.label : "",
      days: Array.isArray(a.days) ? a.days.filter((d) => d >= 0 && d <= 6) : [],
      enabled: a.enabled !== false,
      tone: TONE_IDS.has(a.tone) ? a.tone : "classic",
      snoozeUntil: typeof a.snoozeUntil === "number" ? a.snoozeUntil : null,
      lastKey: a.lastKey || null,
    }));

  const saveAlarms = () => store.set("samay.alarms", alarms);

  function daySummary(days) {
    if (!days.length) return "Once";
    if (days.length === 7) return "Every day";
    const set = new Set(days);
    if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) {
      return "Weekdays";
    }
    if (days.length === 2 && set.has(0) && set.has(6)) return "Weekends";
    return [...days]
      .sort((a, b) => a - b)
      .map((d) => DAY_NAMES[d])
      .join(", ");
  }

  function nextOccurrence(alarm, nowMs = Date.now()) {
    if (alarm.snoozeUntil && alarm.snoozeUntil > nowMs) return alarm.snoozeUntil;
    if (!alarm.enabled) return null;

    const base = new Date();
    for (let i = 0; i < 8; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      d.setHours(alarm.hh, alarm.mm, 0, 0);
      if (d.getTime() <= nowMs) continue;
      if (alarm.days.length && !alarm.days.includes(d.getDay())) continue;
      return d.getTime();
    }
    return null;
  }

  function updateNextAlarm() {
    const el = $("#nextAlarm");
    if (!el) return;

    const now = Date.now();
    let best = null;

    alarms.forEach((alarm) => {
      const at = nextOccurrence(alarm, now);
      if (at && (!best || at < best.at)) best = { at, alarm };
    });

    if (!best) {
      el.textContent = "No alarms set";
      return;
    }

    const f = fmtAlarm(best.alarm.hh, best.alarm.mm);
    const diff = Math.max(60000, best.at - now);
    const mins = Math.round(diff / 60000);
    let rel;
    if (mins < 60) rel = `${mins} min`;
    else if (mins < 1440) rel = `${Math.floor(mins / 60)}h ${mins % 60}m`;
    else rel = `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;

    el.innerHTML = `⏰ <b>${esc(f.time)} ${esc(f.ampm)}</b> · in ${esc(rel)}`;
  }

  function renderAlarms() {
    const list = $("#alarmList");
    const empty = $("#alarmEmpty");
    if (!list) return;

    if (!alarms.length) {
      list.innerHTML = "";
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    alarms.sort((a, b) => a.hh * 60 + a.mm - (b.hh * 60 + b.mm));

    list.innerHTML = alarms
      .map((a) => {
        const f = fmtAlarm(a.hh, a.mm);
        const snoozed = a.snoozeUntil && a.snoozeUntil > Date.now();
        return `<li class="alarm-item${a.enabled ? "" : " off"}" data-id="${esc(a.id)}">
          <button class="alarm-main" type="button" data-action="edit">
            <div class="alarm-time">${esc(f.time)}${f.ampm ? `<span class="alarm-ampm">${esc(f.ampm)}</span>` : ""}</div>
            <div class="alarm-info">
              <div class="alarm-label">${esc(a.label) || "Alarm"}</div>
              <div class="alarm-days">${esc(daySummary(a.days))}${snoozed ? " · Snoozed" : ""}</div>
            </div>
          </button>
          <label class="switch">
            <input type="checkbox" data-action="toggle" ${a.enabled ? "checked" : ""} aria-label="Toggle alarm" />
            <span></span>
          </label>
        </li>`;
      })
      .join("");
  }

  $("#alarmList").addEventListener("click", (event) => {
    if (event.target.closest(".switch")) return;
    const item = event.target.closest(".alarm-item");
    if (!item) return;
    const alarm = alarms.find((a) => a.id === item.dataset.id);
    if (alarm) openAlarmSheet(alarm);
  });

  $("#alarmList").addEventListener("change", (event) => {
    if (!event.target.matches('[data-action="toggle"]')) return;
    const item = event.target.closest(".alarm-item");
    const alarm = item && alarms.find((a) => a.id === item.dataset.id);
    if (!alarm) return;

    alarm.enabled = event.target.checked;
    if (!alarm.enabled) alarm.snoozeUntil = null;
    alarm.lastKey = null;
    saveAlarms();
    renderAlarms();
    updateNextAlarm();
  });

  /* ------------------------------------------------------------
     Alarm ringing
  ------------------------------------------------------------ */

  let ringingAlarm = null;
  let alarmLoop = null;

  function currentMinuteKey(date = new Date()) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
  }

  function startAlarmSound(toneId) {
    stopAlarmSound();
    if (!settings.sound) return;
    const def = toneById(toneId);
    playPattern(def);
    alarmLoop = setInterval(() => {
      if (settings.sound) playPattern(def);
    }, def.period);
  }

  function stopAlarmSound() {
    clearInterval(alarmLoop);
    alarmLoop = null;
    previewStopper && previewStopper();
    previewStopper = null;
  }

  function fireAlarm(alarm) {
    const now = new Date();
    alarm.lastKey = currentMinuteKey(now);

    if (alarm.days.length === 0) alarm.enabled = false;

    ringingAlarm = alarm;

    const f = fmtAlarm(alarm.hh, alarm.mm);
    $("#ringTime").textContent = f.time;
    $("#ringLabel").textContent = alarm.label || "Alarm";
    $("#ringDate").textContent = `${f.ampm ? f.ampm + " · " : ""}${now.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
    })}`;
    $("#ringSnooze").textContent = `Snooze ${settings.snoozeMin || 5} min`;
    $("#ringOverlay").hidden = false;

    startAlarmSound(alarm.tone);
    vibrate([500, 250, 500, 250, 800]);
  }

  $("#ringDismiss").addEventListener("click", () => {
    stopAlarmSound();
    stopVibrate();
    if (ringingAlarm) {
      ringingAlarm.snoozeUntil = null;
      ringingAlarm = null;
    }
    $("#ringOverlay").hidden = true;
    saveAlarms();
    renderAlarms();
    updateNextAlarm();
  });

  $("#ringSnooze").addEventListener("click", () => {
    stopAlarmSound();
    stopVibrate();
    if (ringingAlarm) {
      const mins = settings.snoozeMin || 5;
      ringingAlarm.snoozeUntil = Date.now() + mins * 60 * 1000;
      ringingAlarm.lastKey = null;
      ringingAlarm = null;
      toast(`Snoozed for ${mins} minutes`);
    }
    $("#ringOverlay").hidden = true;
    saveAlarms();
    renderAlarms();
    updateNextAlarm();
  });

  function checkAlarms(now = new Date()) {
    const key = currentMinuteKey(now);
    let changed = false;

    for (const alarm of alarms) {
      if (alarm.snoozeUntil) {
        if (now.getTime() >= alarm.snoozeUntil) {
          alarm.snoozeUntil = null;
          fireAlarm(alarm);
          changed = true;
          break;
        }
        continue;
      }

      if (!alarm.enabled) continue;
      if (alarm.hh !== now.getHours() || alarm.mm !== now.getMinutes()) continue;
      if (alarm.lastKey === key) continue;
      if (alarm.days.length && !alarm.days.includes(now.getDay())) continue;

      fireAlarm(alarm);
      changed = true;
      break;
    }

    if (changed) {
      saveAlarms();
      renderAlarms();
      updateNextAlarm();
    }
  }

  /* ------------------------------------------------------------
     Alarm editor sheet
  ------------------------------------------------------------ */

  const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
  let editingAlarmId = null;
  let selectedDays = [];
  let selectedTone = "classic";

  function renderToneChips() {
    const list = $("#toneList");
    list.innerHTML = RINGTONES.map(
      (t) => `<button type="button" class="chip tone-chip${t.id === selectedTone ? " on" : ""}" data-tone="${t.id}" aria-pressed="${t.id === selectedTone}">${t.name}</button>`
    ).join("");
  }

  $("#toneList").addEventListener("click", (event) => {
    const chip = event.target.closest("[data-tone]");
    if (!chip) return;
    selectedTone = chip.dataset.tone;
    renderToneChips();
  });

  $("#tonePreview").addEventListener("click", () => previewTone(selectedTone));

  function buildDayChips() {
    const row = $("#dayRow");
    DAY_LETTERS.forEach((letter, index) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "day-chip";
      chip.textContent = letter;
      chip.dataset.day = String(index);
      chip.setAttribute("aria-label", DAY_NAMES[index]);
      chip.addEventListener("click", () => {
        if (selectedDays.includes(index)) {
          selectedDays = selectedDays.filter((d) => d !== index);
        } else {
          selectedDays.push(index);
        }
        renderDayChips();
      });
      row.appendChild(chip);
    });
  }

  function renderDayChips() {
    $$(".day-chip", $("#dayRow")).forEach((chip) => {
      const day = Number(chip.dataset.day);
      chip.classList.toggle("on", selectedDays.includes(day));
      chip.setAttribute("aria-pressed", String(selectedDays.includes(day)));
    });
  }

  function openAlarmSheet(alarm) {
    editingAlarmId = alarm ? alarm.id : null;

    $("#alarmSheetTitle").textContent = alarm ? "Edit alarm" : "New alarm";

    const now = new Date();
    $("#alarmTime").value = `${pad(alarm ? alarm.hh : now.getHours())}:${pad(
      alarm ? alarm.mm : now.getMinutes()
    )}`;
    $("#alarmLabel").value = alarm ? alarm.label : "";
    selectedDays = alarm ? [...alarm.days] : [];
    selectedTone = alarm ? alarm.tone : "classic";
    renderDayChips();
    renderToneChips();

    $("#alarmDelete").hidden = !alarm;
    openSheet("alarmSheet");
  }

  function saveAlarmFromSheet() {
    const value = $("#alarmTime").value;
    if (!value) {
      toast("Pick a time first");
      return;
    }

    const [hh, mm] = value.split(":").map(Number);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) {
      toast("That time looks invalid");
      return;
    }

    const label = $("#alarmLabel").value.trim();

    if (editingAlarmId) {
      const alarm = alarms.find((a) => a.id === editingAlarmId);
      if (alarm) {
        alarm.hh = hh;
        alarm.mm = mm;
        alarm.label = label;
        alarm.days = [...selectedDays];
        alarm.tone = selectedTone;
        alarm.enabled = true;
        alarm.snoozeUntil = null;
        alarm.lastKey = null;
      }
    } else {
      alarms.push({
        id: uid(),
        hh,
        mm,
        label,
        days: [...selectedDays],
        tone: selectedTone,
        enabled: true,
        snoozeUntil: null,
        lastKey: null,
      });
    }

    saveAlarms();
    renderAlarms();
    updateNextAlarm();
    closeSheets();
    toast(editingAlarmId ? "Alarm updated" : "Alarm set");
  }

  $("#addAlarmBtn").addEventListener("click", () => openAlarmSheet(null));
  $("#alarmSave").addEventListener("click", saveAlarmFromSheet);

  $("#alarmDelete").addEventListener("click", () => {
    if (!editingAlarmId) return;
    alarms = alarms.filter((a) => a.id !== editingAlarmId);
    saveAlarms();
    renderAlarms();
    updateNextAlarm();
    closeSheets();
    toast("Alarm deleted");
  });

  /* ------------------------------------------------------------
     Sheets (generic)
  ------------------------------------------------------------ */

  function openSheet(id) {
    const sheet = document.getElementById(id);
    if (!sheet) return;
    sheet.classList.add("open");
    if (id === "settingsSheet") applySettings();
  }

  function closeSheets() {
    $$(".sheet-backdrop").forEach((sheet) => sheet.classList.remove("open"));
  }

  $$(".sheet-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop || event.target.closest("[data-close]")) {
        backdrop.classList.remove("open");
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSheets();
      if (!$("#timerOverlay").hidden) dismissTimer();
    }
  });

  $("#settingsBtn").addEventListener("click", () => openSheet("settingsSheet"));

  /* ------------------------------------------------------------
     Settings handlers
  ------------------------------------------------------------ */

  $("#set24").addEventListener("change", (event) => {
    settings.use24 = event.target.checked;
    saveSettings();
    renderClock();
    renderAlarms();
    renderWorldList();
    updateNextAlarm();
    if (!$("#ringOverlay").hidden && ringingAlarm) {
      const f = fmtAlarm(ringingAlarm.hh, ringingAlarm.mm);
      $("#ringTime").textContent = f.time;
    }
  });

  $("#themeSeg").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-skin]");
    if (!btn) return;
    settings.skin = btn.dataset.skin;
    settings.theme = btn.dataset.theme;
    saveSettings();
    applySettings();
  });

  $("#snoozeSeg").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-min]");
    if (!btn) return;
    settings.snoozeMin = Number(btn.dataset.min) || 5;
    saveSettings();
    applySettings();
  });

  $("#setSound").addEventListener("change", (event) => {
    settings.sound = event.target.checked;
    saveSettings();
    if (!settings.sound) {
      stopAlarmSound();
      clearInterval(doneLoop);
    }
  });

  $("#setUiSound").addEventListener("change", (event) => {
    settings.uiSound = event.target.checked;
    saveSettings();
    if (settings.uiSound) uiSound("toggle");
  });

  /* ------------------------------------------------------------
      UI sound effects — soft taps, blips, sweeps
   ------------------------------------------------------------ */

  function uiSound(kind = "tap") {
    if (!settings.uiSound) return;
    switch (kind) {
      case "toggle":
        tone(900, 0, 0.05, 0.06, "square");
        tone(1240, 0.06, 0.06, 0.05, "square");
        break;
      case "tab":
        tone(640, 0, 0.05, 0.05, "sine");
        tone(960, 0.05, 0.07, 0.045, "sine");
        break;
      case "open":
        tone(520, 0, 0.06, 0.05, "sine");
        tone(780, 0.07, 0.08, 0.045, "sine");
        break;
      default: // tap
        tone(1150, 0, 0.035, 0.05, "sine");
    }
  }

  document.addEventListener(
    "click",
    (event) => {
      if (event.target.closest(".switch")) {
        uiSound("toggle");
        return;
      }
      if (event.target.closest(".tab")) {
        uiSound("tab");
        return;
      }
      if (
        event.target.closest(".chip") ||
        event.target.closest(".day-chip") ||
        event.target.closest("button.btn")
      ) {
        uiSound("tap");
      }
    },
    true
  );

  /* ------------------------------------------------------------
     City picker
  ------------------------------------------------------------ */

  function renderCityPicker(query = "") {
    const q = query.trim().toLowerCase();
    const used = new Set(settings.cities);
    const results = CITIES.filter((c) => !used.has(c.tz)).filter((c) =>
      !q || `${c.city} ${c.country} ${c.tz}`.toLowerCase().includes(q)
    );

    $("#cityPicker").innerHTML = results.length
      ? results
          .map(
            (c) => `<li>
              <button type="button" data-tz="${esc(c.tz)}">
                <span>${esc(c.city)}<small>${esc(c.country)}</small></span>
                <span class="picker-time">${esc(timeInZone(c.tz))}</span>
              </button>
            </li>`
          )
          .join("")
      : `<li class="picker-empty">No matching cities — try another name.</li>`;
  }

  $("#addCityBtn").addEventListener("click", () => {
    $("#citySearch").value = "";
    renderCityPicker();
    openSheet("citySheet");
    setTimeout(() => $("#citySearch").focus(), 300);
  });

  $("#citySearch").addEventListener("input", (event) => {
    renderCityPicker(event.target.value);
  });

  $("#cityPicker").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-tz]");
    if (!btn) return;
    const tz = btn.dataset.tz;
    if (!settings.cities.includes(tz)) {
      settings.cities.push(tz);
      saveSettings();
      renderWorldList();
      toast(`${cityInfo(tz).city} added`);
    }
    closeSheets();
  });

  /* ------------------------------------------------------------
     Timer
  ------------------------------------------------------------ */

  const RING_CIRCUMFERENCE = 2 * Math.PI * 140;

  const timer = {
    total: 0,
    remaining: 0,
    running: false,
    endAt: 0,
    tick: null,
  };

  let doneLoop = null;

  function readTimerInputs() {
    const h = Math.min(99, Math.max(0, parseInt($("#tHours").value, 10) || 0));
    const m = Math.min(59, Math.max(0, parseInt($("#tMinutes").value, 10) || 0));
    const s = Math.min(59, Math.max(0, parseInt($("#tSeconds").value, 10) || 0));
    return (h * 3600 + m * 60 + s) * 1000;
  }

  function setTimerInputs(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    $("#tHours").value = String(h);
    $("#tMinutes").value = String(m);
    $("#tSeconds").value = String(s);
  }

  function updateTimerUI() {
    const idle = !timer.running && timer.remaining <= 0;
    const shownMs = idle ? readTimerInputs() : timer.remaining;

    $("#timerDisplay").textContent = formatTimer(shownMs);
    $("#timerSub").textContent = timer.running
      ? "Running"
      : timer.remaining > 0
      ? "Paused"
      : "Ready";

    const frac = timer.total > 0 ? Math.min(1, Math.max(0, timer.remaining / timer.total)) : 0;
    $("#timerRing").style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - frac));

    $("#timerStart").textContent = timer.running
      ? "Pause"
      : timer.remaining > 0
      ? "Resume"
      : "Start";

    $("#timerReset").hidden = idle;
    $("#timerPlus").hidden = !(timer.running || timer.remaining > 0);
    $("#timerSetup").hidden = !idle;
  }

  function timerFrame() {
    timer.remaining = Math.max(0, timer.endAt - Date.now());
    if (timer.remaining <= 0) {
      clearInterval(timer.tick);
      timer.tick = null;
      timer.running = false;
      timer.remaining = 0;
      updateTimerUI();
      timerFinished();
      return;
    }

    // soft tick during the last 5 seconds
    if (settings.uiSound) {
      const sec = Math.ceil(timer.remaining / 1000);
      if (sec !== lastTickSec) {
        if (lastTickSec !== null && sec <= 5 && sec > 0) {
          tone(1400, 0, 0.03, 0.07, "square");
        }
        lastTickSec = sec;
      }
    }

    updateTimerUI();
  }

  let lastTickSec = null;

  function beginTimer() {
    clearInterval(timer.tick);
    timer.endAt = Date.now() + timer.remaining;
    timer.running = true;
    lastTickSec = null;
    timer.tick = setInterval(timerFrame, 100);
    updateTimerUI();
  }

  function pauseTimer() {
    timer.remaining = Math.max(0, timer.endAt - Date.now());
    timer.running = false;
    clearInterval(timer.tick);
    timer.tick = null;
    updateTimerUI();
  }

  function resetTimer() {
    clearInterval(timer.tick);
    timer.tick = null;
    timer.running = false;
    timer.total = 0;
    timer.remaining = 0;
    $("#timerOverlay").hidden = true;
    clearInterval(doneLoop);
    doneLoop = null;
    stopVibrate();
    updateTimerUI();
  }

  let donePlays = 0;

  function timerFinished() {
    $("#timerOverlay").hidden = false;
    donePlays = 0;
    stopVibrate();
    vibrate([400, 200, 400, 200, 600]);
    clearInterval(doneLoop);

    const play = () => {
      donePlays += 1;
      if (settings.sound) donePattern();
      if (donePlays >= 8) {
        clearInterval(doneLoop);
        doneLoop = null;
      }
    };

    play();
    doneLoop = setInterval(play, 1400);
  }

  function dismissTimer() {
    $("#timerOverlay").hidden = true;
    clearInterval(doneLoop);
    doneLoop = null;
    stopVibrate();
    timer.total = 0;
    timer.remaining = 0;
    updateTimerUI();
  }

  $("#timerStart").addEventListener("click", () => {
    if (timer.running) {
      pauseTimer();
      return;
    }

    if (timer.remaining <= 0) {
      const ms = readTimerInputs();
      if (ms <= 0) {
        toast("Set a time first");
        return;
      }
      timer.total = ms;
      timer.remaining = ms;
    }

    beginTimer();
  });

  $("#timerReset").addEventListener("click", resetTimer);
  $("#timerDoneBtn").addEventListener("click", dismissTimer);

  $("#timerPlus").addEventListener("click", () => {
    if (timer.remaining <= 0) return;
    timer.remaining += 60000;
    timer.total += 60000;
    if (timer.running) timer.endAt += 60000;
    updateTimerUI();
    toast("Added 1 minute");
  });

  $("#presets").addEventListener("click", (event) => {
    const chip = event.target.closest("[data-min]");
    if (!chip) return;
    const minutes = Number(chip.dataset.min);
    timer.total = minutes * 60000;
    timer.remaining = timer.total;
    setTimerInputs(minutes * 60);
    beginTimer();
  });

  ["#tHours", "#tMinutes", "#tSeconds"].forEach((sel) => {
    $(sel).addEventListener("input", () => {
      if (!timer.running && timer.remaining <= 0) updateTimerUI();
    });
  });

  /* ------------------------------------------------------------
     Stopwatch
  ------------------------------------------------------------ */

  const stopwatch = {
    running: false,
    startAt: 0,
    elapsed: 0,
    lastLap: 0,
    laps: [],
    raf: null,
  };

  function stopwatchTotal() {
    return (
      stopwatch.elapsed +
      (stopwatch.running ? performance.now() - stopwatch.startAt : 0)
    );
  }

  function renderStopwatch() {
    const { base, cent } = fmtStopwatch(stopwatchTotal());
    $("#swMain").textContent = base;
    $("#swCent").textContent = cent;
  }

  function stopwatchLoop() {
    renderStopwatch();
    if (stopwatch.running) stopwatch.raf = requestAnimationFrame(stopwatchLoop);
  }

  function updateStopwatchButtons() {
    $("#swStart").textContent = stopwatch.running ? "Pause" : "Start";
    $("#swLap").disabled = !stopwatch.running;
  }

  function renderLaps() {
    const list = $("#lapList");
    if (!list) return;

    if (!stopwatch.laps.length) {
      list.innerHTML = "";
      return;
    }

    const times = stopwatch.laps.map((lap) => lap.lapTime);
    const min = Math.min(...times);
    const max = Math.max(...times);
    const multi = stopwatch.laps.length > 1;

    list.innerHTML = stopwatch.laps
      .slice()
      .reverse()
      .map((lap) => {
        const cls = multi && lap.lapTime === min
          ? " best"
          : multi && lap.lapTime === max
          ? " worst"
          : "";
        return `<li class="lap-item${cls}">
          <span class="lap-no">Lap ${lap.n}</span>
          <span class="lap-delta">+${esc(fmtStopwatch(lap.lapTime).base)}${esc(fmtStopwatch(lap.lapTime).cent)}</span>
          <span class="lap-total">${esc(fmtStopwatch(lap.total).base)}${esc(fmtStopwatch(lap.total).cent)}</span>
        </li>`;
      })
      .join("");
  }

  $("#swStart").addEventListener("click", () => {
    if (stopwatch.running) {
      stopwatch.elapsed += performance.now() - stopwatch.startAt;
      stopwatch.running = false;
      cancelAnimationFrame(stopwatch.raf);
    } else {
      stopwatch.startAt = performance.now();
      stopwatch.running = true;
      stopwatch.raf = requestAnimationFrame(stopwatchLoop);
      stopVibrate();
    }
    updateStopwatchButtons();
  });

  $("#swLap").addEventListener("click", () => {
    if (!stopwatch.running) return;
    const total = stopwatchTotal();
    stopwatch.laps.push({
      n: stopwatch.laps.length + 1,
      total,
      lapTime: total - stopwatch.lastLap,
    });
    stopwatch.lastLap = total;
    renderLaps();
  });

  $("#swReset").addEventListener("click", () => {
    cancelAnimationFrame(stopwatch.raf);
    stopwatch.running = false;
    stopwatch.elapsed = 0;
    stopwatch.startAt = 0;
    stopwatch.lastLap = 0;
    stopwatch.laps = [];
    renderStopwatch();
    renderLaps();
    updateStopwatchButtons();
  });

  /* ------------------------------------------------------------
     Main loop
  ------------------------------------------------------------ */

  let lastSecond = -1;

  function mainLoop() {
    const now = new Date();

    if (now.getSeconds() !== lastSecond) {
      lastSecond = now.getSeconds();
      renderClock(now);
      updateWorldTimes();
      updateNextAlarm();
    }

    checkAlarms(now);
  }

  /* ------------------------------------------------------------
     Boot
  ------------------------------------------------------------ */

  applySettings();
  buildDayChips();
  renderWorldList();
  renderAlarms();
  renderCityPicker();
  renderClock();
  updateNextAlarm();
  updateTimerUI();
  renderStopwatch();
  updateStopwatchButtons();
  setTab("clock");

  setInterval(mainLoop, 200);

  /* ------------------------------------------------------------
     PWA
  ------------------------------------------------------------ */

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        /* offline caching unavailable — app still works */
      });
    });
  }
})();
