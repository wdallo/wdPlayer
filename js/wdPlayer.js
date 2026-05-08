(function () {
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

  // SVG icon definitions for controls
  const icons = {
    play: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polygon points="8,5 19,12 8,19" /></svg>`,
    pause: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>`,
    fullscreen: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7 14H5v5h5v-2H7v-3zm0-4V7h3V5H5v5h2zm10 7h-3v2h5v-5h-2v3zm-3-12v2h3v3h2V5h-5z"/></svg>`,
    exitFullscreen: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`,
    cc: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 4H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm-8 7H9.5V10.5h-2v3h2V13H11v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-4a1 1 0 011-1h3a1 1 0 011 1v1zm7 0h-1.5V10.5h-2v3h2V13H18v1a1 1 0 01-1 1h-3a1 1 0 01-1-1v-4a1 1 0 011-1h3a1 1 0 011 1v1z"/></svg>`,
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
      svg.style.fill = "currentColor";
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
  video.width = 720;
  video.height = 440;
  video.setAttribute("preload", "metadata");
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
    btoa(unescape(encodeURIComponent(JSON.stringify(_minify(cfg)))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  const _decode = (str) => {
    const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    return _expand(JSON.parse(decodeURIComponent(escape(atob(b64)))));
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
    noSrcErr.innerHTML =
      "No video sources provided.<br><small>Use <code>?sources=[...]</code> or <code>?v=HASH</code></small>";
    if (skeleton) skeleton.style.display = "none";
    playerWrapper.appendChild(noSrcErr);
    return;
  }

  let activeSourceIndex = 0;

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
      if (skeleton) skeleton.style.display = "none";
      playerWrapper.appendChild(errorMsg);
    },
    true,
  );

  // Create CC Button — hidden by default, shown only if a subtitle track loads successfully
  const ccButton = document.createElement("button");
  ccButton.id = "ccButton";
  ccButton.title = "Subtitles";
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

  // Load an ASS track via Octopus (loads the library on first use)
  const loadAssTrack = (src) => {
    destroyOctopus();
    for (let i = 0; i < video.textTracks.length; i++)
      video.textTracks[i].mode = "disabled";
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

  // Create the central big play button
  const bigPlayButton = document.createElement("button");
  bigPlayButton.id = "bigPlayButton";
  bigPlayButton.replaceChildren(getIcon("play"));
  playerWrapper.appendChild(bigPlayButton);

  // Create the controls container
  const controls = document.createElement("div");
  controls.id = "controls";
  playerWrapper.appendChild(controls);

  // Create control buttons and elements
  const playButton = document.createElement("button");
  playButton.id = "playPause";
  playButton.replaceChildren(getIcon("play"));

  const fullScreenButton = document.createElement("button");
  fullScreenButton.id = "fullScreen";
  fullScreenButton.replaceChildren(getIcon("fullscreen"));

  const timerDisplay = document.createElement("span");
  timerDisplay.id = "timer";
  timerDisplay.textContent = "0:00 / 0:00";

  const progressBar = document.createElement("input");
  progressBar.id = "progressBar";
  progressBar.type = "range";
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

  const volumeSlider = document.createElement("input");
  volumeSlider.id = "volumeSlider";
  volumeSlider.type = "range";
  volumeSlider.min = 0;
  volumeSlider.max = 1;
  volumeSlider.step = 0.01;
  volumeSlider.value = 1;

  // Create Quality Button
  const qualityButton = document.createElement("button");
  qualityButton.id = "qualityButton";
  qualityButton.title = "Quality";
  qualityButton.textContent = "Auto";
  if (sources.length <= 1) qualityButton.style.display = "none";

  // Create Quality Menu Container
  const qualityMenu = document.createElement("div");
  qualityMenu.id = "qualityMenu";
  qualityMenu.classList.add("hidden");

  // Auto mode state
  let isAutoMode = true;
  let autoCheckInterval = null;

  // Measure effective downlink in Mbps.
  // Uses navigator.connection when available; falls back to a timed fetch.
  const measureBandwidth = async () => {
    if (navigator.connection && navigator.connection.downlink) {
      return navigator.connection.downlink; // Mbps
    }
    // Fallback: fetch a ~100 KB probe and time it
    try {
      const probeUrl = sources[sources.length - 1].src + "?cache=" + Date.now();
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

  // Pick best source index based on Mbps
  // Assumes sources are ordered best→worst (highest bitrate first)
  const bandwidthThresholds = [5, 2]; // Mbps needed for sources[0], sources[1]; else sources[2]
  const getBestSourceIndex = (mbps) => {
    for (let i = 0; i < bandwidthThresholds.length; i++) {
      if (mbps >= bandwidthThresholds[i]) return i;
    }
    return sources.length - 1;
  };

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
    const mbps = await measureBandwidth();
    if (mbps === null) return;
    const best = getBestSourceIndex(mbps);
    switchSource(best);
    updateQualityLabel();
  };

  // Start/stop periodic auto checks
  const startAutoMode = () => {
    isAutoMode = true;
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

  // Start in auto mode immediately
  startAutoMode();

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
      for (let i = 0; i < nativeTracks.length; i++)
        nativeTracks[i].mode = "disabled";
      destroyOctopus();
      subtitleMenu.classList.add("hidden");
    });
    subtitleMenu.appendChild(offBtn);

    // Build entries for each configured track
    subtitleTracks.forEach(({ label, src, type }, idx) => {
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
          for (let i = 0; i < nativeTracks.length; i++) {
            nativeTracks[i].mode =
              nativeTracks[i].label === label ? "showing" : "disabled";
          }
        }
        subtitleMenu.classList.add("hidden");
      });
      subtitleMenu.appendChild(btn);
    });
  };

  // Toggle subtitle menu on CC button click
  ccButton.addEventListener("click", (e) => {
    e.stopPropagation();
    populateSubtitleMenu();
    subtitleMenu.classList.toggle("hidden");
    qualityMenu.classList.add("hidden");
  });

  // Close subtitle and quality menus when clicking outside
  document.addEventListener("click", () => {
    subtitleMenu.classList.add("hidden");
    qualityMenu.classList.add("hidden");
  });

  // Add all controls to the controls container
  controls.append(
    playButton,
    timerDisplay,
    progressBar,
    volumeSlider,
    qualityButton,
    ...(subtitleTracks.length ? [ccButton] : []),
    fullScreenButton,
  );

  // Subtitle and quality menus are absolutely positioned inside the player wrapper
  playerWrapper.appendChild(subtitleMenu);
  playerWrapper.appendChild(qualityMenu);

  // Format seconds as mm:ss
  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  // Sync big button and play button icons based on video state
  const updateUIState = () => {
    const isPaused = video.paused;
    playButton.replaceChildren(getIcon(isPaused ? "play" : "pause"));
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
    if (skeleton) {
      skeleton.style.opacity = "0";
      setTimeout(() => skeleton.remove(), 500);
    }
    timerDisplay.textContent = `0:00 / ${formatTime(video.duration)}`;
  });

  // Show buffering spinner when video is waiting/buffering
  let wasWaiting = false;
  video.addEventListener("waiting", () => {
    bufferingSpinner.style.display = "flex";
    wasWaiting = true;
    if (isAutoMode) runAutoCheck(); // connection likely degraded
  });
  video.addEventListener("playing", () => {
    bufferingSpinner.style.display = "none";
    if (wasWaiting && isAutoMode) {
      wasWaiting = false;
      runAutoCheck();
    } // may have recovered
  });
  video.addEventListener("pause", () => {
    bufferingSpinner.style.display = "none";
  });
  video.addEventListener("ended", () => {
    bufferingSpinner.style.display = "none";
    updateUIState();
  });
  video.addEventListener("canplay", () => {
    bufferingSpinner.style.display = "none";
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

  // Single timeupdate handler: update buffered bar + progress + timer
  video.addEventListener("timeupdate", () => {
    updateBuffered();
    if (!isNaN(video.duration)) {
      progressBar.value = (video.currentTime / video.duration) * 100;
      updateRangeValue(progressBar);
    }
    timerDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
  });

  // Show thumbnail + time tooltip on progress bar hover
  let lastThumbSeekTime = -1;
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
    progressTooltipTime.textContent = formatTime(hoverTime);
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

  // Change volume when volume slider is changed
  volumeSlider.addEventListener("input", () => {
    video.volume = volumeSlider.value;
    updateRangeValue(volumeSlider);
  });

  // Sync volume slider if volume is changed programmatically
  video.addEventListener("volumechange", () => {
    volumeSlider.value = video.volume;
    updateRangeValue(volumeSlider);
  });

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
  updateRangeValue(volumeSlider);

  // Keyboard shortcuts:
  // Space = play/pause, F = fullscreen
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

  // Schedule hide when video starts playing (fullscreen only)
  video.addEventListener("play", () => {
    if (document.fullscreenElement === playerWrapper) scheduleControlsHide();
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

    const quality = isAutoMode
      ? `Auto (${sources[activeSourceIndex].label})`
      : sources[activeSourceIndex].label;

    const activeSub = (() => {
      if (activeAssTrackSrc) {
        const t = subtitleTracks.find((s) => s.src === activeAssTrackSrc);
        return t ? `${t.label} (ASS)` : "ASS";
      }
      const showing = Array.from(video.textTracks).find(
        (t) => t.mode === "showing",
      );
      return showing ? `${showing.label} (VTT)` : "None";
    })();

    const rows = [
      ["wdPlayer", "v1.0"],
      ...(sources.length > 1 ? [["Quality", quality]] : []),
      ...(subtitleTracks.length ? [["Subtitles", activeSub]] : []),
      [
        "Resolution",
        video.videoWidth ? `${video.videoWidth}×${video.videoHeight}` : "—",
      ],
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
