// Get the main player wrapper element
const playerWrapper = document.getElementById("wdPlayer");

// SVG icon definitions for controls
const icons = {
  play: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><polygon points="8,5 19,12 8,19" /></svg>`,
  pause: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>`,
  fullscreen: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7 14H5v5h5v-2H7v-3zm0-4V7h3V5H5v5h2zm10 7h-3v2h5v-5h-2v3zm-3-12v2h3v3h2V5h-5z"/></svg>`,
  exitFullscreen: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`,
};

// Helper to get an SVG icon element by name
const getIcon = (name) => {
  if (!icons.hasOwnProperty(name)) return document.createElement("span");
  const parser = new DOMParser();
  const doc = parser.parseFromString(icons[name], "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return document.createElement("span");
  // Set size and color for the icon
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
video.controls = false;
playerWrapper.appendChild(video);

//  Create the source element
const sourceMp4 = document.createElement("source");
sourceMp4.src = "https://www.w3schools.com/html/mov_bbb.mp4";
sourceMp4.type = "video/mp4";
video.appendChild(sourceMp4);

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

// Add all controls to the controls container
controls.append(
  playButton,
  timerDisplay,
  progressBar,
  volumeSlider,
  fullScreenButton,
);

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
  // Show big button only when paused
  bigPlayButton.style.display = isPaused ? "flex" : "none";
};

// Toggle play/pause and update icon
const playPauseVideo = () => {
  video.paused ? video.play() : video.pause();
  updateUIState();
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
// Big play button listener
bigPlayButton.addEventListener("click", playPauseVideo);
// Allow clicking the video itself to play/pause
video.addEventListener("click", playPauseVideo);

// Update fullscreen icon when fullscreen state changes
document.addEventListener("fullscreenchange", () => {
  fullScreenButton.replaceChildren(
    getIcon(document.fullscreenElement ? "exitFullscreen" : "fullscreen"),
  );
});

// Initial UI and CSS variable setup
updateUIState();
updateRangeValue(progressBar);
updateRangeValue(volumeSlider);

// Keyboard shortcuts for play/pause (Space) and fullscreen (F)
document.addEventListener("keydown", (e) => {
  if (document.activeElement.tagName === "INPUT") return;
  if (e.code === "Space") {
    e.preventDefault();
    playPauseVideo();
  }
  if (e.code === "KeyF") toggleFullScreen();
});
