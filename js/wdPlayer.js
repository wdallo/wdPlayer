(function () {
  // ─── Config ───────────────────────────────────────────────────────────────
  const TOOLTIPS_ENABLED = true; // set false to disable button tooltips
  // ──────────────────────────────────────────────────────────────────────────

  // Get the main player wrapper element
  const playerWrapper = document.getElementById("wdPlayer");

  // Create skeleton loader
  const skeleton = document.createElement("div");
  skeleton.id = "skeletonLoader";
  const shimmerEl = document.createElement("div");
  shimmerEl.className = "shimmer";
  skeleton.appendChild(shimmerEl);
  playerWrapper.appendChild(skeleton);

  // Buffering spinner overlay
  const bufferingSpinner = document.createElement("div");
  bufferingSpinner.id = "bufferingSpinner";
  const spinnerEl = document.createElement("div");
  spinnerEl.className = "spinner";
  bufferingSpinner.appendChild(spinnerEl);
  bufferingSpinner.style.display = "none";
  playerWrapper.appendChild(bufferingSpinner);

  // OSD toast factory — creates a brief on-screen notification element
  const makeOsdToast = (id) => {
    const el = document.createElement("div");
    el.id = id;
    playerWrapper.appendChild(el);
    let timer = null;
    return (text) => {
      el.textContent = text;
      el.classList.add("visible");
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove("visible"), 800);
    };
  };
  const _speedToastFn = makeOsdToast("speedToast");
  const showSpeedToast = (rate) => _speedToastFn(`${rate}\u00d7`);
  const showCcToast = makeOsdToast("ccToast");

  // SVG icon definitions for controls
  const icons = {
    play: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polygon points="8,5 19,12 8,19" /></svg>`,
    pause: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>`,
    fullscreen: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7 14H5v5h5v-2H7v-3zm0-4V7h3V5H5v5h2zm10 7h-3v2h5v-5h-2v3zm-3-12v2h3v3h2V5h-5z"/></svg>`,
    exitFullscreen: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`,
    cc: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 4H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm-8 7H9.5V10.5h-2v3h2V13H11v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-4a1 1 0 011-1h3a1 1 0 011 1v1zm7 0h-1.5V10.5h-2v3h2V13H18v1a1 1 0 01-1 1h-3a1 1 0 01-1-1v-4a1 1 0 011-1h3a1 1 0 011 1v1z"/></svg>`,
    volumeHigh: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`,
    volumeLow: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.5 12A4.5 4.5 0 0016 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>`,
    volumeMuted: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`,
  };

  // Helper to get an SVG icon element by name — parses once, then clones from cache
  const iconCache = {};
  const getIcon = (name) => {
    if (!icons.hasOwnProperty(name)) return document.createElement("span");
    if (!iconCache[name]) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(icons[name], "image/svg+xml");
      const svg = doc.querySelector("svg");
      if (!svg) {
        iconCache[name] = null;
        return document.createElement("span");
      }
      svg.setAttribute("width", "20");
      svg.setAttribute("height", "20");
      svg.setAttribute("fill", "currentColor");
      svg.style.display = "block";
      iconCache[name] = svg;
    }
    return iconCache[name].cloneNode(true);
  };

  // Update a CSS variable for the slider to allow custom progress coloring
  const updateRangeValue = (input) => {
    const min = input.min || 0;
    const max = input.max || 100;
    const percent = ((input.value - min) / (max - min)) * 100;
    input.style.setProperty("--value", percent + "%");
  };

  // Create the video element and add it to the player
  const video = document.createElement("video");
  video.id = "wd";
  video.preload = "auto";
  playerWrapper.appendChild(video);

  // Encode/decode config as URL-safe Base64 with minified keys (shorter URL)
  // Short keys: sources→v, subtitles→u, label→l, src→s, type→t, srclang→sl
  const _minify = (cfg) => ({
    v: cfg.sources.map(({ label: l, src: s, type: t }) => ({ l, s, t })),
    u: (cfg.subtitles ?? []).map(
      ({ label: l, src: s, type: t, srclang: sl }) =>
        sl ? { l, s, t, sl } : { l, s, t },
    ),
  });
  const _expand = (m) => ({
    sources: m.v.map(({ l, s, t }) => ({ label: l, src: s, type: t })),
    subtitles: (m.u ?? []).map(({ l, s, t, sl }) => ({
      label: l,
      src: s,
      type: t,
      ...(sl ? { srclang: sl } : {}),
    })),
  });
  const _encode = (cfg) =>
    btoa(
      encodeURIComponent(JSON.stringify(_minify(cfg))).replace(
        /%([0-9A-F]{2})/gi,
        (_, p1) => String.fromCharCode(parseInt(p1, 16)),
      ),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  const _decode = (str) => {
    const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    return _expand(
      JSON.parse(
        decodeURIComponent(
          atob(b64)
            .split("")
            .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
            .join(""),
        ),
      ),
    );
  };

  // Sources and subtitles come entirely from URL params — no storage needed.
  // ?v=https://…/video.mp4       → direct single-source shortcut (no encoding needed)
  // ?sources=JSON&subtitles=JSON  → encode to Base64, redirect to ?v=BASE64
  // ?v=BASE64                     → decode inline, works anywhere (other tabs, devices, incognito)
  let sources = [];
  let subtitleTracks = [];

  (function () {
    const params = new URLSearchParams(location.search);

    if (params.has("v")) {
      const raw = params.get("v");
      // Direct URL shortcut — ?v=https://… or ?v=http://…
      if (/^https?:\/\//i.test(raw)) {
        const ext = raw.split("?")[0].split(".").pop().toLowerCase();
        const type =
          ext === "webm"
            ? "video/webm"
            : ext === "ogv" || ext === "ogg"
              ? "video/ogg"
              : "video/mp4";
        sources = [{ label: "Video", src: raw, type }];
        return;
      }
      // Encoded Base64 URL
      try {
        const cfg = _decode(raw);
        sources = cfg.sources;
        subtitleTracks = cfg.subtitles ?? [];
      } catch (e) {
        console.error("wdPlayer: failed to decode ?v param", e);
      }
      return;
    }

    if (params.has("sources")) {
      // Raw URL — encode and redirect to clean ?v=BASE64 url
      try {
        const cfg = {
          sources: JSON.parse(params.get("sources")),
          subtitles: params.has("subtitles")
            ? JSON.parse(params.get("subtitles"))
            : [],
        };
        location.replace(location.pathname + "?v=" + _encode(cfg));
      } catch (e) {
        console.error("wdPlayer: invalid sources/subtitles params", e);
      }
      return;
    }
  })();

  // If sources is empty (no valid params), show error UI and stop execution
  if (!sources.length) {
    const noSrcErr = document.createElement("div");
    noSrcErr.id = "videoError";
    noSrcErr.appendChild(document.createTextNode("No video sources provided."));
    noSrcErr.appendChild(document.createElement("br"));
    const noSrcHint = document.createElement("small");
    const noSrcCode1 = document.createElement("code");
    noSrcCode1.textContent = "?sources=[...]";
    const noSrcCode2 = document.createElement("code");
    noSrcCode2.textContent = "?v=HASH";
    noSrcHint.appendChild(document.createTextNode("Use "));
    noSrcHint.appendChild(noSrcCode1);
    noSrcHint.appendChild(document.createTextNode(" or "));
    noSrcHint.appendChild(noSrcCode2);
    noSrcErr.appendChild(noSrcHint);
    skeleton.style.display = "none";
    playerWrapper.appendChild(noSrcErr);
    return;
  }

  let activeSourceIndex = 0;

  // localStorage key for resume position — keyed by the ?v= URL param
  const resumeKey =
    "wdPlayer:resume:" +
    (new URLSearchParams(location.search).get("v") ?? sources[0].src);

  const source = document.createElement("source");
  source.src = sources[activeSourceIndex].src;
  source.type = sources[activeSourceIndex].type;
  video.appendChild(source);

  // Error handling for empty or broken source
  video.addEventListener(
    "error",
    () => {
      console.error("Video Error: Source is empty or could not be loaded.");
      const errorMsg = document.createElement("div");
      errorMsg.id = "videoError";
      errorMsg.textContent = "Error: Video source is empty or unavailable";
      if (controls) controls.style.display = "none";
      if (bigPlayButton) bigPlayButton.style.display = "none";
      skeleton.style.display = "none";
      playerWrapper.appendChild(errorMsg);
    },
    true,
  );

  // Create CC Button — hidden by default, shown only if a subtitle track loads successfully
  const ccButton = document.createElement("button");
  ccButton.id = "ccButton";
  ccButton.setAttribute("aria-label", "Subtitles");
  ccButton.style.display = "none";
  ccButton.replaceChildren(getIcon("cc"));

  // Create Subtitles Menu Container
  const subtitleMenu = document.createElement("div");
  subtitleMenu.id = "subtitleMenu";
  subtitleMenu.classList.add("hidden");

  // subtitleTracks declared above alongside sources (URL param handling section)

  // SubtitlesOctopus instance for ASS rendering (created on demand)
  let octopusInstance = null;
  let activeAssTrackSrc = null;

  // Lazily load the Octopus script once, then call back
  let octopusScriptLoaded = false;
  let octopusScriptLoading = false;
  const octopusLoadCallbacks = [];
  const loadOctopusScript = (cb) => {
    if (octopusScriptLoaded) {
      cb();
      return;
    }
    octopusLoadCallbacks.push(cb);
    if (octopusScriptLoading) return;
    octopusScriptLoading = true;
    const s = document.createElement("script");
    s.src = "js/octopus/subtitles-octopus.js";
    s.onload = () => {
      octopusScriptLoaded = true;
      octopusScriptLoading = false;
      octopusLoadCallbacks.splice(0).forEach((fn) => fn());
    };
    s.onerror = () => console.error("Failed to load SubtitlesOctopus script.");
    document.head.appendChild(s);
  };

  // Destroy existing Octopus instance cleanly
  const destroyOctopus = () => {
    if (octopusInstance) {
      octopusInstance.dispose();
      octopusInstance = null;
    }
    activeAssTrackSrc = null;
  };

  const disableAllNativeTracks = () => {
    for (const t of video.textTracks) t.mode = "disabled";
  };

  // Load an ASS track via Octopus (loads the library on first use)
  const loadAssTrack = (src) => {
    destroyOctopus();
    disableAllNativeTracks();
    const resolvedUrl = new URL(src, document.baseURI).href;
    fetch(resolvedUrl, { method: "HEAD" })
      .then((res) => {
        if (!res.ok) {
          console.warn(
            `wdPlayer: ASS file not found (${res.status}): ${resolvedUrl}`,
          );
          return;
        }
        loadOctopusScript(() => {
          destroyOctopus();
          activeAssTrackSrc = src;
          octopusInstance = new SubtitlesOctopus({
            video,
            subUrl: resolvedUrl,
            workerUrl: new URL(
              "js/octopus/subtitles-octopus-worker.js",
              document.baseURI,
            ).href,
            legacyWorkerUrl: new URL(
              "js/octopus/subtitles-octopus-worker-legacy.js",
              document.baseURI,
            ).href,
            fallbackFont: null,
            availableFonts: {},
          });
          updateCcButtonState();
        });
      })
      .catch((err) => {
        console.warn("wdPlayer: failed to reach ASS file:", resolvedUrl, err);
      });
  };

  // Register VTT tracks natively; ASS tracks are loaded on demand
  subtitleTracks.forEach(({ label, srclang, src, type }) => {
    if (type === "ass") {
      ccButton.style.display = "";
      return;
    }
    const resolvedUrl = new URL(src, document.baseURI).href;
    fetch(resolvedUrl, { method: "HEAD" })
      .then((res) => {
        if (!res.ok) {
          console.warn(
            `wdPlayer: VTT file not found (${res.status}): ${resolvedUrl}`,
          );
          return;
        }
        const track = document.createElement("track");
        track.kind = "captions";
        track.label = label;
        track.srclang = srclang || "";
        track.addEventListener("load", () => {
          ccButton.style.display = "";
        });
        track.addEventListener("error", () => {
          console.warn(
            "Subtitle track failed to load:",
            src,
            "— track disabled.",
          );
        });
        video.appendChild(track);
        track.src = src;
        track.track.mode = "hidden";
      })
      .catch((err) => {
        console.warn("wdPlayer: failed to reach VTT file:", resolvedUrl, err);
      });
  });

  // Resume toast — shown when a saved position is found
  const resumeToast = document.createElement("div");
  resumeToast.id = "resumeToast";
  resumeToast.style.display = "none";
  const resumeToastText = document.createElement("span");
  const resumeBtn = document.createElement("button");
  resumeBtn.id = "resumeBtn";
  resumeBtn.textContent = "Resume";
  const resumeDismissBtn = document.createElement("button");
  resumeDismissBtn.id = "resumeDismissBtn";
  resumeDismissBtn.setAttribute("aria-label", "Dismiss");
  resumeDismissBtn.textContent = "\u00d7";
  resumeToast.appendChild(resumeToastText);
  resumeToast.appendChild(resumeBtn);
  resumeToast.appendChild(resumeDismissBtn);
  playerWrapper.appendChild(resumeToast);

  // Create the central big play button
  const bigPlayButton = document.createElement("button");
  bigPlayButton.id = "bigPlayButton";
  bigPlayButton.setAttribute("aria-label", "Play");
  bigPlayButton.replaceChildren(getIcon("play"));
  playerWrapper.appendChild(bigPlayButton);

  // Create the controls container
  const controls = document.createElement("div");
  controls.id = "controls";
  playerWrapper.appendChild(controls);

  // Create control buttons and elements
  const playButton = document.createElement("button");
  playButton.id = "playPause";
  playButton.setAttribute("aria-label", "Play");
  playButton.replaceChildren(getIcon("play"));

  const fullScreenButton = document.createElement("button");
  fullScreenButton.id = "fullScreen";
  fullScreenButton.setAttribute("aria-label", "Enter fullscreen");
  fullScreenButton.replaceChildren(getIcon("fullscreen"));

  const timerDisplay = document.createElement("span");
  timerDisplay.id = "timer";
  timerDisplay.textContent = "0:00 / 0:00";

  const progressBar = document.createElement("input");
  progressBar.id = "progressBar";
  progressBar.type = "range";
  progressBar.setAttribute("aria-label", "Seek");
  progressBar.value = 0;
  progressBar.max = 100;
  progressBar.step = 0.1;

  // Tooltip shown above progress bar on hover (thumbnail + time)
  const progressTooltip = document.createElement("div");
  progressTooltip.id = "progressTooltip";
  progressTooltip.style.display = "none";
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = 160;
  thumbCanvas.height = 90;
  const thumbCtx = thumbCanvas.getContext("2d");
  const thumbShimmer = document.createElement("div");
  thumbShimmer.id = "thumbShimmer";
  const progressTooltipTime = document.createElement("span");
  progressTooltipTime.id = "progressTooltipTime";
  progressTooltip.appendChild(thumbCanvas);
  progressTooltip.appendChild(thumbShimmer);
  progressTooltip.appendChild(progressTooltipTime);
  playerWrapper.appendChild(progressTooltip);

  // Hidden video used only to seek and capture thumbnail frames
  const thumbVideo = document.createElement("video");
  thumbVideo.muted = true;
  thumbVideo.preload = "metadata";
  thumbVideo.style.display = "none";
  thumbVideo.addEventListener("seeking", () => {
    thumbShimmer.style.display = "block";
  });
  thumbVideo.addEventListener("seeked", () => {
    thumbCtx.drawImage(thumbVideo, 0, 0, 160, 90);
    thumbShimmer.style.display = "none";
  });
  playerWrapper.appendChild(thumbVideo);

  const muteButton = document.createElement("button");
  muteButton.id = "muteButton";
  muteButton.setAttribute("aria-label", "Mute");
  muteButton.replaceChildren(getIcon("volumeHigh"));

  const volumeSlider = document.createElement("input");
  volumeSlider.id = "volumeSlider";
  volumeSlider.type = "range";
  volumeSlider.setAttribute("aria-label", "Volume");
  volumeSlider.min = 0;
  volumeSlider.max = 1;
  volumeSlider.step = 0.01;
  volumeSlider.value = 1;
  // Restore saved volume preference from previous session
  try {
    const _sv = parseFloat(localStorage.getItem("wdPlayer:volume"));
    if (!isNaN(_sv)) {
      video.volume = _sv;
      volumeSlider.value = _sv;
    }
    if (localStorage.getItem("wdPlayer:muted") === "1") video.muted = true;
  } catch (_) {}

  // Create Quality Button
  const qualityButton = document.createElement("button");
  qualityButton.id = "qualityButton";
  qualityButton.textContent = "Auto";
  if (sources.length <= 1) qualityButton.style.display = "none";

  // Create Quality Menu Container
  const qualityMenu = document.createElement("div");
  qualityMenu.id = "qualityMenu";
  qualityMenu.classList.add("hidden");

  // Create Speed Button
  const speedButton = document.createElement("button");
  speedButton.id = "speedButton";
  speedButton.textContent = "1\u00d7";

  // Create Speed Menu
  const speedMenu = document.createElement("div");
  speedMenu.id = "speedMenu";
  speedMenu.classList.add("hidden");

  const SPEED_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

  const updateSpeedLabel = () => {
    speedButton.textContent = `${video.playbackRate}\u00d7`;
  };

  const populateSpeedMenu = () => {
    speedMenu.replaceChildren();
    SPEED_RATES.forEach((rate) => {
      const btn = document.createElement("button");
      btn.classList.add("subtitle-option");
      if (video.playbackRate === rate) btn.classList.add("active");
      btn.textContent = rate === 1 ? "Normal" : `${rate}\u00d7`;
      btn.addEventListener("click", () => {
        video.playbackRate = rate;
        updateSpeedLabel();
        populateSpeedMenu();
        speedMenu.classList.add("hidden");
      });
      speedMenu.appendChild(btn);
    });
  };

  speedButton.addEventListener("click", (e) => {
    e.stopPropagation();
    populateSpeedMenu();
    speedMenu.classList.toggle("hidden");
    subtitleMenu.classList.add("hidden");
    qualityMenu.classList.add("hidden");
  });

  // Auto mode state
  let isAutoMode = false;
  let autoCheckInterval = null;

  // Measure effective downlink in Mbps.
  // Uses navigator.connection when available; falls back to a timed fetch.
  const measureBandwidth = async () => {
    if (navigator.connection && navigator.connection.downlink > 0) {
      return navigator.connection.downlink; // Mbps
    }
    // Fallback: fetch a ~100 KB probe and time it
    try {
      const _probeSrc = sources[sources.length - 1].src;
      const _probeU = new URL(_probeSrc, document.baseURI);
      _probeU.searchParams.set("cache", Date.now());
      const probeUrl = _probeU.href;
      const PROBE_BYTES = 100_000;
      const t0 = performance.now();
      const res = await fetch(probeUrl, { cache: "no-store" });
      const reader = res.body.getReader();
      let received = 0;
      while (received < PROBE_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.length;
      }
      reader.cancel();
      const elapsed = (performance.now() - t0) / 1000; // seconds
      return (received * 8) / 1_000_000 / elapsed; // Mbps
    } catch {
      return null;
    }
  };

  // Bandwidth smoothing — median of last 3 measurements to filter noise
  const _bwHistory = [];
  const _BW_HISTORY_SIZE = 3;
  const _smoothBandwidth = (mbps) => {
    _bwHistory.push(mbps);
    if (_bwHistory.length > _BW_HISTORY_SIZE) _bwHistory.shift();
    const s = [..._bwHistory].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };

  // Cooldown: don't upgrade quality more than once per 10 s
  let _lastUpgradeTime = 0;
  const _UPGRADE_COOLDOWN_MS = 10_000;

  // Hysteresis: need 20% more bandwidth to upgrade, allow 15% drop before downgrade
  const _HYST_UP = 1.2;
  const _HYST_DOWN = 0.85;

  // Thresholds in Mbps (best→worst boundary). Preset [5, 2] auto-extended for >3 sources.
  const bandwidthThresholds = (() => {
    const base = [5, 2];
    const need = sources.length - 1;
    if (need <= 0) return [];
    if (need <= base.length) return base.slice(0, need);
    const step = base[base.length - 1] / (need - base.length + 1);
    const extra = Array.from({ length: need - base.length }, (_, i) =>
      parseFloat((base[base.length - 1] - step * (i + 1)).toFixed(2)),
    );
    return [...base, ...extra];
  })();

  // Pick best source index with hysteresis and upgrade cooldown
  const getBestSourceIndex = (mbps) => {
    const upIdx = bandwidthThresholds.findIndex((bw) => mbps >= bw * _HYST_UP);
    const targetUp = upIdx === -1 ? sources.length - 1 : upIdx;

    const downIdx = bandwidthThresholds.findIndex(
      (bw) => mbps >= bw * _HYST_DOWN,
    );
    const targetDown = downIdx === -1 ? sources.length - 1 : downIdx;

    if (targetDown > activeSourceIndex) return targetDown; // downgrade immediately
    if (targetUp < activeSourceIndex) {
      if (Date.now() - _lastUpgradeTime >= _UPGRADE_COOLDOWN_MS)
        return targetUp;
      return activeSourceIndex; // cooldown active, wait
    }
    return activeSourceIndex; // no change needed
  };

  // Tracks last thumbnail seek time — declared here so switchSource can reset it
  let lastThumbSeekTime = -1;

  // Switch to a different source while preserving playback position
  const switchSource = (index) => {
    if (index === activeSourceIndex) return;
    const wasPlaying = !video.paused;
    const savedTime = video.currentTime;
    activeSourceIndex = index;
    source.src = sources[index].src;
    source.type = sources[index].type;
    thumbVideo.src = "";
    lastThumbSeekTime = -1;
    video.load();
    video.currentTime = savedTime;
    if (wasPlaying) video.play().catch(() => {});
  };

  // Update quality button label
  const updateQualityLabel = () => {
    qualityButton.textContent = isAutoMode
      ? `Auto (${sources[activeSourceIndex].label})`
      : sources[activeSourceIndex].label;
  };

  // Run one auto-quality check
  const runAutoCheck = async () => {
    const raw = await measureBandwidth();
    if (raw === null) return;
    const mbps = _smoothBandwidth(raw);
    const best = getBestSourceIndex(mbps);
    if (best === activeSourceIndex) return;
    const isUpgrade = best < activeSourceIndex;
    switchSource(best);
    if (isUpgrade) _lastUpgradeTime = Date.now();
    updateQualityLabel();
  };

  // Start/stop periodic auto checks
  const startAutoMode = () => {
    isAutoMode = true;
    _bwHistory.length = 0; // reset smoothing history when (re-)entering auto mode
    _lastUpgradeTime = 0;
    runAutoCheck();
    autoCheckInterval = setInterval(runAutoCheck, 5_000);
    // React immediately when browser reports connection change
    if (navigator.connection) {
      navigator.connection.addEventListener("change", runAutoCheck);
    }
    updateQualityLabel();
  };
  const stopAutoMode = () => {
    isAutoMode = false;
    clearInterval(autoCheckInterval);
    autoCheckInterval = null;
    if (navigator.connection) {
      navigator.connection.removeEventListener("change", runAutoCheck);
    }
  };

  // Start in auto mode immediately (only useful with multiple sources)
  if (sources.length > 1) startAutoMode();

  // Populate quality menu (Auto + manual options)
  const populateQualityMenu = () => {
    qualityMenu.replaceChildren();

    // Auto option
    const autoBtn = document.createElement("button");
    autoBtn.classList.add("subtitle-option");
    if (isAutoMode) autoBtn.classList.add("active");
    autoBtn.appendChild(document.createTextNode("Auto"));
    if (isAutoMode) {
      const badge = document.createElement("span");
      badge.className = "auto-quality-badge";
      badge.textContent = sources[activeSourceIndex].label;
      autoBtn.appendChild(badge);
    }
    autoBtn.addEventListener("click", () => {
      startAutoMode();
      populateQualityMenu();
      qualityMenu.classList.add("hidden");
    });
    qualityMenu.appendChild(autoBtn);

    // Manual options
    sources.forEach((s, i) => {
      const btn = document.createElement("button");
      btn.classList.add("subtitle-option");
      if (!isAutoMode && i === activeSourceIndex) btn.classList.add("active");
      btn.appendChild(document.createTextNode(s.label));
      btn.addEventListener("click", () => {
        stopAutoMode();
        switchSource(i);
        updateQualityLabel();
        populateQualityMenu();
        qualityMenu.classList.add("hidden");
      });
      qualityMenu.appendChild(btn);
    });
  };

  // Toggle quality menu on button click
  qualityButton.addEventListener("click", (e) => {
    e.stopPropagation();
    populateQualityMenu();
    qualityMenu.classList.toggle("hidden");
    subtitleMenu.classList.add("hidden");
    speedMenu.classList.add("hidden");
  });

  // Populate the subtitle menu — handles both VTT (native tracks) and ASS (Octopus)
  const populateSubtitleMenu = () => {
    subtitleMenu.replaceChildren();
    const nativeTracks = video.textTracks;
    const anyNativeActive = Array.from(nativeTracks).some(
      (t) => t.mode === "showing",
    );
    const anyActive = anyNativeActive || octopusInstance !== null;

    // "None" option
    const offBtn = document.createElement("button");
    offBtn.classList.add("subtitle-option");
    if (!anyActive) offBtn.classList.add("active");
    offBtn.appendChild(document.createTextNode("None"));
    offBtn.addEventListener("click", () => {
      disableAllNativeTracks();
      destroyOctopus();
      updateCcButtonState();
      subtitleMenu.classList.add("hidden");
    });
    subtitleMenu.appendChild(offBtn);

    // Build entries for each configured track
    subtitleTracks.forEach(({ label, src, type }) => {
      const isAss = type === "ass";
      // Determine if this entry is currently active
      let isActive = false;
      if (isAss) {
        isActive = activeAssTrackSrc === src;
      } else {
        // Match by label against native textTracks
        const nativeIdx = Array.from(nativeTracks).findIndex(
          (t) => t.label === label,
        );
        isActive =
          nativeIdx !== -1 && nativeTracks[nativeIdx].mode === "showing";
      }

      const btn = document.createElement("button");
      btn.classList.add("subtitle-option");
      if (isActive) btn.classList.add("active");
      const badge = document.createElement("span");
      badge.className = "subtitle-type-badge subtitle-type-" + type;
      badge.textContent = type.toUpperCase();
      btn.appendChild(badge);
      btn.appendChild(document.createTextNode(label));
      btn.addEventListener("click", () => {
        if (isAss) {
          loadAssTrack(src);
        } else {
          destroyOctopus();
          for (const t of nativeTracks)
            t.mode = t.label === label ? "showing" : "disabled";
        }
        updateCcButtonState();
        subtitleMenu.classList.add("hidden");
      });
      subtitleMenu.appendChild(btn);
    });
  };

  const getActiveSubtitleEntry = () => {
    const nativeTracks = video.textTracks;
    for (const track of subtitleTracks) {
      if (track.type === "ass" && activeAssTrackSrc === track.src) return track;
      if (track.type !== "ass") {
        const nt = Array.from(nativeTracks).find(
          (t) => t.label === track.label,
        );
        if (nt && nt.mode === "showing") return track;
      }
    }
    return null;
  };

  const getActiveSubtitleLabel = () => getActiveSubtitleEntry()?.label ?? null;

  const updateCcButtonState = () => {
    ccButton.classList.toggle("active", getActiveSubtitleEntry() !== null);
  };

  // Toggle subtitle menu on CC button click
  ccButton.addEventListener("click", (e) => {
    e.stopPropagation();
    populateSubtitleMenu();
    subtitleMenu.classList.toggle("hidden");
    qualityMenu.classList.add("hidden");
    speedMenu.classList.add("hidden");
  });

  // Close all menus when clicking outside
  document.addEventListener("click", () => {
    subtitleMenu.classList.add("hidden");
    qualityMenu.classList.add("hidden");
    speedMenu.classList.add("hidden");
  });

  // Add all controls to the controls container
  const volumeGroup = document.createElement("div");
  volumeGroup.id = "volumeGroup";
  volumeGroup.append(muteButton, volumeSlider);

  controls.append(
    playButton,
    timerDisplay,
    progressBar,
    volumeGroup,
    qualityButton,
    ...(subtitleTracks.length ? [ccButton] : []),
    speedButton,
    fullScreenButton,
  );

  // Subtitle, quality, and speed menus are absolutely positioned inside the player wrapper
  if (subtitleTracks.length) playerWrapper.appendChild(subtitleMenu);
  if (sources.length > 1) playerWrapper.appendChild(qualityMenu);
  playerWrapper.appendChild(speedMenu);

  // Custom tooltip
  const playerTooltip = document.createElement("div");
  playerTooltip.id = "playerTooltip";
  playerWrapper.appendChild(playerTooltip);

  const _tooltipEntries = [
    [playButton, () => (video.paused ? "Play" : "Pause"), "Space"],
    [
      muteButton,
      () => (video.muted || video.volume === 0 ? "Unmute" : "Mute"),
      "M",
    ],
    [
      ccButton,
      () => {
        const l = getActiveSubtitleLabel();
        return l ? "Subtitles \u00b7 " + l : "Subtitles";
      },
      "C",
    ],
    [qualityButton, "Quality", "Q"],
    [speedButton, "Speed", [",", "."]],
    [
      fullScreenButton,
      () => (document.fullscreenElement ? "Exit fullscreen" : "Fullscreen"),
      "F",
    ],
  ];
  if (TOOLTIPS_ENABLED) {
    const _tooltipHasHover = window.matchMedia("(hover: hover)").matches;
    _tooltipEntries.forEach(([btn, label, key]) => {
      btn.addEventListener("mouseenter", () => {
        const text = typeof label === "function" ? label() : label;
        playerTooltip.replaceChildren(document.createTextNode(text));
        if (key && _tooltipHasHover) {
          const keys = Array.isArray(key) ? key : [key];
          keys.forEach((k) => {
            const kbd = document.createElement("kbd");
            kbd.textContent = k;
            playerTooltip.appendChild(kbd);
          });
        }
        const wr = playerWrapper.getBoundingClientRect();
        const br = btn.getBoundingClientRect();
        playerTooltip.style.bottom = wr.bottom - br.top + 8 + "px";
        playerTooltip.classList.add("visible");
        const tw = playerTooltip.offsetWidth;
        const rawLeft = br.left + br.width / 2 - wr.left - tw / 2;
        const clamped = Math.max(4, Math.min(wr.width - tw - 4, rawLeft));
        playerTooltip.style.left = clamped + "px";
      });
      btn.addEventListener("mouseleave", () =>
        playerTooltip.classList.remove("visible"),
      );
      btn.addEventListener("mousedown", () =>
        playerTooltip.classList.remove("visible"),
      );
    });
  } // end TOOLTIPS_ENABLED

  // Format seconds as [h:]mm:ss; pass forceHours=true to always include the hour component
  const formatTime = (seconds, forceHours = false) => {
    const h = Math.floor(seconds / 3600);
    const min = Math.floor((seconds % 3600) / 60);
    const sec = Math.floor(seconds % 60);
    if (h > 0 || forceHours) {
      return `${h}:${min < 10 ? "0" : ""}${min}:${sec < 10 ? "0" : ""}${sec}`;
    }
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  // Sync big button and play button icons based on video state
  const updateUIState = () => {
    const isPaused = video.paused;
    playButton.replaceChildren(getIcon(isPaused ? "play" : "pause"));
    playButton.setAttribute("aria-label", isPaused ? "Play" : "Pause");
    bigPlayButton.style.display = isPaused ? "flex" : "none";
  };

  // Toggle play/pause; video.play() returns a Promise so update UI after it resolves
  const playPauseVideo = () => {
    if (video.paused) {
      video
        .play()
        .then(updateUIState)
        .catch((err) => console.error("Playback failed:", err));
    } else {
      video.pause();
      updateUIState();
    }
  };

  // Toggle fullscreen mode for the player
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      if (playerWrapper.requestFullscreen) playerWrapper.requestFullscreen();
      else if (playerWrapper.webkitRequestFullscreen)
        playerWrapper.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  // Remove skeleton loader and set initial timer when video metadata is ready
  video.addEventListener("loadedmetadata", () => {
    skeleton.style.opacity = "0";
    setTimeout(() => skeleton.remove(), 500);
    timerDisplay.textContent = `0:00 / ${formatTime(video.duration)}`;
    document.title = source.src.split("/").pop().split("?")[0];

    // Show resume toast if there's a saved position more than 5s in and not near the end
    try {
      const saved = parseFloat(localStorage.getItem(resumeKey));
      if (saved && saved > 5 && saved < video.duration - 10) {
        resumeToastText.textContent = `Resume from ${formatTime(saved)}?`;
        resumeToast.style.display = "flex";
        resumeBtn.onclick = () => {
          video.currentTime = saved;
          resumeToast.style.display = "none";
        };
        resumeDismissBtn.onclick = () => {
          resumeToast.style.display = "none";
          localStorage.removeItem(resumeKey);
        };
      }
    } catch (_) {}
  });

  // Show buffering spinner when video is waiting/buffering
  // Debounced: only show spinner if buffering lasts longer than 300ms (avoids flash on seeks)
  let wasWaiting = false;
  let bufferingDebounceTimer = null;
  // Stall recovery: if buffering >3s in auto mode, immediately step down one quality level
  let stallRecoveryTimer = null;

  const showBufferingSpinner = () => {
    bufferingSpinner.style.display = "flex";
  };

  const hideBufferingSpinner = () => {
    clearTimeout(bufferingDebounceTimer);
    bufferingDebounceTimer = null;
    clearTimeout(stallRecoveryTimer);
    stallRecoveryTimer = null;
    bufferingSpinner.style.display = "none";
  };

  video.addEventListener("waiting", () => {
    wasWaiting = true;
    // Debounce: show spinner only after 300ms of continuous buffering
    clearTimeout(bufferingDebounceTimer);
    bufferingDebounceTimer = setTimeout(showBufferingSpinner, 300);
    if (isAutoMode) {
      runAutoCheck();
      // Stall recovery: step down one quality level after 3s of stalling
      clearTimeout(stallRecoveryTimer);
      stallRecoveryTimer = setTimeout(() => {
        if (activeSourceIndex < sources.length - 1) {
          switchSource(activeSourceIndex + 1);
          updateQualityLabel();
          populateQualityMenu();
        }
      }, 3000);
    }
  });
  video.addEventListener("playing", () => {
    hideBufferingSpinner();
    if (wasWaiting && isAutoMode) {
      wasWaiting = false;
      runAutoCheck();
    } // may have recovered
  });
  video.addEventListener("pause", () => {
    hideBufferingSpinner();
  });
  video.addEventListener("ended", () => {
    hideBufferingSpinner();
    updateUIState();
    try {
      localStorage.removeItem(resumeKey);
    } catch (_) {}
  });
  video.addEventListener("canplay", () => {
    hideBufferingSpinner();
  });

  // Update buffered range CSS variable on the progress bar
  const updateBuffered = () => {
    if (!video.duration) return;
    let end = 0;
    for (let i = 0; i < video.buffered.length; i++) {
      if (video.buffered.end(i) > end) end = video.buffered.end(i);
    }
    progressBar.style.setProperty(
      "--buffered",
      (end / video.duration) * 100 + "%",
    );
  };
  video.addEventListener("progress", updateBuffered);

  // Single timeupdate handler: update buffered bar + progress + timer + save position
  let lastSaveTime = 0;
  video.addEventListener("timeupdate", () => {
    if (!isNaN(video.duration)) {
      progressBar.value = (video.currentTime / video.duration) * 100;
      updateRangeValue(progressBar);
    }
    const _longVideo = video.duration >= 3600;
    timerDisplay.textContent = `${formatTime(video.currentTime, _longVideo)} / ${formatTime(video.duration)}`;
    // Save position every 5 seconds
    const now = video.currentTime;
    if (now - lastSaveTime >= 5) {
      lastSaveTime = now;
      try {
        localStorage.setItem(resumeKey, now);
      } catch (_) {}
    }
  });

  // Show thumbnail + time tooltip on progress bar hover
  progressBar.addEventListener("mousemove", (e) => {
    if (!video.duration) return;
    // Set thumb video source lazily on first hover
    if (!thumbVideo.src) thumbVideo.src = source.src;
    const rect = progressBar.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );
    const hoverTime = ratio * video.duration;
    progressTooltipTime.textContent = formatTime(
      hoverTime,
      video.duration >= 3600,
    );
    // Throttle seeks: only seek if hovered time changed by more than 0.5s
    if (Math.abs(hoverTime - lastThumbSeekTime) > 0.5) {
      lastThumbSeekTime = hoverTime;
      thumbVideo.currentTime = hoverTime;
    }
    // Position tooltip centred above hover point, clamped inside the player
    const playerRect = playerWrapper.getBoundingClientRect();
    const rawLeft = e.clientX - playerRect.left;
    const half = 80; // half of canvas width (160px)
    const clampedLeft = Math.max(
      half,
      Math.min(playerRect.width - half, rawLeft),
    );
    progressTooltip.style.left = clampedLeft + "px";
    progressTooltip.style.display = "flex";
  });

  progressBar.addEventListener("mouseleave", () => {
    progressTooltip.style.display = "none";
  });

  // Seek video when progress bar is changed
  progressBar.addEventListener("input", () => {
    const wasEnded = video.ended;
    video.currentTime = (progressBar.value / 100) * video.duration;
    updateRangeValue(progressBar);
    if (wasEnded) {
      video
        .play()
        .then(updateUIState)
        .catch(() => {});
    }
  });

  // Mute/unmute toggle
  let volumeBeforeMute = 1;
  muteButton.addEventListener("click", () => {
    if (video.muted || video.volume === 0) {
      video.muted = false;
      video.volume = volumeBeforeMute || 1;
    } else {
      volumeBeforeMute = video.volume;
      video.muted = true;
    }
  });

  // Change volume when volume slider is changed
  volumeSlider.addEventListener("input", () => {
    video.muted = false;
    video.volume = volumeSlider.value;
    updateRangeValue(volumeSlider);
  });

  // Sync volume slider and mute button icon on any volume change
  const updateVolumeUI = () => {
    const vol = video.muted ? 0 : video.volume;
    volumeSlider.value = video.muted ? 0 : video.volume;
    updateRangeValue(volumeSlider);
    const iconName =
      vol === 0 ? "volumeMuted" : vol < 0.5 ? "volumeLow" : "volumeHigh";
    muteButton.replaceChildren(getIcon(iconName));
    muteButton.setAttribute("aria-label", vol === 0 ? "Unmute" : "Mute");
    try {
      localStorage.setItem("wdPlayer:volume", video.volume);
      localStorage.setItem("wdPlayer:muted", video.muted ? "1" : "0");
    } catch (_) {}
  };

  video.addEventListener("volumechange", updateVolumeUI);

  // Button event listeners
  playButton.addEventListener("click", playPauseVideo);
  fullScreenButton.addEventListener("click", toggleFullScreen);
  bigPlayButton.addEventListener("click", playPauseVideo);

  // Single click = play/pause, double click = fullscreen
  let clickTimer = null;
  video.addEventListener("click", () => {
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
      toggleFullScreen();
    } else {
      clickTimer = setTimeout(() => {
        clickTimer = null;
        playPauseVideo();
      }, 220);
    }
  });

  // Update fullscreen icon and handle controls visibility on fullscreen change
  document.addEventListener("fullscreenchange", () => {
    fullScreenButton.replaceChildren(
      getIcon(document.fullscreenElement ? "exitFullscreen" : "fullscreen"),
    );
    fullScreenButton.setAttribute(
      "aria-label",
      document.fullscreenElement ? "Exit fullscreen" : "Enter fullscreen",
    );
    if (document.fullscreenElement === playerWrapper) {
      showControls();
      if (!video.paused) scheduleControlsHide();
    } else {
      controls.style.opacity = 1;
      controls.style.pointerEvents = "auto";
      playerWrapper.style.cursor = "";
      clearTimeout(controlsHideTimeout);
    }
  });

  // Initial UI and CSS variable setup
  updateUIState();
  updateRangeValue(progressBar);
  updateVolumeUI();

  // Keyboard shortcuts:
  // Space = play/pause, F = fullscreen, M = mute
  // ArrowRight/Left = seek 5s, ArrowUp/Down = volume 10%
  document.addEventListener("keydown", (e) => {
    if (document.activeElement.tagName === "INPUT") return;
    switch (e.code) {
      case "Space":
        e.preventDefault();
        playPauseVideo();
        break;
      case "KeyF":
        toggleFullScreen();
        break;
      case "KeyM":
        muteButton.click();
        break;
      case "KeyC":
        if (subtitleTracks.length) {
          const nativeTracks = video.textTracks;
          const currentIdx = subtitleTracks.findIndex(
            ({ label, src, type }) => {
              if (type === "ass") return activeAssTrackSrc === src;
              const nt = Array.from(nativeTracks).find(
                (t) => t.label === label,
              );
              return nt?.mode === "showing";
            },
          );
          const nextIdx = currentIdx + 1;
          if (nextIdx >= subtitleTracks.length) {
            disableAllNativeTracks();
            destroyOctopus();
            showCcToast("Off");
          } else {
            const next = subtitleTracks[nextIdx];
            showCcToast(`${next.label} \u00b7 ${next.type.toUpperCase()}`);
            if (next.type === "ass") {
              loadAssTrack(next.src);
            } else {
              destroyOctopus();
              for (const t of video.textTracks)
                t.mode = t.label === next.label ? "showing" : "disabled";
            }
          }
          updateCcButtonState();
        }
        break;
      case "KeyQ":
        if (sources.length > 1) {
          if (isAutoMode) {
            stopAutoMode();
            switchSource(0);
            updateQualityLabel();
          } else {
            const next = activeSourceIndex + 1;
            if (next >= sources.length) {
              startAutoMode();
            } else {
              switchSource(next);
              updateQualityLabel();
            }
          }
        }
        break;
      case "ArrowRight":
        e.preventDefault();
        video.currentTime = Math.min(video.duration, video.currentTime + 5);
        break;
      case "ArrowLeft":
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 5);
        break;
      case "ArrowUp":
        e.preventDefault();
        video.volume = Math.min(1, parseFloat((video.volume + 0.1).toFixed(2)));
        break;
      case "ArrowDown":
        e.preventDefault();
        video.volume = Math.max(0, parseFloat((video.volume - 0.1).toFixed(2)));
        break;
      case "Comma":
        e.preventDefault();
        {
          const ci = SPEED_RATES.indexOf(video.playbackRate);
          if (ci > 0) {
            video.playbackRate = SPEED_RATES[ci - 1];
            showSpeedToast(SPEED_RATES[ci - 1]);
            updateSpeedLabel();
          }
        }
        break;
      case "Period":
        e.preventDefault();
        {
          const ci = SPEED_RATES.indexOf(video.playbackRate);
          if (ci !== -1 && ci < SPEED_RATES.length - 1) {
            video.playbackRate = SPEED_RATES[ci + 1];
            showSpeedToast(SPEED_RATES[ci + 1]);
            updateSpeedLabel();
          }
        }
        break;
      default:
        if (e.code.startsWith("Digit") && video.duration) {
          e.preventDefault();
          video.currentTime =
            (parseInt(e.code.replace("Digit", ""), 10) / 10) * video.duration;
        }
    }
  });

  // --- Fullscreen controls & cursor auto-hide logic ---
  let controlsHideTimeout = null;

  function showControls() {
    controls.style.opacity = 1;
    controls.style.pointerEvents = "auto";
    playerWrapper.style.cursor = "";
  }

  function hideControls() {
    if (document.fullscreenElement === playerWrapper && !video.paused) {
      controls.style.opacity = 0;
      controls.style.pointerEvents = "none";
      playerWrapper.style.cursor = "none";
    }
  }

  function scheduleControlsHide() {
    clearTimeout(controlsHideTimeout);
    controlsHideTimeout = setTimeout(hideControls, 2000);
  }

  // Show controls and restart hide timer on mouse move (fullscreen only)
  playerWrapper.addEventListener("mousemove", () => {
    if (document.fullscreenElement === playerWrapper) {
      showControls();
      scheduleControlsHide();
    }
  });

  // Schedule hide when video starts playing (fullscreen only) + hide resume toast
  video.addEventListener("play", () => {
    if (document.fullscreenElement === playerWrapper) scheduleControlsHide();
    resumeToast.style.display = "none";
  });

  // Always show controls when paused
  video.addEventListener("pause", () => {
    showControls();
    clearTimeout(controlsHideTimeout);
  });

  // Custom right-click context menu with player info
  const contextMenu = document.createElement("div");
  contextMenu.id = "playerContextMenu";
  contextMenu.classList.add("hidden");
  playerWrapper.appendChild(contextMenu);

  const hideContextMenu = () => contextMenu.classList.add("hidden");

  playerWrapper.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    // If menu is already visible, hide it
    if (!contextMenu.classList.contains("hidden")) {
      hideContextMenu();
      return;
    }

    const rows = [
      ["wdPlayer", "v1.0"],
      ...(sources.length > 1
        ? [
            [
              "Quality",
              isAutoMode
                ? `Auto (${sources[activeSourceIndex].label})`
                : sources[activeSourceIndex].label,
            ],
          ]
        : []),
      ...(subtitleTracks.length
        ? [
            [
              "Subtitles",
              (() => {
                const e = getActiveSubtitleEntry();
                return e ? `${e.label} (${e.type.toUpperCase()})` : "None";
              })(),
            ],
          ]
        : []),

      [
        "Resolution",
        video.videoWidth ? `${video.videoWidth}×${video.videoHeight}` : "—",
      ],
      ["Speed", `${video.playbackRate}×`],
      ["Volume", `${Math.round(video.volume * 100)}%`],
    ];

    contextMenu.replaceChildren();
    rows.forEach(([key, val]) => {
      const row = document.createElement("div");
      row.className = "ctx-row";
      const k = document.createElement("span");
      k.className = "ctx-key";
      k.textContent = key;
      const v = document.createElement("span");
      v.className = "ctx-val";
      v.textContent = val;
      row.appendChild(k);
      row.appendChild(v);
      contextMenu.appendChild(row);
    });

    // Position inside player bounds
    const pr = playerWrapper.getBoundingClientRect();
    let x = e.clientX - pr.left;
    let y = e.clientY - pr.top;
    contextMenu.classList.remove("hidden");
    const mw = contextMenu.offsetWidth;
    const mh = contextMenu.offsetHeight;
    if (x + mw > pr.width) x = pr.width - mw - 4;
    if (y + mh > pr.height) y = pr.height - mh - 4;
    contextMenu.style.left = x + "px";
    contextMenu.style.top = y + "px";
  });

  playerWrapper.addEventListener("click", hideContextMenu);
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") hideContextMenu();
    },
    { capture: true },
  );
})();
