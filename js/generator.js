// ── Encode helpers (mirrors wdPlayer.js) ────────────────────────────────
const _minify = (cfg) => ({
  v: cfg.sources.map(({ label: l, src: s, type: t }) => ({ l, s, t })),
  u: (cfg.subtitles ?? []).map(({ label: l, src: s, type: t, srclang: sl }) =>
    sl ? { l, s, t, sl } : { l, s, t },
  ),
});
const _encode = (cfg) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(_minify(cfg)))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

// ── DOM refs ─────────────────────────────────────────────────────────────
const sourceList = document.getElementById("sourceList");
const subList = document.getElementById("subList");
const generateBtn = document.getElementById("generateBtn");
const errMsg = document.getElementById("errMsg");
const result = document.getElementById("result");
const urlOutput = document.getElementById("urlOutput");
const copyBtn = document.getElementById("copyBtn");
const openBtn = document.getElementById("openBtn");

// ── Source rows ──────────────────────────────────────────────────────────
const addSource = (label = "", src = "", type = "video/mp4") => {
  const entry = document.createElement("div");
  entry.className = "entry source-entry";
  entry.textContent = "";
  // ---  (Label) ---
  const labelField = document.createElement("div");
  labelField.className = "field";

  const labelCol = document.createElement("div");
  labelCol.className = "col-label";
  labelCol.setAttribute("aria-hidden", "true");
  labelCol.textContent = "Label";

  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.placeholder = "1080p";
  labelInput.value = label;
  labelInput.setAttribute("data-key", "label");
  labelInput.setAttribute("aria-label", "Source label");
  labelInput.name = "SourceLabel";
  labelField.append(labelCol, labelInput);

  // --- (URL) ---
  const urlField = document.createElement("div");
  urlField.className = "field";

  const urlCol = document.createElement("div");
  urlCol.className = "col-label";
  urlCol.setAttribute("aria-hidden", "true");
  urlCol.textContent = "URL";

  const urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.placeholder = "https://…/video.mp4";
  urlInput.value = src;
  urlInput.setAttribute("data-key", "src");
  urlInput.setAttribute("aria-label", "Source URL");
  urlInput.name = "url";
  urlField.append(urlCol, urlInput);

  // --- (Type Select) ---
  const typeField = document.createElement("div");
  typeField.className = "field";

  const typeCol = document.createElement("div");
  typeCol.className = "col-label";
  typeCol.setAttribute("aria-hidden", "true");
  typeCol.textContent = "Type";

  const typeSelect = document.createElement("select");
  typeSelect.setAttribute("data-key", "type");
  typeSelect.setAttribute("aria-label", "Source type");
  typeSelect.name = "type";
  const optionsData = [
    { value: "video/mp4", text: "video/mp4" },
    { value: "video/webm", text: "video/webm" },
    { value: "video/ogg", text: "video/ogg" },
    { value: "application/x-mpegURL", text: "HLS (.m3u8)" },
    { value: "application/dash+xml", text: "DASH (.mpd)" },
  ];

  optionsData.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.text;
    if (type === opt.value) {
      option.selected = true;
    }
    typeSelect.append(option);
  });

  typeField.append(typeCol, typeSelect);

  // --- Remove Button ---
  const removeButton = document.createElement("button");
  removeButton.className = "btn-remove";
  removeButton.setAttribute("aria-label", "Remove source");
  removeButton.textContent = "✕";
  removeButton.id = "removeSource";

  entry.append(labelField, urlField, typeField, removeButton);

  entry
    .querySelector(".btn-remove")
    .addEventListener("click", () => entry.remove());
  sourceList.appendChild(entry);
};

// ── Subtitle rows ────────────────────────────────────────────────────────
const addSub = (label = "", src = "", type = "vtt", srclang = "") => {
  const entry = document.createElement("div");
  entry.className = "entry sub-entry";
  entry.textContent = "";

  // ---  (Label) ---
  const labelField = document.createElement("div");
  labelField.className = "field";

  const labelCol = document.createElement("div");
  labelCol.className = "col-label";
  labelCol.setAttribute("aria-hidden", "true");
  labelCol.textContent = "Label";

  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.placeholder = "English";
  labelInput.value = label;
  labelInput.setAttribute("data-key", "label");
  labelInput.setAttribute("aria-label", "Subtitle label");
  labelInput.name = "SubtitleLabel";
  labelField.append(labelCol, labelInput);

  // --- (URL) ---
  const urlField = document.createElement("div");
  urlField.className = "field";

  const urlCol = document.createElement("div");
  urlCol.className = "col-label";
  urlCol.setAttribute("aria-hidden", "true");
  urlCol.textContent = "URL";

  const urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.placeholder = "subtitles/en.vtt";
  urlInput.value = src;
  urlInput.setAttribute("data-key", "src");
  urlInput.setAttribute("aria-label", "Subtitle URL");
  urlInput.name = "SubtilteUrl";
  urlField.append(urlCol, urlInput);

  // --- (Type Select) ---
  const typeField = document.createElement("div");
  typeField.className = "field";

  const typeCol = document.createElement("div");
  typeCol.className = "col-label";
  typeCol.setAttribute("aria-hidden", "true");
  typeCol.textContent = "Type";

  const typeSelect = document.createElement("select");
  typeSelect.setAttribute("data-key", "type");
  typeSelect.setAttribute("aria-label", "Subtitle type");
  typeSelect.name = "SubtitleType";
  const optionsData = [
    { value: "vtt", text: "VTT" },
    { value: "ass", text: "ASS" },
  ];

  optionsData.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.text;
    if (type === opt.value) {
      option.selected = true;
    }
    typeSelect.append(option);
  });

  typeField.append(typeCol, typeSelect);

  // --- (Lang) ---
  const langField = document.createElement("div");
  langField.className = "field";

  const langCol = document.createElement("div");
  langCol.className = "col-label";
  langCol.setAttribute("aria-hidden", "true");
  langCol.textContent = "Lang";

  const langInput = document.createElement("input");
  langInput.type = "text";
  langInput.placeholder = "en";
  langInput.value = srclang;
  langInput.setAttribute("data-key", "srclang");
  langInput.maxLength = 10;
  langInput.setAttribute("aria-label", "Subtitle language code");
  langInput.name = "SubtitlesLang";
  langField.append(langCol, langInput);

  // --- Remove Button ---
  const removeButton = document.createElement("button");
  removeButton.className = "btn-remove";
  removeButton.setAttribute("aria-label", "Remove subtitle");
  removeButton.textContent = "✕";

  entry.append(labelField, urlField, typeField, langField, removeButton);
  entry
    .querySelector(".btn-remove")
    .addEventListener("click", () => entry.remove());
  subList.appendChild(entry);
};

const esc = (s) => s.replace(/"/g, "&quot;");

document
  .getElementById("addSource")
  .addEventListener("click", () => addSource());
document.getElementById("addSub").addEventListener("click", () => addSub());

// Add one blank source row by default
addSource();
// ── Refresh Info ─────────────────────────────────────────────────────────
const videoTypeSelect = document.querySelector('select[data-key="type"]');
const labelInput = document.querySelector('input[data-key="label"]');
const dataSrc = document.querySelector('input[data-key="src"]');
const addSourceBtn = document.getElementById("addSource");
const removeSourceBtn = document.getElementById("removeSource");

videoTypeSelect.addEventListener("change", (event) => {
  const mimeType = event.target.value;

  const labels = {
    "application/dash+xml": "DASH",
    "application/x-mpegURL": "HLS",
  };

  const isStream = mimeType in labels;

  // 1. element status (disabled)
  labelInput.disabled = isStream;
  addSourceBtn.disabled = isStream;
  removeSourceBtn.disabled = isStream;
  removeSourceBtn.style.visibility = isStream ? "hidden" : "visible";
  dataSrc.placeholder = isStream
    ? mimeType === "application/dash+xml"
      ? "https://.../video.mpd"
      : "https://.../video.m3u8"
    : "https://.../video.mp4"; /// https://…/video.mp4

  addSourceBtn.textContent = isStream ? "Disabled For This" : "+ Add source";
  labelInput.value = isStream ? labels[mimeType] : "";
});
// ── Read rows ────────────────────────────────────────────────────────────
const readEntries = (container) =>
  [...container.querySelectorAll(".entry")].map((entry) => {
    const obj = {};
    entry.querySelectorAll("[data-key]").forEach((el) => {
      const v = el.value.trim();
      if (v) obj[el.dataset.key] = v;
    });
    return obj;
  });

// ── Tabs ─────────────────────────────────────────────────────────────────
let currentTab = "encoded";
let lastCfg = null;

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    currentTab = btn.dataset.tab;
    if (lastCfg) renderUrl(lastCfg);
  });
});

const renderUrl = (cfg) => {
  const base =
    location.origin + location.pathname.replace("generator.html", "embed.html");
  let url;
  if (currentTab === "encoded") {
    url = base + "?v=" + _encode(cfg);
  } else if (currentTab === "iframe") {
    const src = base + "?v=" + _encode(cfg);
    url = `<iframe src="${src}" width="560" height="315" allowfullscreen style="border:none;"></iframe>`;
  } else {
    url =
      base +
      "?sources=" +
      encodeURIComponent(JSON.stringify(cfg.sources)) +
      (cfg.subtitles.length
        ? "&subtitles=" + encodeURIComponent(JSON.stringify(cfg.subtitles))
        : "");
  }
  urlOutput.textContent = url;
  openBtn.href = currentTab !== "iframe" ? url : "#";
  openBtn.style.display = currentTab === "iframe" ? "none" : "";
  copyBtn.classList.remove("copied");
  copyBtn.textContent = "Copy";
};

// ── Generate ─────────────────────────────────────────────────────────────
generateBtn.addEventListener("click", () => {
  const sources = readEntries(sourceList).filter((s) => s.src);
  const subtitles = readEntries(subList).filter((s) => s.src);

  if (!sources.length) {
    errMsg.style.display = "block";
    return;
  }
  errMsg.style.display = "none";

  lastCfg = { sources, subtitles };
  renderUrl(lastCfg);
  result.style.display = "flex";
  result.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

// ── Copy ─────────────────────────────────────────────────────────────────
copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(urlOutput.textContent).then(() => {
    copyBtn.textContent = "Copied!";
    copyBtn.classList.add("copied");
    setTimeout(() => {
      copyBtn.textContent = "Copy";
      copyBtn.classList.remove("copied");
    }, 2000);
  });
});
