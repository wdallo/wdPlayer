# wdPlayer

Lightweight, dependency-free HTML5 video player with quality switching, ASS/VTT subtitles, resume playback, URL-encoded configuration, and full responsive/mobile support.

![wdPlayer screenshot 1](screenShots/1.jpg)
![wdPlayer screenshot 2](screenShots/2.jpg)
![wdPlayer screenshot 3](screenShots/3.jpg)

## Files

```
index.html        — Demo page with player, features, and usage docs
embed.html        — Standalone player shell (use this in iframes or directly)
generator.html    — Visual URL builder (no JSON required)
css/wdPlayer.css  — Player styles
css/pages.css     — Shared styles for index.html and generator.html
js/wdPlayer.js    — All player logic (IIFE, no dependencies)
js/octopus/       — SubtitlesOctopus (lazy-loaded only when ASS is used)
subtitles/        — Example subtitle files
```

## Usage

### 1. Direct URL — single video

```
embed.html?v=https://example.com/video.mp4
```

Type is auto-detected from the file extension (`.mp4`, `.webm`, `.ogg`).

---

### 2. `?sources=` param — plain JSON

Pass sources and subtitles directly as JSON. The player will encode and redirect to `?v=BASE64` automatically.

```
embed.html?sources=[{"label":"1080p","src":"https://…/video.mp4","type":"video/mp4"},
                    {"label":"720p", "src":"https://…/720.mp4",  "type":"video/mp4"}]
          &subtitles=[{"label":"English","src":"subtitles/en.vtt","type":"vtt","srclang":"en"}]
```

Or build the URL in JavaScript:

```js
const sources = [
  { label: "1080p", src: "https://…/video.mp4", type: "video/mp4" },
];
const subtitles = [
  { label: "English", src: "subtitles/en.vtt", type: "vtt", srclang: "en" },
];

const url =
  "embed.html" +
  "?sources=" +
  encodeURIComponent(JSON.stringify(sources)) +
  "&subtitles=" +
  encodeURIComponent(JSON.stringify(subtitles));
```

---

### 3. `?v=BASE64` — encoded config

Use the **URL Generator** (`generator.html`) to build a Base64-encoded URL visually, or encode manually:

```js
const cfg = {
  sources: [
    { label: "1080p", src: "https://…/1080.mp4", type: "video/mp4" },
    { label: "720p", src: "https://…/720.mp4", type: "video/mp4" },
  ],
  subtitles: [
    { label: "English", src: "subtitles/en.vtt", type: "vtt", srclang: "en" },
    { label: "English", src: "subtitles/en.ass", type: "ass", srclang: "en" },
  ],
};

// Minify keys before encoding (sources→v, subtitles→u, label→l, src→s, type→t, srclang→sl)
const mini = {
  v: cfg.sources.map(({ label: l, src: s, type: t }) => ({ l, s, t })),
  u: cfg.subtitles.map(({ label: l, src: s, type: t, srclang: sl }) =>
    sl ? { l, s, t, sl } : { l, s, t },
  ),
};

// Unicode-safe Base64 encoding
const url =
  "embed.html?v=" +
  btoa(
    encodeURIComponent(JSON.stringify(mini)).replace(
      /%([0-9A-F]{2})/gi,
      (_, p1) => String.fromCharCode(parseInt(p1, 16)),
    ),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
```

---

### 4. iFrame embed

```html
<iframe
  src="embed.html?v=BASE64"
  width="560"
  height="315"
  allowfullscreen
  style="border:none;"
>
</iframe>
```

Copy the iFrame snippet directly from the **Encoded → iFrame** tab in the generator.

---

## Subtitle formats

| Format | How                      | Notes                                       |
| ------ | ------------------------ | ------------------------------------------- |
| VTT    | Native `<track>` element | Validated with HEAD request before adding   |
| ASS    | SubtitlesOctopus         | Lazy-loaded from `js/octopus/` on first use |

---

## Keyboard shortcuts

| Key                | Action            |
| ------------------ | ----------------- |
| `Space` / click    | Play / Pause      |
| `F` / double-click | Toggle fullscreen |
| `M`                | Toggle mute       |
| `←` `→`            | Seek ±5 s         |
| `↑` `↓`            | Volume ±10%       |
| Right-click        | Info context menu |

---

## Auto quality

On load the player measures bandwidth via `navigator.connection.downlink` (or a timed fetch probe as fallback) and picks the best source. It re-checks every 5 seconds and reacts to `connection` change events. Manual override is available via the quality button.

---

## Resume playback

The player automatically saves the current position to `localStorage` every 5 seconds (keyed by the `?v=` param). On the next visit, if a saved position is found that is more than 5 seconds in and not within 10 seconds of the end, a **"Resume from X:XX?"** toast appears with two options:

- **Resume** — seeks to the saved position
- **×** — dismisses and clears the saved position

On desktop the toast appears in the bottom-left corner. On mobile (≤ 480 px) it moves to the top of the player to avoid overlapping the play button and the two-row controls bar. The toast disappears automatically when playback starts. The saved position is cleared when the video finishes.

---

## Responsive / Mobile

The player and both pages adapt to all screen sizes:

| Breakpoint | Changes                                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| ≤ 768 px   | Larger touch targets (36 px min), slightly smaller gaps                                                                                              |
| ≤ 480 px   | Controls switch to a **two-row layout** — progress bar full-width on top, buttons on the bottom row; volume slider hidden; quality button auto-sized |

Additional touch optimisations applied at all sizes:

- `touch-action: manipulation` on every interactive element (no 300 ms tap delay)
- All `:hover` styles are wrapped in `@media (hover: hover)` so they never get "stuck" after a tap on touch screens
- Thumbnail tooltip hidden on touch (swipe seek isn't possible anyway)
- Resume toast repositioned to the top of the player on mobile

---

## No server required

All configuration is self-contained in the URL. Works in incognito, on other devices, or shared as a plain link.
