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

// Video sources — add as many quality options as needed
const sources = [
  {
    label: "1080p",
    src: "https://test-videos.co.uk/vids/jellyfish/mp4/h264/1080/Jellyfish_1080_10s_30MB.mp4",
    type: "video/mp4",
  },
  {
    label: "720p",
    src: "https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_20MB.mp4",
    type: "video/mp4",
  },
  {
    label: "360p",
    src: "https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_10MB.mp4",
    type: "video/mp4",
  },
];
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

// Subtitle tracks — add as many languages as needed (empty array = CC button hidden)
const subtitleTracks = [
  { label: "English", srclang: "en", src: "subtitles/subtitles.en.vtt" },
  { label: "Lietuvių", srclang: "lt", src: "subtitles/subtitles.lt.vtt" },
];

let loadedTrackCount = 0;

subtitleTracks.forEach(({ label, srclang, src }) => {
  const track = document.createElement("track");
  track.kind = "captions";
  track.label = label;
  track.srclang = srclang;
  track.addEventListener("load", () => {
    loadedTrackCount++;
    if (loadedTrackCount > 0) ccButton.style.display = "";
  });
  track.addEventListener("error", () => {
    console.warn("Subtitle track failed to load:", src, "— track disabled.");
  });
  video.appendChild(track);
  track.src = src;
  track.track.mode = "hidden";
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
  autoCheckInterval = setInterval(runAutoCheck, 10_000);
  updateQualityLabel();
};
const stopAutoMode = () => {
  isAutoMode = false;
  clearInterval(autoCheckInterval);
  autoCheckInterval = null;
};

// Start in auto mode immediately
startAutoMode();

// Populate quality menu (Auto + manual options)
const populateQualityMenu = () => {
  qualityMenu.replaceChildren();

  // Auto option
  const autoBtn = document.createElement("button");
  autoBtn.classList.add("subtitle-option");
  const autoCheck = document.createElement("span");
  autoCheck.className = "subtitle-check";
  autoCheck.textContent = isAutoMode ? "✓" : "";
  autoBtn.appendChild(autoCheck);
  autoBtn.appendChild(document.createTextNode(" Auto"));
  autoBtn.addEventListener("click", () => {
    startAutoMode();
    qualityMenu.classList.add("hidden");
  });
  qualityMenu.appendChild(autoBtn);

  // Manual options
  sources.forEach((s, i) => {
    const btn = document.createElement("button");
    btn.classList.add("subtitle-option");
    const check = document.createElement("span");
    check.className = "subtitle-check";
    check.textContent = !isAutoMode && i === activeSourceIndex ? "✓" : "";
    btn.appendChild(check);
    btn.appendChild(document.createTextNode(" " + s.label));
    btn.addEventListener("click", () => {
      stopAutoMode();
      switchSource(i);
      updateQualityLabel();
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

// Create CC Button — hidden by default, shown only if subtitle track loads successfully
const ccButton = document.createElement("button");
ccButton.id = "ccButton";
ccButton.title = "Subtitles";
ccButton.style.display = "none";
ccButton.replaceChildren(getIcon("cc"));

// Create Subtitles Menu Container
const subtitleMenu = document.createElement("div");
subtitleMenu.id = "subtitleMenu";
subtitleMenu.classList.add("hidden");

// Populate the subtitle menu from available tracks, showing a checkmark on the active one
const populateSubtitleMenu = () => {
  subtitleMenu.replaceChildren();
  const tracks = video.textTracks;

  // Check if any track is currently showing
  const anyActive = Array.from(tracks).some((t) => t.mode === "showing");

  const offBtn = document.createElement("button");
  offBtn.classList.add("subtitle-option");
  const offCheck = document.createElement("span");
  offCheck.className = "subtitle-check";
  offCheck.textContent = anyActive ? "" : "✓";
  offBtn.appendChild(offCheck);
  offBtn.appendChild(document.createTextNode(" None"));
  offBtn.addEventListener("click", () => {
    for (let i = 0; i < tracks.length; i++) tracks[i].mode = "disabled";
    subtitleMenu.classList.add("hidden");
  });
  subtitleMenu.appendChild(offBtn);

  for (let i = 0; i < tracks.length; i++) {
    const isActive = tracks[i].mode === "showing";
    const trackBtn = document.createElement("button");
    trackBtn.classList.add("subtitle-option");
    const trackCheck = document.createElement("span");
    trackCheck.className = "subtitle-check";
    trackCheck.textContent = isActive ? "✓" : "";
    trackBtn.appendChild(trackCheck);
    trackBtn.appendChild(
      document.createTextNode(" " + (tracks[i].label || `Track ${i + 1}`)),
    );
    trackBtn.addEventListener("click", () => {
      for (let j = 0; j < tracks.length; j++)
        tracks[j].mode = i === j ? "showing" : "disabled";
      subtitleMenu.classList.add("hidden");
    });
    subtitleMenu.appendChild(trackBtn);
  }
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
  ccButton,
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
video.addEventListener("waiting", () => {
  bufferingSpinner.style.display = "flex";
});
video.addEventListener("playing", () => {
  bufferingSpinner.style.display = "none";
});
video.addEventListener("pause", () => {
  bufferingSpinner.style.display = "none";
});
video.addEventListener("ended", () => {
  bufferingSpinner.style.display = "none";
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
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
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
  video.currentTime = (progressBar.value / 100) * video.duration;
  updateRangeValue(progressBar);
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
video.addEventListener("click", playPauseVideo);

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
