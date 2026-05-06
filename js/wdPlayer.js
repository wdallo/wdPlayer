// Get the main player wrapper element
const playerWrapper = document.getElementById("wdPlayer");

// Create skeleton loader
const skeleton = document.createElement("div");
skeleton.id = "skeletonLoader";
const shimmer = document.createElement("div");
shimmer.className = "shimmer";
skeleton.appendChild(shimmer);
playerWrapper.appendChild(skeleton);

// SVG icon definitions for controls
const icons = {
  play: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polygon points="8,5 19,12 8,19" /></svg>`,
  pause: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>`,
  fullscreen: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7 14H5v5h5v-2H7v-3zm0-4V7h3V5H5v5h2zm10 7h-3v2h5v-5h-2v3zm-3-12v2h3v3h2V5h-5z"/></svg>`,
  exitFullscreen: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`,
  cc: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 4H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm-8 7H9.5V10.5h-2v3h2V13H11v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-4a1 1 0 011-1h3a1 1 0 011 1v1zm7 0h-1.5V10.5h-2v3h2V13H18v1a1 1 0 01-1 1h-3a1 1 0 01-1-1v-4a1 1 0 011-1h3a1 1 0 011 1v1z"/></svg>`,
};

// Helper to get an SVG icon element by name
const getIcon = (name) => {
  if (!icons.hasOwnProperty(name)) return document.createElement("span");
  const parser = new DOMParser();
  const doc = parser.parseFromString(icons[name], "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return document.createElement("span");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.style.fill = "currentColor";
  svg.style.display = "block";
  return svg;
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
video.controls = false;
playerWrapper.appendChild(video);

// Create the source element
const sourceMp4 = document.createElement("source");
sourceMp4.src = "https://www.w3schools.com/html/mov_bbb.mp4";
sourceMp4.type = "video/mp4";
video.appendChild(sourceMp4);

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

// Define the local VTT subtitle file path (must be served via a local server, not file://)
const vttPath = "subtitles/subtitles.en.vtt";

// Only add subtitles track if a path is provided
if (vttPath && vttPath.trim() !== "") {
  const subtitles = document.createElement("track");
  subtitles.kind = "captions";
  subtitles.label = "English";
  subtitles.srclang = "en";
  subtitles.addEventListener("load", () => {
    // Track loaded successfully — show the CC button
    ccButton.style.display = "";
  });
  subtitles.addEventListener("error", () => {
    console.warn(
      "Subtitle track failed to load:",
      vttPath,
      "— subtitles disabled.",
    );
    // Hide CC button since there's no usable track
    ccButton.style.display = "none";
  });
  // Append first, then set src — ensures the track is in the DOM before loading starts
  video.appendChild(subtitles);
  subtitles.src = vttPath;
  // Mode must be "hidden" (not "disabled") to trigger the browser to actually fetch the VTT file
  // "disabled" = browser skips fetching entirely; "hidden" = loaded but not shown
  subtitles.track.mode = "hidden";
}

// Helper to toggle subtitles via keyboard (C key)
// Only toggles if a valid, loaded track exists
const toggleSubtitles = () => {
  const track = video.textTracks[0];
  if (track && track.readyState === 2) {
    track.mode = track.mode === "showing" ? "hidden" : "showing";
  }
};

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

const volumeSlider = document.createElement("input");
volumeSlider.id = "volumeSlider";
volumeSlider.type = "range";
volumeSlider.min = 0;
volumeSlider.max = 1;
volumeSlider.step = 0.01;
volumeSlider.value = 1;

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
});

// Close subtitle menu when clicking outside
document.addEventListener("click", () => subtitleMenu.classList.add("hidden"));

// Add all controls to the controls container
controls.append(
  playButton,
  timerDisplay,
  progressBar,
  volumeSlider,
  ccButton,
  fullScreenButton,
);

// Subtitle menu is absolutely positioned inside the player wrapper
playerWrapper.appendChild(subtitleMenu);

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

// Update progress bar and timer as video plays
video.addEventListener("timeupdate", () => {
  if (!isNaN(video.duration)) {
    progressBar.value = (video.currentTime / video.duration) * 100;
    updateRangeValue(progressBar);
  }
  timerDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
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
// Space = play/pause, F = fullscreen, C = toggle captions
// ArrowRight/Left = seek �5s, ArrowUp/Down = volume �10%
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
    case "KeyC":
      toggleSubtitles();
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
