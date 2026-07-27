(function () {
  // ─── Config ───────────────────────────────────────────────────────────────
  const TOOLTIPS_ENABLED = true; // set false to disable button tooltips
  const LOGO_ENABLED = true; // set false to disable logo on video
  const LOGO_TEXT = "wdPlayer"; // set website name etc., LOGO_ENABLED must be true
  // ──────────────────────────────────────────────────────────────────────────

  // Get the main player wrapper element
  const playerWrapper = document.getElementById("wdPlayer");

  // Helper function to create elements - start
  // Universal helper to create elements: tags, properties, styles, and children
  const el = (tag, props, style, children) => {
    const element = document.createElement(tag);

    // Safely assign properties and attributes
    if (props) {
      Object.keys(props).forEach((key) => {
        // If the key contains a dash (like aria-* or data-*) or is a custom attribute, use setAttribute
        if (
          key.includes("-") ||
          key === "max" ||
          key === "step" ||
          key === "min"
        ) {
          element.setAttribute(key, props[key]);
        } else {
          element[key] = props[key];
        }
      });
    }

    if (style) Object.assign(element.style, style);

    if (children) {
      if (typeof children === "string") {
        element.textContent = children;
      } else if (Array.isArray(children)) {
        element.append(...children.filter(Boolean));
      }
    }
    return element;
  };
  // Helper function to create elements - end

  // Create skeleton loader
  const skeleton = el("div", { id: "skeletonloader" });
  skeleton.append(el("div", { className: "shimmer" }));
  playerWrapper.append(skeleton);

  // Buffering spinner overlay
  const bufferingSpinner = el(
    "div",
    { id: "bufferingSpinner" },
    { display: "none" },
  );
  bufferingSpinner.append(el("div", { className: "spinner" }));
  playerWrapper.append(bufferingSpinner);

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
    mic: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>`,
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
  const video = el("video", { id: "wd", preload: "auto" });
  playerWrapper.appendChild(video);

  // Create Logo element and add it to the player
  if (LOGO_ENABLED) {
    playerWrapper.append(el("span", { id: "logo", textContent: LOGO_TEXT }));
  }
  function repositionLogo() {
    const videoRatio = video.videoWidth / video.videoHeight;
    const wrapperRatio = playerWrapper.clientWidth / playerWrapper.clientHeight;

    let actualVideoWidth;
    let actualVideoHeight;

    if (wrapperRatio > videoRatio) {
      // Video has black bars on the sides
      actualVideoHeight = playerWrapper.clientHeight;
      actualVideoWidth = actualVideoHeight * videoRatio;
    } else {
      // Video has black bars on top and bottom
      actualVideoWidth = playerWrapper.clientWidth;
      actualVideoHeight = actualVideoWidth / videoRatio;
    }

    // Calculate the offset (black bar size)
    const horizontalBar = (playerWrapper.clientWidth - actualVideoWidth) / 2;
    const verticalBar = (playerWrapper.clientHeight - actualVideoHeight) / 2;

    // Position logo inside the real video frame (e.g., 15px from inside edges)
    logo.style.right = `${horizontalBar + 15}px`;
    logo.style.top = `${verticalBar + 15}px`;
  }
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

  // Infer media MIME type from URL when source.type is omitted
  const inferSourceTypeFromUrl = (url) => {
    // Extract the extension cleanly in one line without url parameters
    const ext = String(url || "")
      .split("?")[0]
      .split(".")
      .pop()
      ?.toLowerCase();

    // Map extensions directly to their respective MIME types
    const types = {
      m3u8: "application/vnd.apple.mpegurl",
      mpd: "application/dash+xml",
      webm: "video/webm",
      ogv: "video/ogg",
      ogg: "video/ogg",
    };

    // Return the matched type, or fall back to mp4
    return types[ext] || "video/mp4";
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
        const type = inferSourceTypeFromUrl(raw);
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

  // Backfill missing source.type values to keep source handling predictable
  sources = sources.map((s) => ({
    ...s,
    type: s.type || inferSourceTypeFromUrl(s.src),
  }));

  // If sources is empty (no valid params), show error UI and stop execution
  if (!sources.length) {
    // Create the main error container and nest all child elements inside it
    const noSrcErr = el("div", { id: "videoError" }, null, [
      "No video sources provided.",
      el("br"),
      el("small", null, null, [
        "Use ",
        el("code", { textContent: "?sources=[...]" }),
        " or ",
        el("code", { textContent: "?v=HASH" }),
      ]),
    ]);

    // Hide the skeleton loader since there is an error
    skeleton.style.display = "none";

    // Push the single error component into the main wrapper
    playerWrapper.append(noSrcErr);
    return;
  }

  let activeSourceIndex = 0;

  // localStorage key for resume position — keyed safely by the ?v= URL param
  const resumeKey = `wdPlayer:resume:${new URLSearchParams(location.search).get("v") ?? sources[0]?.src ?? ""}`;

  const HLS_MIME_TYPES = [
    "application/vnd.apple.mpegurl",
    "application/x-mpegURL",
  ];
  const DASH_MIME_TYPES = ["application/dash+xml"];
  const HLS_JS_URL = "js/hls-min.js";
  const DASH_JS_URL = "js/dash.all-min.js";

  const hasMseSupport = () =>
    !!(window.MediaSource || window.WebKitMediaSource);
  const canPlayNativeHls = () =>
    HLS_MIME_TYPES.some((mime) => video.canPlayType(mime) !== "");

  const isHlsSource = (entry) => {
    if (!entry) return false;
    const type = (entry.type || "").toLowerCase();
    return (
      HLS_MIME_TYPES.includes(type) || /\.m3u8(\?|$)/i.test(entry.src || "")
    );
  };

  const isDashSource = (entry) => {
    if (!entry) return false;
    const type = (entry.type || "").toLowerCase();
    return (
      DASH_MIME_TYPES.includes(type) || /\.mpd(\?|$)/i.test(entry.src || "")
    );
  };

  // Shared dynamic script loader for optional playback engines (HLS / DASH)
  const scriptLoadState = {};
  const loadExternalScript = (src, globalName, cb) => {
    if (window[globalName]) return cb(true);

    if (!scriptLoadState[src]) {
      scriptLoadState[src] = { loading: false, loaded: false, callbacks: [] };
    }

    const state = scriptLoadState[src];
    if (state.loaded) return cb(true);

    state.callbacks.push(cb);
    if (state.loading) return;
    state.loading = true;

    // Use our global custom helper function to instantiate the script element cleanly
    const s = el("script", { src });

    s.onload = () => {
      state.loading = false;
      state.loaded = !!window[globalName];
      state.callbacks.splice(0).forEach((fn) => fn(state.loaded));
    };

    s.onerror = () => {
      state.loading = false;
      state.loaded = false;
      state.callbacks.splice(0).forEach((fn) => fn(false));
    };

    document.head.append(s); // Modern DOM manipulation for head insertion
  };

  let hlsInstance = null;
  let thumbHlsInstance = null;
  let dashInstance = null;
  let thumbDashInstance = null;
  let dashSubtitleTracks = [];
  let activeDashTrackApiIndex = -1;
  let hlsSubtitleTracks = [];
  let activeHlsSubtitleIndex = -1;
  let adaptiveAttachInProgress = false;

  // Quality levels for adaptive streams
  // Each entry: { label, qualityIndex, bitrate, width, height }
  let dashQualityLevels = []; // filled after STREAM_INITIALIZED
  let hlsQualityLevels = []; // filled after MANIFEST_PARSED
  let dashQualityAuto = true; // whether dash.js ABR is controlling quality
  let hlsQualityAuto = true; // whether hls.js ABR is controlling quality

  const destroyAdaptivePlayers = () => {
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    if (dashInstance) {
      dashInstance.reset();
      dashInstance = null;
    }
    if (typeof thumbDashInstance !== "undefined" && thumbDashInstance) {
      thumbDashInstance.destroy();
      thumbDashInstance = null;
    }
    if (typeof thumbHlsInstance !== "undefined" && thumbHlsInstance) {
      thumbHlsInstance.destroy();
      thumbHlsInstance = null;
    }

    /**
     * Using window['thumbVideo'] or document.getElementById bypasses the JavaScript
     * 'Temporal Dead Zone' (ReferenceError) when the const is declared lower in the file.
     */
    const activeThumbVideo =
      window.thumbVideo ||
      document.getElementById("thumbVideo") ||
      document.querySelector(".thumb-video");

    if (activeThumbVideo) {
      activeThumbVideo.removeAttribute("src");
      try {
        activeThumbVideo.load(); // Safely flush internal browser video buffers
      } catch (e) {
        // Prevent edge-case errors if element is momentarily detached
      }
    }

    dashSubtitleTracks = [];
    activeDashTrackApiIndex = -1;
    hlsSubtitleTracks = [];
    activeHlsSubtitleIndex = -1;
    dashQualityLevels = [];
    hlsQualityLevels = [];
    dashQualityAuto = true;
    hlsQualityAuto = true;
  };

  const restorePlaybackState = (savedTime, wasPlaying) => {
    if (savedTime > 0) {
      const applyTime = () => {
        try {
          video.currentTime = savedTime;
        } catch (_) {}
      };
      if (video.readyState >= 1) applyTime();
      else video.addEventListener("loadedmetadata", applyTime, { once: true });
    }
    if (wasPlaying) {
      const tryPlay = () => video.play().catch(() => {});
      if (video.readyState >= 2) tryPlay();
      else video.addEventListener("canplay", tryPlay, { once: true });
    }
  };

  const source = document.createElement("source");
  video.appendChild(source);

  const setNativeSource = (entry, savedTime = 0, wasPlaying = false) => {
    adaptiveAttachInProgress = false;
    destroyAdaptivePlayers();
    source.src = entry.src;
    source.type = entry.type;
    video.load();
    restorePlaybackState(savedTime, wasPlaying);
  };

  const setHlsJsSource = (entry, savedTime = 0, wasPlaying = false) => {
    adaptiveAttachInProgress = true;
    loadExternalScript(HLS_JS_URL, "Hls", (ok) => {
      if (!ok || !window.Hls || !window.Hls.isSupported()) {
        adaptiveAttachInProgress = false;
        console.error("wdPlayer: hls.js failed to load or is unsupported");
        setNativeSource(entry, savedTime, wasPlaying);
        return;
      }

      destroyAdaptivePlayers();
      source.removeAttribute("src");
      source.removeAttribute("type");
      source.remove();

      hlsInstance = new window.Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      /**
       * Dynamic Audio Tracks Parser for hls.js
       * Generates HTML UI only if the manifest dictates multiple tracks
       */
      const refreshHlsAudio = () => {
        try {
          // Fetch all available audio streams bound to the current hlsInstance
          const audioTracks = hlsInstance.audioTracks || [];

          // CRITICAL UI SAFEGUARD: If stream has 1 or fewer audio variants, wipe any leftover UI components and exit
          if (audioTracks.length <= 1) {
            const oldBtn = document.getElementById("audioSelectButton");
            const oldMenu = document.getElementById("audioSelectMenu");

            if (oldBtn) oldBtn.remove(); // Completely removes the button from DOM
            if (oldMenu) oldMenu.remove(); // Completely removes the menu container from DOM

            // Unbind the global click listener to prevent memory leaks
            if (typeof activeAudioCleanup === "function") {
              activeAudioCleanup();
              activeAudioCleanup = null;
            }
            return; // STOP EXECUTION HERE - No button or menu will be created!
          }

          // TRACK VALIDATION PASSED (2 or more languages found): Initialize DOM elements on demand
          const { audioSelect, audioSelectMenu, closeMenuHandler } =
            multiAudio();
          activeAudioCleanup = () =>
            document.removeEventListener("click", closeMenuHandler);

          // Identify which track index signature is currently assigned as active by hls.js engine
          const currentTrackId = hlsInstance.audioTrack;
          audioSelectMenu.innerHTML = "";

          // Populate the clean wrapper layout with real streams parsed from the active .m3u8 manifest
          audioTracks.forEach((track) => {
            const trackBtn = document.createElement("button");
            trackBtn.classList.add("subtitle-option");

            // Evaluate item indexes to flag the active choice layout class matching the audio pipeline
            const isCurrent =
              currentTrackId === track.id ||
              (currentTrackId === -1 && (track.default || track.active));
            if (isCurrent) {
              trackBtn.classList.add("active");
            }

            // Normalize localized data descriptors (e.g., "en" -> "EN")
            const langName = track.lang
              ? track.lang.toUpperCase()
              : track.name || "UNKNOWN";
            trackBtn.textContent = langName;

            // Process user language selection
            trackBtn.addEventListener("click", (e) => {
              e.stopPropagation();

              // Instruct hls.js core engine to hot-swap audio track buffers by numeric ID signature
              hlsInstance.audioTrack = track.id;

              // Update visual tracking states dynamically inside the dropup module layout wrapper
              if (audioSelectMenu) {
                const allOptions =
                  audioSelectMenu.querySelectorAll(".subtitle-option");
                allOptions.forEach((btn) => {
                  btn.classList.remove("active");
                  if (btn.classList.length === 0) {
                    btn.removeAttribute("class");
                  }
                });
              }

              trackBtn.classList.add("active");
              audioSelectMenu?.classList.add("hidden");
            });

            audioSelectMenu.appendChild(trackBtn);
          });
        } catch (err) {
          console.error(
            "wdPlayer: Failed to parse hls.js audio components",
            err,
          );
        }
      };

      hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, (event, data) => {
        adaptiveAttachInProgress = false;
        refreshHlsQuality(data && data.levels);
        restorePlaybackState(savedTime, wasPlaying);
      });

      hlsInstance.on(window.Hls.Events.AUDIO_TRACKS_UPDATED, (event, data) => {
        // We read the tracks directly from the event data or the fallback player instance
        const tracks =
          (data && data.audioTracks) || hlsInstance.audioTracks || [];

        refreshHlsAudio();
      });
      hlsInstance.on(
        window.Hls.Events.SUBTITLE_TRACKS_UPDATED,
        (event, data) => {
          const tracks =
            (data && data.subtitleTracks) || hlsInstance.subtitleTracks || [];
          hlsSubtitleTracks = tracks.map((t, i) => ({
            label:
              t.name || (t.lang ? `Subtitle (${t.lang})` : `Subtitle ${i + 1}`),
            language: t.lang || "",
            hlsIndex: i,
            type: "hls",
          }));
          // Default: no subtitle selected
          hlsInstance.subtitleDisplay = false;
          hlsInstance.subtitleTrack = -1;
          activeHlsSubtitleIndex = -1;
          updateSubtitleAvailability();
          populateSubtitleMenu();
        },
      );
      hlsInstance.on(window.Hls.Events.SUBTITLE_TRACK_SWITCH, (event, data) => {
        // Ignore auto-switch events when subtitleDisplay is off (we explicitly disabled)
        if (!hlsInstance.subtitleDisplay) return;
        activeHlsSubtitleIndex =
          data && typeof data.id === "number" ? data.id : -1;
        updateCcButtonState();
        populateSubtitleMenu();
      });
      hlsInstance.on(window.Hls.Events.LEVEL_SWITCHED, () => {
        if (typeof updateAdaptiveQualityButton === "function") {
          updateAdaptiveQualityButton();
        }
      });
      hlsInstance.on(window.Hls.Events.ERROR, (_, data) => {
        if (!data || !data.fatal) return;
        if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
          hlsInstance.startLoad();
          return;
        }
        if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
          hlsInstance.recoverMediaError();
          return;
        }
        adaptiveAttachInProgress = false;
        hlsInstance.destroy();
        hlsInstance = null;
      });
      hlsInstance.loadSource(new URL(entry.src, document.baseURI).href);
      hlsInstance.attachMedia(video);
    });
  };

  const setDashJsSource = (entry, savedTime = 0, wasPlaying = false) => {
    adaptiveAttachInProgress = true;
    loadExternalScript(DASH_JS_URL, "dashjs", (ok) => {
      if (!ok || !window.dashjs || !hasMseSupport()) {
        adaptiveAttachInProgress = false;
        console.error("wdPlayer: dash.js failed to load or MSE is unsupported");
        setNativeSource(entry, savedTime, wasPlaying);
        return;
      }

      destroyAdaptivePlayers();
      source.removeAttribute("src");
      source.removeAttribute("type");
      source.remove();

      dashInstance = window.dashjs.MediaPlayer().create();
      if (typeof dashInstance.updateSettings === "function") {
        dashInstance.updateSettings({
          streaming: {
            text: {
              defaultEnabled: false,
            },
          },
        });
      }
      dashInstance.initialize(
        video,
        new URL(entry.src, document.baseURI).href,
        false,
      );
      const dashEvents = window.dashjs.MediaPlayer.events;

      // Build dashSubtitleTracks from a tracks array.
      // tracksArr is the same sorted array that dash.js uses internally, so
      // the array position (dashTrackIndex) is the correct index for setTextTrack().
      const buildDashTracks = (tracksArr) => {
        dashSubtitleTracks = (tracksArr || []).map((t, dashTrackIndex) => ({
          label:
            t?.labels?.[0]?.text ||
            t?.label ||
            (t?.lang
              ? `Subtitle (${t.lang})`
              : `Subtitle ${dashTrackIndex + 1}`),
          language: t?.lang || "",
          // dashApiIndex equals dashTrackIndex here — both are the sorted position
          dashApiIndex: dashTrackIndex,
          dashTrackIndex,
          dashTrackRef: t,
          type: "dash",
        }));
        if (typeof updateSubtitleAvailability === "function") {
          updateSubtitleAvailability();
        }
      };

      const refreshDashTracks = () => {
        try {
          buildDashTracks(dashInstance.getTracksFor("text"));
        } catch {
          dashSubtitleTracks = [];
          activeDashTrackApiIndex = -1;
          if (typeof updateSubtitleAvailability === "function") {
            updateSubtitleAvailability();
          }
        }
      };
      /**
       * Dynamic Audio Tracks Parser for dash.js
       * Generates HTML UI only if the manifest dictates multiple tracks
       */
      const refreshDashAudio = () => {
        try {
          const audioTracks = dashInstance.getTracksFor("audio") || [];

          // Fallback Strategy: If stream has 1 or fewer audio variants, wipe any leftover UI components and exit
          if (audioTracks.length <= 1) {
            const oldBtn = document.getElementById("audioSelectButton");
            const oldMenu = document.getElementById("audioSelectMenu");
            if (oldBtn) oldBtn.remove();
            if (oldMenu) oldMenu.remove();
            if (typeof activeAudioCleanup === "function") activeAudioCleanup();
            return;
          }

          // Track Validation Passed: Initialize DOM elements on demand and store the listener removal hook
          const { audioSelect, audioSelectMenu, closeMenuHandler } =
            multiAudio();
          activeAudioCleanup = () =>
            document.removeEventListener("click", closeMenuHandler);

          const currentTrack = dashInstance.getCurrentTrackFor("audio");
          audioSelectMenu.innerHTML = "";

          // Populate the clean wrapper layout with real streams parsed from the active MPD manifest
          audioTracks.forEach((track) => {
            const trackBtn = document.createElement("button");
            trackBtn.classList.add("subtitle-option");

            // Evaluate item indexes to flag the active choice layout class matching the audio buffer pipeline
            const isCurrent =
              currentTrack && currentTrack.index === track.index;
            if (isCurrent) {
              trackBtn.classList.add("active");
            }

            // Normalize localized data descriptors (e.g., "en" -> "EN")
            const langName = track.lang ? track.lang.toUpperCase() : "UNKNOWN";
            const trackRoles =
              track.roles && track.roles.length
                ? ` (${track.roles.join(", ")})`
                : "";
            trackBtn.textContent = `${langName}${trackRoles}`;

            // Process user language selection
            trackBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              dashInstance.setCurrentTrack(track);

              // Update visual tracking states dynamically inside the dropup module layout wrapper
              audioSelectMenu
                .querySelectorAll(".subtitle-option")
                .forEach((btn) => {
                  btn.classList.remove("active");
                });

              trackBtn.classList.add("active");
              audioSelectMenu.classList.add("hidden");
            });

            audioSelectMenu.appendChild(trackBtn);
          });
        } catch (err) {
          console.error(
            "wdPlayer: Failed to parse dash.js audio components",
            err,
          );
        }
      };
      if (dashEvents && dashEvents.STREAM_INITIALIZED) {
        dashInstance.on(dashEvents.STREAM_INITIALIZED, () => {
          adaptiveAttachInProgress = false;
          refreshDashTracks();
          refreshDashQuality();
          refreshDashAudio(); //  Refresh audio tracks when stream initializes
          disableDashTextTracks();
          restorePlaybackState(savedTime, wasPlaying);
        });
      } else {
        adaptiveAttachInProgress = false;
        refreshDashTracks();
        refreshDashQuality();
        refreshDashAudio(); // Fallback audio track ignition sequence
        disableDashTextTracks();
        restorePlaybackState(savedTime, wasPlaying);
      }

      // Re-read quality list once metadata is loaded — by then all
      // representation entries from the manifest are fully parsed.
      if (dashEvents && dashEvents.PLAYBACK_METADATA_LOADED) {
        dashInstance.on(
          dashEvents.PLAYBACK_METADATA_LOADED,
          refreshDashQuality,
          refreshDashAudio,
        );
      }
      // Also refresh when dash.js switches to a different period/stream
      if (dashEvents && dashEvents.STREAM_ACTIVATED) {
        dashInstance.on(
          dashEvents.STREAM_ACTIVATED,
          refreshDashQuality,
          refreshDashAudio,
        );
      }

      if (dashEvents && dashEvents.TEXT_TRACKS_ADDED) {
        // TEXT_TRACKS_ADDED event carries the sorted tracks array that
        // dash.js uses internally — use it directly so positions align
        // with what setTextTrack() expects.
        dashInstance.on(dashEvents.TEXT_TRACKS_ADDED, (e) => {
          try {
            buildDashTracks(e?.tracks);
            // Keep activeDashTrackApiIndex = -1 (None) on stream load
            activeDashTrackApiIndex = -1;
          } catch {
            refreshDashTracks();
          }
        });
      }

      if (dashEvents && dashEvents.QUALITY_CHANGE_RENDERED) {
        dashInstance.on(dashEvents.QUALITY_CHANGE_RENDERED, (e) => {
          if (
            e?.mediaType === "video" &&
            typeof updateAdaptiveQualityButton === "function"
          ) {
            updateAdaptiveQualityButton();
          }
        });
      }
    });
  };

  const setActiveSource = (entry, savedTime = 0, wasPlaying = false) => {
    if (isHlsSource(entry)) {
      // Prefer hls.js when MSE is available — it enables quality selection.
      // Fall back to native HLS only when MSE is absent (e.g. iOS Safari).
      if (hasMseSupport()) {
        setHlsJsSource(entry, savedTime, wasPlaying);
      } else if (canPlayNativeHls()) {
        setNativeSource(entry, savedTime, wasPlaying);
      } else {
        setHlsJsSource(entry, savedTime, wasPlaying); // will error-handle internally
      }
      return;
    }
    if (isDashSource(entry)) {
      setDashJsSource(entry, savedTime, wasPlaying);
      return;
    }
    setNativeSource(entry, savedTime, wasPlaying);
  };

  setActiveSource(sources[activeSourceIndex]);

  // Error handling for empty or broken source
  video.addEventListener(
    "error",
    () => {
      if (adaptiveAttachInProgress) return;
      console.error("Video Error: Source is empty or could not be loaded.");
      const errorMsg = document.createElement("div");
      errorMsg.id = "videoError";
      const active = sources[activeSourceIndex];
      errorMsg.textContent =
        isHlsSource(active) &&
        !canPlayNativeHls() &&
        !(window.Hls && window.Hls.isSupported())
          ? "Error: This browser does not support native HLS (.m3u8) playback"
          : isDashSource(active) && !hasMseSupport()
            ? "Error: This browser does not support MPEG-DASH playback"
            : "Error: Video source is empty or unavailable";
      if (controls) controls.style.display = "none";
      if (bigPlayButton) bigPlayButton.style.display = "none";
      skeleton.style.display = "none";
      playerWrapper.appendChild(errorMsg);
    },
    true,
  );

  // Create CC Button — hidden by default, shown only if a subtitle track loads successfully
  const ccButton = el(
    "button",
    { id: "ccButton", "aria-label": "Subtitles" },
    { display: "none" },
  );
  ccButton.append(getIcon("cc")); // Clean and consistent icon insertion

  // Create Subtitles Menu Container
  const subtitleMenu = el("div", { id: "subtitleMenu", className: "hidden" });

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

  const disableDashTextTracks = () => {
    if (!dashInstance) return;
    try {
      if (typeof dashInstance.setTextTrack === "function") {
        dashInstance.setTextTrack(-1);
      }
      if (typeof dashInstance.enableText === "function") {
        dashInstance.enableText(false);
      }
      activeDashTrackApiIndex = -1;
    } catch (_) {}
  };

  const disableAllNativeTracks = () => {
    for (const t of video.textTracks) t.mode = "disabled";
    disableDashTextTracks();
    activeHlsSubtitleIndex = -1;
    if (hlsInstance) {
      try {
        hlsInstance.subtitleDisplay = false;
        hlsInstance.subtitleTrack = -1;
      } catch (_) {}
    }
  };

  // Build a human-readable label for an adaptive quality level
  const makeQualityLabel = (bitrate, width, height) => {
    if (height) return `${height}p`;
    if (bitrate) return `${Math.round(bitrate / 1000)} kbps`;
    return "Auto";
  };

  // Refresh DASH quality levels from the current dash instance.
  // Deduplicates by height, keeping the highest-bitrate entry per height.
  const refreshDashQuality = () => {
    if (!dashInstance) return;
    try {
      const list = dashInstance.getBitrateInfoListFor("video") || [];
      // Map all entries with their original qualityIndex
      const all = list.map((b, i) => ({
        label: makeQualityLabel(b.bitrate, b.width, b.height),
        qualityIndex: i,
        bitrate: b.bitrate,
        width: b.width,
        height: b.height,
      }));
      // Deduplicate: for each unique height keep the highest bitrate entry.
      // Entries without a height are kept as-is (keyed by bitrate).
      const byKey = new Map();
      for (const entry of all) {
        const key = entry.height ? `h${entry.height}` : `b${entry.bitrate}`;
        const existing = byKey.get(key);
        if (!existing || entry.bitrate > existing.bitrate) {
          byKey.set(key, entry);
        }
      }
      dashQualityLevels = Array.from(byKey.values());
    } catch {
      dashQualityLevels = [];
    }
    if (typeof updateAdaptiveQualityButton === "function") {
      updateAdaptiveQualityButton();
    }
  };

  // Refresh HLS quality levels from the current hls instance
  const refreshHlsQuality = (levels) => {
    if (!hlsInstance) return;
    try {
      const src = levels || hlsInstance.levels || [];
      const all = src.map((l, i) => ({
        label: makeQualityLabel(l.bitrate, l.width, l.height),
        qualityIndex: i,
        bitrate: l.bitrate,
        width: l.width,
        height: l.height,
      }));
      // Deduplicate: for each unique height keep the highest-bitrate entry.
      const byKey = new Map();
      for (const entry of all) {
        const key = entry.height ? `h${entry.height}` : `b${entry.bitrate}`;
        const existing = byKey.get(key);
        if (!existing || entry.bitrate > existing.bitrate) {
          byKey.set(key, entry);
        }
      }
      hlsQualityLevels = Array.from(byKey.values());
    } catch (err) {
      hlsQualityLevels = [];
    }
    if (typeof updateAdaptiveQualityButton === "function") {
      updateAdaptiveQualityButton();
    }
  };

  const getNativeSubtitleEntries = () =>
    Array.from(video.textTracks || [])
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => t.kind === "subtitles" || t.kind === "captions")
      .map(({ t, i }) => ({
        label:
          t.label || (t.language ? `Subtitle (${t.language})` : "Subtitle"),
        nativeTrackIndex: i,
        language: t.language || "",
        type: "native",
      }));

  const getSubtitleMenuEntries = () => {
    const preferDashTracks = dashSubtitleTracks.length > 0;
    const preferHlsTracks = hlsSubtitleTracks.length > 0;
    const configuredNativeKeys = new Set(
      subtitleTracks
        .filter((t) => t.type !== "ass")
        .map(
          (t) =>
            `${(t.label || "").toLowerCase()}|${(t.srclang || "").toLowerCase()}`,
        ),
    );
    const uniqueNativeTracks = getNativeSubtitleEntries().filter((t) => {
      const key = `${(t.label || "").toLowerCase()}|${(t.language || "").toLowerCase()}`;
      return !configuredNativeKeys.has(key);
    });
    const entries = [
      ...subtitleTracks,
      ...(preferDashTracks || preferHlsTracks ? [] : uniqueNativeTracks),
      ...dashSubtitleTracks,
      ...hlsSubtitleTracks,
    ];
    const seen = new Set();
    return entries.filter((e) => {
      let key = "";
      if (e.type === "ass") key = `ass:${e.src || e.label}`;
      else if (e.type === "native") key = `native:${e.nativeTrackIndex}`;
      else if (e.type === "dash")
        key = `dash:${e.dashApiIndex ?? e.dashTrackIndex}`;
      else if (e.type === "hls") key = `hls:${e.hlsIndex}`;
      else
        key = `cfg:${e.type || "text"}:${(e.label || "").toLowerCase()}|${(e.srclang || "").toLowerCase()}|${e.src || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const getActiveDashTrackUiIndex = () => {
    if (!dashInstance) return -1;
    // activeDashTrackApiIndex is the sorted array position passed to setTextTrack,
    // which equals the dashSubtitleTracks array index — so return it directly.
    if (activeDashTrackApiIndex === -1) return -1;
    if (
      Number.isInteger(activeDashTrackApiIndex) &&
      activeDashTrackApiIndex >= 0 &&
      dashSubtitleTracks[activeDashTrackApiIndex]
    ) {
      return activeDashTrackApiIndex;
    }
    return -1;
  };

  const activateDashTrackByIndex = (dashTrackIndex, dashApiIndex) => {
    if (!dashInstance || dashTrackIndex == null || dashTrackIndex < 0)
      return false;
    try {
      // enableText(true) must come first to activate the text renderer
      if (typeof dashInstance.enableText === "function") {
        dashInstance.enableText(true);
      }
      // setTextTrack expects the array position in getTracksFor("text") —
      // dashTrackIndex is exactly that. Do NOT use dashApiIndex (t.index) here
      // as it may differ from the TextController's internal array index.
      if (typeof dashInstance.setTextTrack === "function") {
        dashInstance.setTextTrack(dashTrackIndex);
      }
      activeDashTrackApiIndex =
        typeof dashApiIndex === "number" ? dashApiIndex : dashTrackIndex;
      return true;
    } catch {
      return false;
    }
  };

  const updateSubtitleAvailability = () => {
    ccButton.style.display = getSubtitleMenuEntries().length ? "" : "none";
  };

  // Load an ASS track via Octopus (loads the library on first use)
  const loadAssTrack = (src) => {
    destroyOctopus();
    disableAllNativeTracks();
    const resolvedUrl = new URL(src, document.baseURI).href;
    fetch(resolvedUrl, { method: "HEAD", credentials: "omit" })
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
    fetch(resolvedUrl, { method: "HEAD", credentials: "omit" })
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

  if (video.textTracks && video.textTracks.addEventListener) {
    video.textTracks.addEventListener("addtrack", updateSubtitleAvailability);
    video.textTracks.addEventListener(
      "removetrack",
      updateSubtitleAvailability,
    );
  }

  // Resume toast — shown when a saved position is found
  const resumeToastText = el("span");
  const resumeBtn = el("button", { id: "resumeBtn", textContent: "Resume" });
  const resumeDismissBtn = el("button", {
    id: "resumeDismissBtn",
    textContent: "×",
    "aria-label": "Dismiss",
  });

  const resumeToast = el("div", { id: "resumeToast" }, { display: "none" }, [
    resumeToastText,
    resumeBtn,
    resumeDismissBtn,
  ]);

  // Create the central big play button
  const bigPlayButton = el("button", {
    id: "bigPlayButton",
    "aria-label": "Play",
  });
  bigPlayButton.append(getIcon("play"));

  // Create the controls container
  const controls = el("div", { id: "controls" });

  // Create control buttons and elements
  const playButton = el("button", { id: "playPause", "aria-label": "Play" });
  playButton.append(getIcon("play"));

  const fullScreenButton = el("button", {
    id: "fullScreen",
    "aria-label": "Enter fullscreen",
  });
  fullScreenButton.append(getIcon("fullscreen"));

  const timerDisplay = el("span", { id: "timer", textContent: "0:00 / 0:00" });

  const progressBar = el("input", {
    id: "progressBar",
    type: "range",
    value: 0,
    max: 100,
    step: 0.1,
    "aria-label": "Seek",
  });

  // Tooltip shown above progress bar on hover (thumbnail + time)
  const thumbShimmer = el("div", { id: "thumbShimmer" });
  const progressTooltipTime = el("span", { id: "progressTooltipTime" });

  // Hidden video used to display thumbnail frames directly
  const thumbVideo = el(
    "video",
    {
      muted: true,
      preload: "auto", // Signals Chrome/Edge to fetch streams immediately
      playsInline: true,
      // crossOrigin: "anonymous", // Essential for cross-origin hosting
    },
    {
      width: "160px",
      height: "90px",
      objectFit: "cover", // Forces the video to frame perfectly like a canvas without stretching
      display: "block",
      backgroundColor: "#000000", // Solid dark baseline backdrop
    },
  );

  const progressTooltip = el(
    "div",
    { id: "progressTooltip" },
    { display: "none" },
    [thumbVideo, thumbShimmer, progressTooltipTime],
  );
  const muteButton = el("button", { id: "muteButton", "aria-label": "Mute" });
  muteButton.append(getIcon("volumeHigh"));

  const volumeSlider = el("input", {
    id: "volumeSlider",
    type: "range",
    min: 0,
    max: 1,
    step: 0.01,
    value: 1,
    "aria-label": "Volume",
  });

  // Create Quality Button
  const qualityButton = el(
    "button",
    { id: "qualityButton", textContent: "Auto" },
    sources.length <= 1 ? { display: "none" } : null,
  );

  // Create Quality Menu Container
  const qualityMenu = el("div", { id: "qualityMenu", className: "hidden" });

  // Create Speed Button
  const speedButton = el("button", { id: "speedButton", textContent: "1×" });

  // Create Speed Menu
  const speedMenu = el("div", { id: "speedMenu", className: "hidden" });

  const SPEED_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // Handle thumbnail rendering lifecycle natively on the video element
  thumbVideo.addEventListener("seeking", () => {
    Object.assign(thumbShimmer.style, { display: "block" });
  });

  thumbVideo.addEventListener("seeked", () => {
    Object.assign(thumbShimmer.style, { display: "none" });
  });

  // Restore saved volume preference from previous session
  try {
    const _sv = parseFloat(localStorage.getItem("wdPlayer:volume"));
    if (!isNaN(_sv)) {
      video.volume = _sv;
      volumeSlider.value = _sv;
    }
    if (localStorage.getItem("wdPlayer:muted") === "1") {
      video.muted = true;
    }
  } catch (_) {}

  const updateSpeedLabel = () => {
    speedButton.textContent = `${video.playbackRate}×`;
  };

  const populateSpeedMenu = () => {
    speedMenu.replaceChildren();
    const fragment = document.createDocumentFragment();

    SPEED_RATES.forEach((rate) => {
      const classes = [
        "subtitle-option",
        video.playbackRate === rate ? "active" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const btn = el("button", {
        className: classes,
        textContent: rate === 1 ? "Normal" : `${rate}×`,
      });

      btn.addEventListener("click", () => {
        video.playbackRate = rate;
        updateSpeedLabel();
        populateSpeedMenu();
        speedMenu.classList.add("hidden");
      });

      fragment.append(btn);
    });

    speedMenu.append(fragment);
  };

  speedButton.addEventListener("click", (e) => {
    e.stopPropagation();

    const isOpen = speedMenu.classList.contains("hidden");

    if (typeof closeAllMenus === "function") {
      closeAllMenus();
    } else {
      [qualityMenu, subtitleMenu, speedMenu].forEach((m) =>
        m?.classList.add("hidden"),
      );
    }

    populateSpeedMenu();

    if (isOpen) {
      speedMenu.classList.remove("hidden");
    }

    if (speedMenu.classList.length === 0) {
      speedMenu.removeAttribute("class");
    }
  });

  playerWrapper.append(resumeToast, bigPlayButton, progressTooltip, controls);

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
      const res = await fetch(probeUrl, {
        cache: "no-store",
        credentials: "omit",
      });
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
    thumbVideo.src = "";
    lastThumbSeekTime = -1;
    setActiveSource(sources[index], savedTime, wasPlaying);
  };

  // Update quality button label
  const updateQualityLabel = () => {
    // Adaptive DASH quality
    if (dashInstance && dashQualityLevels.length) {
      if (dashQualityAuto) {
        try {
          const idx = dashInstance.getQualityFor("video");
          const cur =
            dashQualityLevels.find((l) => l.qualityIndex === idx) ||
            dashQualityLevels[0];
          qualityButton.textContent = cur ? `Auto (${cur.label})` : "Auto";
        } catch {
          qualityButton.textContent = "Auto";
        }
      } else {
        try {
          const idx = dashInstance.getQualityFor("video");
          const cur =
            dashQualityLevels.find((l) => l.qualityIndex === idx) ||
            dashQualityLevels[0];
          qualityButton.textContent = cur ? cur.label : "Quality";
        } catch {
          qualityButton.textContent = "Quality";
        }
      }
      return;
    }
    // Adaptive HLS quality
    if (hlsInstance && hlsQualityLevels.length) {
      if (hlsQualityAuto) {
        const idx = hlsInstance.currentLevel;
        const cur =
          hlsQualityLevels.find((l) => l.qualityIndex === idx) ||
          hlsQualityLevels[0];
        qualityButton.textContent = cur ? `Auto (${cur.label})` : "Auto";
      } else {
        const idx = hlsInstance.currentLevel;
        const cur =
          hlsQualityLevels.find((l) => l.qualityIndex === idx) ||
          hlsQualityLevels[0];
        qualityButton.textContent = cur ? cur.label : "Quality";
      }
      return;
    }
    // Multi-file sources
    qualityButton.textContent = isAutoMode
      ? `Auto (${sources[activeSourceIndex].label})`
      : sources[activeSourceIndex].label;
  };

  // Show/hide & update label on the quality button for adaptive streams
  const updateAdaptiveQualityButton = () => {
    const hasDashQ = dashInstance && dashQualityLevels.length >= 1;
    const hasHlsQ = hlsInstance && hlsQualityLevels.length >= 1;
    if (hasDashQ || hasHlsQ) {
      qualityButton.style.display = "";
    }
    updateQualityLabel();
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

    // ── Adaptive DASH quality ─────────────────────────────────────────────
    if (dashInstance && dashQualityLevels.length >= 1) {
      let currentDashIdx = -1;
      try {
        currentDashIdx = dashInstance.getQualityFor("video");
      } catch {}

      const autoBtn = document.createElement("button");
      autoBtn.classList.add("subtitle-option");
      if (dashQualityAuto) autoBtn.classList.add("active");
      autoBtn.textContent = "Auto";
      if (
        dashQualityAuto &&
        currentDashIdx >= 0 &&
        dashQualityLevels[currentDashIdx]
      ) {
        const badge = document.createElement("span");
        badge.className = "auto-quality-badge";
        badge.textContent = dashQualityLevels[currentDashIdx].label;
        autoBtn.appendChild(badge);
      }
      autoBtn.addEventListener("click", () => {
        dashQualityAuto = true;
        dashInstance.updateSettings({
          streaming: { abr: { autoSwitchBitrate: { video: true } } },
        });
        updateQualityLabel();
        populateQualityMenu();
        qualityMenu.classList.add("hidden");
      });
      qualityMenu.appendChild(autoBtn);

      // Sort highest quality first
      const sorted = [...dashQualityLevels].sort(
        (a, b) => b.bitrate - a.bitrate,
      );
      sorted.forEach((q) => {
        const btn = document.createElement("button");
        btn.classList.add("subtitle-option");
        if (!dashQualityAuto && q.qualityIndex === currentDashIdx)
          btn.classList.add("active");
        btn.textContent = q.label;
        btn.addEventListener("click", () => {
          dashQualityAuto = false;
          dashInstance.updateSettings({
            streaming: { abr: { autoSwitchBitrate: { video: false } } },
          });
          dashInstance.setQualityFor("video", q.qualityIndex, true);
          updateQualityLabel();
          populateQualityMenu();
          qualityMenu.classList.add("hidden");
        });
        qualityMenu.appendChild(btn);
      });
      return;
    }

    // ── Adaptive HLS quality ──────────────────────────────────────────────
    if (hlsInstance && hlsQualityLevels.length >= 1) {
      const currentHlsIdx = hlsInstance.currentLevel;

      const autoBtn = document.createElement("button");
      autoBtn.classList.add("subtitle-option");
      if (hlsQualityAuto) autoBtn.classList.add("active");
      autoBtn.textContent = "Auto";
      if (
        hlsQualityAuto &&
        currentHlsIdx >= 0 &&
        hlsQualityLevels[currentHlsIdx]
      ) {
        const badge = document.createElement("span");
        badge.className = "auto-quality-badge";
        badge.textContent = hlsQualityLevels[currentHlsIdx].label;
        autoBtn.appendChild(badge);
      }
      autoBtn.addEventListener("click", () => {
        hlsQualityAuto = true;
        hlsInstance.currentLevel = -1; // -1 = ABR auto
        updateQualityLabel();
        populateQualityMenu();
        qualityMenu.classList.add("hidden");
      });
      qualityMenu.appendChild(autoBtn);

      const sorted = [...hlsQualityLevels].sort(
        (a, b) => b.bitrate - a.bitrate,
      );
      sorted.forEach((q) => {
        const btn = document.createElement("button");
        btn.classList.add("subtitle-option");
        if (!hlsQualityAuto && q.qualityIndex === currentHlsIdx)
          btn.classList.add("active");
        btn.textContent = q.label;
        btn.addEventListener("click", () => {
          hlsQualityAuto = false;
          hlsInstance.currentLevel = q.qualityIndex;
          updateQualityLabel();
          populateQualityMenu();
          qualityMenu.classList.add("hidden");
        });
        qualityMenu.appendChild(btn);
      });
      return;
    }

    // ── Multi-file source quality ─────────────────────────────────────────
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

    if (!qualityMenu.className) {
      qualityMenu.removeAttribute("class");
    }
    subtitleMenu.classList.add("hidden");
    speedMenu.classList.add("hidden");
    const audioSelectMenu = document.getElementById("audioSelectMenu");
    if (audioSelectMenu) {
      audioSelectMenu.classList.add("hidden");
    }
  });

  // Populate the subtitle menu — handles both VTT (native tracks) and ASS (Octopus)
  const populateSubtitleMenu = () => {
    subtitleMenu.replaceChildren();
    const nativeTracks = video.textTracks;
    const menuEntries = getSubtitleMenuEntries();
    const anyNativeActive = Array.from(nativeTracks).some(
      (t) => t.mode === "showing",
    );
    const anyDashActive = getActiveDashTrackUiIndex() !== -1;
    const anyHlsActive = activeHlsSubtitleIndex !== -1;
    const anyActive =
      anyNativeActive ||
      anyDashActive ||
      anyHlsActive ||
      octopusInstance !== null;

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
    menuEntries.forEach(
      ({
        label,
        src,
        type,
        nativeTrackIndex,
        dashTrackIndex,
        dashApiIndex,
        hlsIndex,
      }) => {
        const isAss = type === "ass";
        // Determine if this entry is currently active
        let isActive = false;
        if (isAss) {
          isActive = activeAssTrackSrc === src;
        } else if (type === "dash") {
          isActive = getActiveDashTrackUiIndex() === dashTrackIndex;
        } else if (type === "hls") {
          isActive = activeHlsSubtitleIndex === hlsIndex;
        } else {
          const nativeIdx =
            nativeTrackIndex ??
            Array.from(nativeTracks).findIndex((t) => t.label === label);
          isActive =
            nativeIdx !== -1 && nativeTracks[nativeIdx].mode === "showing";
        }

        const btn = document.createElement("button");
        btn.classList.add("subtitle-option");
        if (isActive) btn.classList.add("active");
        const badge = document.createElement("span");
        badge.className = "subtitle-type-badge subtitle-type-" + type;
        badge.textContent = (type || "text").toUpperCase();
        btn.appendChild(badge);
        btn.appendChild(document.createTextNode(label));
        btn.addEventListener("click", () => {
          if (isAss) {
            loadAssTrack(src);
          } else if (type === "dash") {
            destroyOctopus();
            activateDashTrackByIndex(dashTrackIndex, dashApiIndex);
            setTimeout(updateCcButtonState, 0);
          } else if (type === "hls") {
            destroyOctopus();
            hlsInstance.subtitleDisplay = true;
            hlsInstance.subtitleTrack = hlsIndex;
          } else {
            // External / non-adaptive VTT — set TextTrack.mode directly
            destroyOctopus();
            for (let i = 0; i < nativeTracks.length; i++) {
              const t = nativeTracks[i];
              t.mode = (
                nativeTrackIndex != null
                  ? i === nativeTrackIndex
                  : t.label === label
              )
                ? "showing"
                : "disabled";
            }
          }
          updateCcButtonState();
          subtitleMenu.classList.add("hidden");
        });
        subtitleMenu.appendChild(btn);
      },
    );
  };

  const getActiveSubtitleEntry = () => {
    const nativeTracks = video.textTracks;
    const activeDashUiIdx = getActiveDashTrackUiIndex();
    if (activeDashUiIdx !== -1) {
      const dt = dashSubtitleTracks[activeDashUiIdx];
      if (dt) return dt;
    }
    if (activeHlsSubtitleIndex !== -1) {
      const ht = hlsSubtitleTracks[activeHlsSubtitleIndex];
      if (ht) return ht;
    }
    for (const track of subtitleTracks) {
      if (track.type === "ass" && activeAssTrackSrc === track.src) return track;
      if (track.type !== "ass") {
        const nt = Array.from(nativeTracks).find(
          (t) => t.label === track.label,
        );
        if (nt && nt.mode === "showing") return track;
      }
    }
    const nativeActive = Array.from(nativeTracks).find(
      (t) => t.mode === "showing",
    );
    if (nativeActive) {
      return {
        label: nativeActive.label || nativeActive.language || "Subtitle",
        type: "native",
      };
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

    if (!subtitleMenu.className) {
      subtitleMenu.removeAttribute("class");
    }
    qualityMenu.classList.add("hidden");
    speedMenu.classList.add("hidden");
    const audioSelectMenu = document.getElementById("audioSelectMenu");
    if (audioSelectMenu) {
      audioSelectMenu.classList.add("hidden");
    }
  });

  // Close all menus when clicking outside
  document.addEventListener("click", () => {
    subtitleMenu.classList.add("hidden");
    qualityMenu.classList.add("hidden");
    speedMenu.classList.add("hidden");
    const audioSelectMenu = document.getElementById("audioSelectMenu");
    if (audioSelectMenu) {
      audioSelectMenu.classList.add("hidden");
    }
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
    ccButton,
    speedButton,
    fullScreenButton,
  );

  // Subtitle, quality, and speed menus are absolutely positioned inside the player wrapper
  playerWrapper.append(subtitleMenu, qualityMenu, speedMenu);
  updateSubtitleAvailability();

  // Custom tooltip
  const playerTooltip = el("div", { id: "playerTooltip" });
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
      btn.addEventListener("mouseleave", () => {
        playerTooltip.classList.remove("visible");
        if (!playerTooltip.className) {
          playerTooltip.removeAttribute("class");
        }
      });
      btn.addEventListener("mousedown", () => {
        playerTooltip.classList.remove("visible");

        if (!playerTooltip.className) {
          playerTooltip.removeAttribute("class");
        }
      });
    });
  } // end TOOLTIPS_ENABLED

  // Format seconds as [h:]mm:ss; pass forceHours=true to always include the hour component
  const formatTime = (seconds, forceHours = false) => {
    const h = Math.floor(seconds / 3600);
    const min = String(Math.floor((seconds % 3600) / 60));
    const sec = String(Math.floor(seconds % 60)).padStart(2, "0");

    if (h > 0 || forceHours) {
      return `${h}:${min.padStart(2, "0")}:${sec}`;
    }
    return `${min}:${sec}`;
  };

  // Sync big button and play button icons based on video state
  const updateUIState = () => {
    const isPaused = video.paused;

    playButton.replaceChildren(getIcon(isPaused ? "play" : "pause"));
    playButton.setAttribute("aria-label", isPaused ? "Play" : "Pause");

    // Quick and clean style update using Object.assign for consistency
    Object.assign(bigPlayButton.style, {
      display: isPaused ? "flex" : "none",
    });
  };

  // Toggle play/pause using clean async/await syntax to handle the video promise
  const playPauseVideo = async () => {
    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
      updateUIState(); // Runs right away on pause, and immediately after play promise resolves
    } catch (err) {
      console.error("Playback failed:", err);
    }
  };

  // Toggle fullscreen mode for the player using modern clean methods
  const toggleFullScreen = () => {
    if (LOGO_ENABLED) repositionLogo();

    if (!document.fullscreenElement) {
      // Modern optional chaining syntax replaces heavy browser prefix blocks (like webkit)
      playerWrapper.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Remove skeleton loader and set initial timer when video metadata is ready
  video.addEventListener("loadedmetadata", () => {
    if (LOGO_ENABLED) repositionLogo(); /// reposition logo place to be on video
    skeleton.style.opacity = "0";
    setTimeout(() => skeleton.remove(), 500);
    timerDisplay.textContent = `0:00 / ${formatTime(video.duration)}`;
    document.title = sources[activeSourceIndex].src
      .split("/")
      .pop()
      .split("?")[0];

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
  // run on resize logo if LOGO is enabled
  if (LOGO_ENABLED)
    window.addEventListener("resize", repositionLogo, { passive: true });

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
      } catch (_) {
        // Privacy safeguard for blocked localstorage contexts
      }
    }
  });

  // Show thumbnail + time tooltip on progress bar hover
  progressBar.addEventListener("mousemove", (e) => {
    if (!video.duration) return;

    // Fetch the currently active media entry object
    const currentEntry = sources[activeSourceIndex];

    // Set thumb video source lazily on first hover actions
    if (!thumbVideo.src && !thumbDashInstance && !thumbHlsInstance) {
      // CASE 1: Check if the source target points to a DASH stream layout (.mpd manifest)
      if (currentEntry.src.includes(".mpd") && window.dashjs) {
        if (thumbDashInstance) thumbDashInstance.destroy();

        thumbDashInstance = window.dashjs.MediaPlayer().create();
        thumbDashInstance.updateSettings({
          streaming: {
            text: { defaultEnabled: false },
            audio: { muted: true },
            buffer: {
              fastSwitchEnabled: true,
              bufferTimeAtTopQuality: 2,
              bufferTimeAtTopQualityLongForm: 2,
            },
          },
        });
        thumbDashInstance.initialize(
          thumbVideo,
          new URL(currentEntry.src, document.baseURI).href,
          false,
        );

        // Critical wake-up buffer trigger for dash.js
        thumbVideo
          .play()
          .then(() => thumbVideo.pause())
          .catch(() => {});

        // CASE 2: Check if the source target points to an HLS stream layout (.m3u8 manifest)
      } else if (
        currentEntry.src.includes(".m3u8") &&
        window.Hls &&
        window.Hls.isSupported()
      ) {
        if (thumbHlsInstance) thumbHlsInstance.destroy();

        // Initialize a miniature auxiliary hls.js player instance specifically for the timeline thumbnails
        thumbHlsInstance = new window.Hls({
          enableWorker: true,
          lowLatencyMode: true,
          autoStartLoad: true,
        });

        // Turn off tracking subtitles/captions on background container layer to optimize bandwidth
        thumbVideo.muted = true;
        thumbHlsInstance.loadSource(
          new URL(currentEntry.src, document.baseURI).href,
        );
        thumbHlsInstance.attachMedia(thumbVideo);

        /**
         * CRITICAL HLS WAKE-UP BUFFER TRIGGER:
         * Force hls.js network controller layer to start buffering immediate frames
         */
        thumbVideo
          .play()
          .then(() => thumbVideo.pause())
          .catch(() => {});
      } else {
        // CASE 3: Fallback bind source directly for vanilla progressive MP4 configurations
        thumbVideo.src = currentEntry.src;
      }
    }

    // Calculate hover ratio and time position over the progress track
    const rect = progressBar.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );
    const hoverTime = ratio * video.duration;

    // Synchronize text label safely
    progressTooltipTime.textContent = formatTime(
      hoverTime,
      video.duration >= 3600,
    );

    // Throttle seeks: only seek if hovered time changed by more than 0.5s to save CPU cycles
    if (Math.abs(hoverTime - lastThumbSeekTime) > 0.5) {
      lastThumbSeekTime = hoverTime;

      /**
       * CRITICAL SEEK CONTROLLER STRATEGY:
       * Choose active engine pipeline binding to enforce background buffer updates
       */
      if (thumbDashInstance) {
        thumbDashInstance.seek(hoverTime); // Direct dash.js controller seek execution
      } else {
        thumbVideo.currentTime = hoverTime; // Native assignment works flawlessly for MP4 and hls.js attachments
      }
    }

    // Position tooltip centred above hover point, clamped inside the player bounds
    const playerRect = playerWrapper.getBoundingClientRect();
    const rawLeft = e.clientX - playerRect.left;
    const half = 80; // Half of tooltip width (160px)
    const clampedLeft = Math.max(
      half,
      Math.min(playerRect.width - half, rawLeft),
    );

    Object.assign(progressTooltip.style, {
      left: `${clampedLeft}px`,
      display: "flex",
    });
  });

  // Collapse tooltip instantly when mouse leaves track bounds
  progressBar.addEventListener("mouseleave", () => {
    Object.assign(progressTooltip.style, { display: "none" });
  });

  // Seek video dynamically when progress bar input range element values change
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

    const { code } = e;

    switch (code) {
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

      case "KeyC": {
        const menuEntries = getSubtitleMenuEntries();
        if (!menuEntries.length) break;

        const nativeTracks = video.textTracks;
        const currentIdx = menuEntries.findIndex(
          ({
            label,
            src,
            type,
            dashTrackIndex,
            hlsIndex,
            nativeTrackIndex,
          }) => {
            if (type === "ass") return activeAssTrackSrc === src;
            if (type === "dash")
              return getActiveDashTrackUiIndex() === dashTrackIndex;
            if (type === "hls") return activeHlsSubtitleIndex === hlsIndex;
            if (nativeTrackIndex != null)
              return nativeTracks[nativeTrackIndex]?.mode === "showing";

            return (
              Array.from(nativeTracks).find((t) => t.label === label)?.mode ===
              "showing"
            );
          },
        );

        const nextIdx = currentIdx + 1;

        if (nextIdx >= menuEntries.length) {
          disableAllNativeTracks();
          destroyOctopus();
          showCcToast("Off");
        } else {
          const next = menuEntries[nextIdx];
          showCcToast(`${next.label} · ${next.type.toUpperCase()}`); // Modern template literal
          destroyOctopus(); // Clean abstract layer canvas clear

          if (next.type === "ass") {
            loadAssTrack(next.src);
          } else if (next.type === "dash") {
            activateDashTrackByIndex(next.dashTrackIndex, next.dashApiIndex);
            setTimeout(updateCcButtonState, 0);
          } else if (next.type === "hls") {
            hlsInstance.subtitleDisplay = true;
            hlsInstance.subtitleTrack = next.hlsIndex;
          } else {
            Array.from(nativeTracks).forEach((t, i) => {
              t.mode = (
                next.nativeTrackIndex != null
                  ? i === next.nativeTrackIndex
                  : t.label === next.label
              )
                ? "showing"
                : "disabled";
            });
          }
        }
        updateCcButtonState();
        break;
      }

      case "KeyQ": {
        if (dashInstance && qualityState.dashLevels.length >= 1) {
          const sorted = [...qualityState.dashLevels].sort(
            (a, b) => b.bitrate - a.bitrate,
          );

          if (qualityState.dashAuto) {
            qualityState.dashAuto = false;
            dashInstance.updateSettings({
              streaming: { abr: { autoSwitchBitrate: { video: false } } },
            });
            dashInstance.setQualityFor("video", sorted[0].qualityIndex, true);
          } else {
            let curIdx = -1;
            try {
              curIdx = dashInstance.getQualityFor("video");
            } catch (_) {}

            const pos = sorted.findIndex((l) => l.qualityIndex === curIdx);
            const next = pos + 1;

            if (next >= sorted.length) {
              qualityState.dashAuto = true;
              dashInstance.updateSettings({
                streaming: { abr: { autoSwitchBitrate: { video: true } } },
              });
            } else {
              dashInstance.setQualityFor(
                "video",
                sorted[next].qualityIndex,
                true,
              );
            }
          }
          updateQualityLabel();
        } else if (hlsInstance && qualityState.hlsLevels.length >= 1) {
          const sorted = [...qualityState.hlsLevels].sort(
            (a, b) => b.bitrate - a.bitrate,
          );

          if (qualityState.hlsAuto) {
            qualityState.hlsAuto = false;
            hlsInstance.currentLevel = sorted[0].qualityIndex;
          } else {
            const pos = sorted.findIndex(
              (l) => l.qualityIndex === hlsInstance.currentLevel,
            );
            const next = pos + 1;

            if (next >= sorted.length) {
              qualityState.hlsAuto = true;
              hlsInstance.currentLevel = -1;
            } else {
              hlsInstance.currentLevel = sorted[next].qualityIndex;
            }
          }
          updateQualityLabel();
        } else if (sources.length > 1) {
          if (isAutoMode) {
            stopAutoMode();
            switchSource(0);
          } else {
            const next = activeSourceIndex + 1;
            next >= sources.length ? startAutoMode() : switchSource(next);
          }
          updateQualityLabel();
        }
        break;
      }

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
        if (video.muted) {
          video.muted = false;
          video.volume = 0.1;
        } else {
          video.volume = Math.min(
            1,
            parseFloat((video.volume + 0.1).toFixed(1)),
          );
        }
        break;

      case "ArrowDown":
        e.preventDefault();
        video.volume = Math.max(0, parseFloat((video.volume - 0.1).toFixed(1)));
        break;

      case "Comma":
      case "Period": {
        e.preventDefault();
        const ci = SPEED_RATES.indexOf(video.playbackRate);
        if (ci === -1) break;

        const nextIdx = code === "Comma" ? ci - 1 : ci + 1;
        if (SPEED_RATES[nextIdx] !== undefined) {
          video.playbackRate = SPEED_RATES[nextIdx];
          showSpeedToast(SPEED_RATES[nextIdx]);
          updateSpeedLabel();
        }
        break;
      }

      default:
        if (code.startsWith("Digit") && video.duration) {
          e.preventDefault();
          const digit = parseInt(code.replace("Digit", ""), 10);
          video.currentTime = (digit / 10) * video.duration;
        }
    }
  });

  // --- Fullscreen controls & cursor auto-hide logic ---

  const shield = el("div", { id: "controls-trigger-shield" });
  playerWrapper.insertBefore(shield, controls);

  let controlsHideTimeout = null;

  function showControls() {
    // Apply multiple interactive styles to controls layout at once cleanly
    Object.assign(controls.style, {
      opacity: 1,
      pointerEvents: "auto",
    });

    playerWrapper.style.cursor = "";
    clearTimeout(controlsHideTimeout);
  }

  function hideControls() {
    if (document.fullscreenElement === playerWrapper && !video.paused) {
      // Apply multiple visual styles to controls layout at once safely
      Object.assign(controls.style, {
        opacity: 0,
        pointerEvents: "none",
      });

      playerWrapper.style.cursor = "none";
    }
  }

  const scheduleControlsHide = () => {
    clearTimeout(controlsHideTimeout);
    controlsHideTimeout = setTimeout(hideControls, 2000);
  };

  // Show controls and restart hide timer on mouse move (fullscreen only)
  // Change playerWrapper to the shield element to fix mouse movements in fullscreen mode
  shield.addEventListener("mousemove", () => {
    // Short-circuit guard: only reveal and schedule hide if the player is currently in fullscreen mode
    if (document.fullscreenElement === playerWrapper) {
      showControls();
      scheduleControlsHide();
    }
  });

  // EXTRA: Prevent controls from disappearing when the user hovers directly
  // over the buttons or the timeline (the controls element itself):
  controls.addEventListener("mousemove", () => {
    if (document.fullscreenElement === playerWrapper) {
      showControls();
      scheduleControlsHide();
    }
  });
  let clickTimeout;

  // Handle click and double click for desktop mouse users
  shield.addEventListener("click", (e) => {
    // Clear any existing timeout to check if it's a double click
    clearTimeout(clickTimeout);

    if (e.detail === 1) {
      // Wait 250ms to ensure it's not a double click
      clickTimeout = setTimeout(() => {
        // Toggle Play/Pause on single click
        playPauseVideo();
      }, 250);
    } else if (e.detail === 2) {
      // Trigger fullscreen immediately on double click
      e.preventDefault();
      toggleFullScreen();
    }
  });
  // Handle touch for mobile and tablet users (Single Tap and Double Tap)
  let lastTap = 0;
  shield.addEventListener("touchend", (e) => {
    const currentTime = Date.now(); // Faster and cleaner alternative to new Date().getTime()
    const tapLength = currentTime - lastTap;

    clearTimeout(clickTimeout);

    if (tapLength < 300 && tapLength > 0) {
      // Trigger fullscreen on double tap
      e.preventDefault();
      toggleFullScreen();
    } else {
      // Wait 250ms to ensure it's a single tap, then toggle Play/Pause
      clickTimeout = setTimeout(() => {
        playPauseVideo();
      }, 250);
    }
    lastTap = currentTime;
  });

  // GET LOGO
  const logoElement = document.getElementById("logo");

  // Schedule hide when video starts playing (fullscreen only) + hide resume toast
  video.addEventListener("play", () => {
    // Smoothly toggle active class based on your configuration variable
    logoElement.classList.toggle("active", LOGO_ENABLED);

    if (document.fullscreenElement === playerWrapper) scheduleControlsHide();

    // Consistent inline style assignment approach
    Object.assign(resumeToast.style, { display: "none" });
  });

  // Always show controls when paused
  video.addEventListener("pause", () => {
    showControls();
    clearTimeout(controlsHideTimeout);
  });

  /// Dash / HLS multi audio code - Call only when multiple tracks exist
  const multiAudio = () => {
    // UI Safeguard: Evict any existing button/menu instances from previous stream loads to avoid duplicates
    document.getElementById("audioSelectButton")?.remove();
    document.getElementById("audioSelectMenu")?.remove();

    // Create the interactive mic trigger element node
    const audioSelect = el("button", {
      id: "audioSelectButton",
      "aria-label": "Audio",
    });
    audioSelect.append(getIcon("mic"));

    // Inject structural node positionally right before the Subtitle (CC) element if active
    if (ccButton && ccButton.parentNode === controls) {
      ccButton.before(audioSelect); // Modern and clean alternative to insertBefore
    } else {
      controls.append(audioSelect);
    }

    // Generate the clean dropdown menu wrapper inside the root player block
    const audioSelectMenu = el("div", {
      id: "audioSelectMenu",
      className: "hidden",
    });
    playerWrapper.append(audioSelectMenu);

    // Toggle dropdown menu expansion on explicit click events
    audioSelect.addEventListener("click", (e) => {
      e.stopPropagation(); // Essential: Stops event from bubbling to video container and pausing playback

      const isOpen = audioSelectMenu.classList.contains("hidden");

      // Safely close all player dropdowns first using the global handler
      if (typeof closeAllMenus === "function") {
        closeAllMenus();
      } else {
        [qualityMenu, subtitleMenu, speedMenu].forEach((m) =>
          m?.classList.add("hidden"),
        );
      }

      // Open only this menu if it was closed before clicking
      if (isOpen) {
        audioSelectMenu.classList.remove("hidden");
      }

      // Clean up empty class attribute safely
      if (audioSelectMenu.classList.length === 0) {
        audioSelectMenu.removeAttribute("class");
      }
    });

    // Global click tracking logic to collapse menu when user clicks outside the UI surface area
    const closeMenuHandler = (e) => {
      if (!audioSelectMenu.contains(e.target) && e.target !== audioSelect) {
        audioSelectMenu.classList.add("hidden");
      }
    };
    document.addEventListener("click", closeMenuHandler);

    // Return live references and event handlers directly back to the active instantiation pipeline
    return { audioSelect, audioSelectMenu, closeMenuHandler };
  };

  // Custom right-click context menu with player info
  const contextMenu = el("div", {
    id: "playerContextMenu",
    className: "hidden",
  });
  playerWrapper.append(contextMenu);

  const hideContextMenu = () => contextMenu.classList.add("hidden");

  playerWrapper.addEventListener("contextmenu", (e) => {
    e.preventDefault();

    // If menu is already visible, hide it and exit
    if (!contextMenu.classList.contains("hidden")) return hideContextMenu();

    const rows = [
      ["wdPlayer", "v1.3"],
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
                const entry = getActiveSubtitleEntry();
                return entry
                  ? `${entry.label} (${entry.type.toUpperCase()})`
                  : "None";
              })(),
            ],
          ]
        : []),
      [
        "Resolution",
        video.videoWidth ? `${video.videoWidth}×${video.videoHeight}` : "—",
      ],
      ["Speed", video.playbackRate === 1 ? "Normal" : `${video.playbackRate}×`],
      [
        "Volume",
        video.muted || video.volume === 0
          ? "Muted"
          : `${Math.round(video.volume * 100)}%`,
      ],
    ];

    // 1. Clear old menu content
    contextMenu.replaceChildren();

    // 2. Build rows in memory using DocumentFragment (Super fast rendering)
    const fragment = document.createDocumentFragment();
    rows.forEach(([key, val]) => {
      const row = el("div", { className: "ctx-row" }, null, [
        el("span", { className: "ctx-key", textContent: key }),
        el("span", { className: "ctx-val", textContent: val }),
      ]);
      fragment.append(row);
    });

    // 3. Inject all generated rows into the DOM at once
    contextMenu.append(fragment);

    // Position inside player bounds
    const pr = playerWrapper.getBoundingClientRect();
    let x = e.clientX - pr.left;
    let y = e.clientY - pr.top;

    // Show menu and safely remove empty class attribute if needed
    contextMenu.classList.remove("hidden");
    if (contextMenu.classList.length === 0) {
      contextMenu.removeAttribute("class");
    }

    // Measure menu dimensions and clamp positions within bounds
    const mw = contextMenu.offsetWidth;
    const mh = contextMenu.offsetHeight;
    if (x + mw > pr.width) x = pr.width - mw - 4;
    if (y + mh > pr.height) y = pr.height - mh - 4;

    // Apply exact positioning values cleanly in one shot
    Object.assign(contextMenu.style, {
      left: `${x}px`,
      top: `${y}px`,
    });
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
