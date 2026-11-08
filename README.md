# Samay — Clock App

Android ke Clock app jaisa ek modern, offline-ready web app. Pure HTML + CSS + Vanilla JS — koi framework, dependency ya build step nahi.

## Features

- ⏰ **Alarm** — add, edit, delete, repeat days (weekdays / weekends / custom), toggle on/off, selectable snooze length (5/10/15/30 min), full-screen ringing overlay with sound + vibration
- 🎵 **6 alarm ringtones** — Classic, Radar, Chime, Siren, Digital, Dawn (Web Audio se banaye) — per-alarm selection + live preview
- 🔊 **UI sound effects** — halki tap clicks, toggle blips, tab sweep aur timer ke last 5 seconds mein tick (settings se off kar sakte hain)
- 🍎 **Apple UI theme** — Material Dark / Light + **iOS Dark / iOS Light** skins, settings me 4-way picker
- 🕒 **Clock** — big digital time, 12/24-hour format, date, "next alarm in ..." pill
- 🌍 **World clock** — 55+ cities, live times, UTC offset aur day difference (Tomorrow / Yesterday), search & add
- ⏱️ **Timer** — circular progress ring, h/m/s input, quick presets, pause/resume, +1 min, completion chime + overlay
- ⏹️ **Stopwatch** — 1/100s precision, laps with fastest (green) / slowest (red) highlight
- 🌙 **4 themes** (Material + iOS skins, dark/light), settings persistence via `localStorage`
- 📱 **PWA** — installable, offline-cached via service worker
- Zero dependencies, works completely offline

## Run kaise karein

`manifest.json` / service worker ke liye HTTP server zaroori hai (`file://` par plain HTML bhi chalega, bas PWA features miss honge):

```bash
cd ~/projects/samay-clock
python -m http.server 8123
# browser me kholen: http://localhost:8123
```

## Files

| File | Kya hai |
| --- | --- |
| `index.html` | Structure — 4 pages, sheets, overlays |
| `style.css` | Theme, layout, animations |
| `app.js` | Saara logic — alarms, timer, stopwatch, world clock |
| `sw.js` + `manifest.json` | PWA (offline + install prompt) |
| `icon.svg`, `icon-192.png`, `icon-512.png` | App icons |

## Notes

- Alarms page khuli/tab background me ho to bhi ring karte hain (jab tab open ho). Browser band kar diye to ring nahi hoga — ye web apps ki limit hai.
- Alarm sound user ke pehle tap ke baad hi chal sakta hai (browser autoplay policy) — call `ensureAudio` kisi bhi tap par ho jata hai.
