(function () {
  "use strict";

  try {
    initApp();
  } catch (err) {
    showFatalError(err);
  }

  function showFatalError(err) {
    var banner = document.createElement("div");
    banner.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:999;background:#6e2e36;color:#fff;" +
      "font-family:monospace;font-size:13px;padding:14px 18px;line-height:1.5;";
    banner.textContent =
      "Something went wrong loading the app: " + (err && err.message ? err.message : err) +
      ". Try reloading; if it persists, clear this site's storage in your browser settings.";
    document.body.appendChild(banner);
  }

  function initApp() {

  var PLAN = window.SJT_PLAN;
  if (!PLAN) throw new Error("plan.js did not load");
  var API_KEY_STORAGE = "sjt_esv_api_key";
  var TEXT_ENDPOINT = "https://api.esv.org/v3/passage/text/";
  var HTML_ENDPOINT = "https://api.esv.org/v3/passage/html/";

  var PLAN_START = PLAN.MIN_DATE; // first published schedule (Jan 1, 2025); the cycle repeats forever after

  var mainEl = document.getElementById("mainContent");
  var dateHeadingEl = document.getElementById("dateHeading");
  var dateSubEl = document.getElementById("dateSub");
  var datePickerEl = document.getElementById("datePicker");
  var ribbonFillEl = document.getElementById("ribbonFill");
  var ribbonMarkerEl = document.getElementById("ribbonMarker");

  var currentDate = defaultDate();
  var audioObjectUrls = {};

  // ---------- Date helpers ----------
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function toKey(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function fromKey(key) {
    var parts = key.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function clampToPlan(key) {
    if (key < PLAN_START) return PLAN_START;
    return key;
  }

  function defaultDate() {
    var now = new Date();
    var key = toKey(now);
    return clampToPlan(key);
  }

  function dayOfYear(key) {
    var d = fromKey(key);
    var start = new Date(d.getFullYear(), 0, 1);
    return Math.floor((d - start) / 86400000) + 1;
  }

  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // ---------- API key ----------
  function getApiKey() {
    return localStorage.getItem(API_KEY_STORAGE) || "";
  }
  function setApiKey(key) {
    if (key) localStorage.setItem(API_KEY_STORAGE, key);
    else localStorage.removeItem(API_KEY_STORAGE);
  }

  // ---------- Settings modal ----------
  var backdrop = document.getElementById("settingsBackdrop");
  var apiKeyInput = document.getElementById("apiKeyInput");

  function openSettings() {
    apiKeyInput.value = getApiKey();
    backdrop.classList.add("open");
    apiKeyInput.focus();
  }
  function closeSettings() {
    backdrop.classList.remove("open");
  }

  document.getElementById("openSettings").addEventListener("click", openSettings);
  document.getElementById("saveKey").addEventListener("click", function () {
    setApiKey(apiKeyInput.value.trim());
    closeSettings();
    render(); // refresh in case a key was just added
  });
  document.getElementById("clearKey").addEventListener("click", function () {
    apiKeyInput.value = "";
    setApiKey("");
  });
  backdrop.addEventListener("click", function (e) {
    if (e.target === backdrop) closeSettings();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSettings();
  });

  // ---------- Navigation ----------
  document.getElementById("prevDay").addEventListener("click", function () {
    shiftDay(-1);
  });
  document.getElementById("nextDay").addEventListener("click", function () {
    shiftDay(1);
  });
  document.getElementById("todayBtn").addEventListener("click", function () {
    currentDate = defaultDate();
    render();
  });
  datePickerEl.addEventListener("change", function () {
    if (datePickerEl.value) {
      currentDate = clampToPlan(datePickerEl.value);
      render();
    }
  });

  function shiftDay(delta) {
    var d = fromKey(currentDate);
    d.setDate(d.getDate() + delta);
    var key = toKey(d);
    if (key < PLAN_START) return;
    currentDate = key;
    render();
  }

  // ---------- Rendering ----------
  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }

  function restCard(title, text) {
    return (
      '<div class="rest-card">' +
      '<div class="glyph">✦</div>' +
      "<h2>" + title + "</h2>" +
      "<p>" + text + "</p>" +
      "</div>"
    );
  }

  function noteBlock(text) {
    return '<p class="day-note">' + text + "</p>";
  }

  function render() {
    var entry = PLAN.getDay(currentDate);
    var d = fromKey(currentDate);
    var year = d.getFullYear();
    var doy = dayOfYear(currentDate);
    var daysInYear = isLeap(year) ? 366 : 365;

    dateHeadingEl.innerHTML = MONTHS[d.getMonth()] + " " + d.getDate() + ", <em>" + d.getFullYear() + "</em>";
    var sub = WEEKDAYS[d.getDay()] + "  ·  Day " + doy + " of " + daysInYear;
    var tYear = PLAN.templateYearFor(year);
    if (tYear !== year) sub += "  ·  repeats the " + tYear + " plan";
    dateSubEl.textContent = sub;
    datePickerEl.value = currentDate;

    document.getElementById("prevDay").disabled = currentDate <= PLAN_START;

    var pct = (doy / daysInYear) * 100;
    ribbonFillEl.style.height = pct + "%";
    ribbonMarkerEl.style.top = pct + "%";

    if (!entry) {
      mainEl.innerHTML = restCard("Before the schedule begins", "The first published schedule starts on January 1, 2025.");
      return;
    }

    if (entry.kind === "sunday") {
      mainEl.innerHTML = restCard("A day of rest", "No assigned reading today — a pause built into the rhythm of the schedule. Use the time for corporate worship, prayer, or simply reflection.");
      return;
    }
    if (entry.kind === "catchup") {
      mainEl.innerHTML = restCard("A catch-up day", "This year has one more weekday than the reading plan, so there is no new reading today. Use it to catch up on anything you missed, or revisit a passage that stayed with you.");
      return;
    }
    if (entry.kind === "extra-saturday") {
      mainEl.innerHTML = restCard("No psalm today", "This year has one more Saturday than the plan has psalms. Use it to rest, or return to a psalm you have loved this year.");
      return;
    }

    var tracks = [];
    entry.med.forEach(function (ref) { tracks.push({ kind: "med", label: "A Passage for Meditation", cls: "track-med", ref: ref }); });
    entry.nt.forEach(function (ref) { tracks.push({ kind: "nt", label: "New Testament Chapter", cls: "track-nt", ref: ref }); });
    entry.ot.forEach(function (ref) {
      var isPsalm = /^Psalm /.test(ref);
      tracks.push({ kind: "ot", label: isPsalm ? "Psalm" : "Old Testament Chapter", cls: "track-ot", ref: ref });
    });
    tracks.forEach(function (t, i) { t.key = t.kind + i; });

    var html = '<div class="cards">';
    tracks.forEach(function (t) { html += renderCard(t); });
    html += "</div>";

    if (entry.note === "folded") {
      html += noteBlock("Two Old Testament chapters today: this year has one fewer weekday than the reading plan, so the last chapter is folded into the final reading day of the year.");
    }
    if (entry.reconstructed) {
      html += noteBlock("This part of the 2027 plan was reconstructed from the 2024 schedule — it may differ from the official 2027 July–December schedule once it is published.");
    }
    if (entry.kind === "psalm" && entry.med.length === 0) {
      html += noteBlock("No meditation excerpt is published for this psalm, so only the full psalm is shown.");
    }
    mainEl.innerHTML = html;

    tracks.forEach(function (t) { wireCard(t); });
  }

  function cardId(trackKey, suffix) {
    return "card-" + trackKey + "-" + suffix;
  }

  function renderCard(t) {
    return (
      '<article class="card ' + t.cls + '" data-track="' + t.key + '">' +
      '<div class="card-top">' +
      "<div>" +
      '<p class="card-label">' + t.label + "</p>" +
      '<h3 class="card-ref">' + t.ref + "</h3>" +
      "</div>" +
      '<div class="card-actions">' +
      '<button class="action-btn" data-action="read" type="button">Read</button>' +
      '<button class="action-btn" data-action="listen" type="button">Listen</button>' +
      "</div>" +
      "</div>" +
      '<div class="status-line" id="' + cardId(t.key, "status") + '"></div>' +
      '<div class="passage-panel" id="' + cardId(t.key, "text") + '"></div>' +
      '<div class="audio-panel" id="' + cardId(t.key, "audio") + '"></div>' +
      "</article>"
    );
  }

  function wireCard(t) {
    var root = document.querySelector('.card[data-track="' + t.key + '"]');
    if (!root) return;
    var readBtn = root.querySelector('[data-action="read"]');
    var listenBtn = root.querySelector('[data-action="listen"]');
    var statusEl = document.getElementById(cardId(t.key, "status"));
    var textPanel = document.getElementById(cardId(t.key, "text"));
    var audioPanel = document.getElementById(cardId(t.key, "audio"));

    readBtn.addEventListener("click", function () {
      if (textPanel.classList.contains("open")) {
        textPanel.classList.remove("open");
        readBtn.textContent = "Read";
        return;
      }
      if (textPanel.dataset.loaded === "true") {
        textPanel.classList.add("open");
        readBtn.textContent = "Hide";
        return;
      }
      loadText(t.ref, textPanel, statusEl, readBtn);
    });

    listenBtn.addEventListener("click", function () {
      if (audioPanel.classList.contains("open")) {
        audioPanel.classList.remove("open");
        listenBtn.textContent = "Listen";
        var audioTag = audioPanel.querySelector("audio");
        if (audioTag) audioTag.pause();
        return;
      }
      if (audioPanel.dataset.loaded === "true") {
        audioPanel.classList.add("open");
        listenBtn.textContent = "Hide player";
        return;
      }
      loadAudio(t.ref, audioPanel, statusEl, listenBtn);
    });
  }

  function requireKey(statusEl) {
    var key = getApiKey();
    if (!key) {
      statusEl.textContent = "Add your ESV API key (top right) to load this passage.";
      statusEl.classList.add("error");
      openSettings();
      return null;
    }
    statusEl.textContent = "";
    statusEl.classList.remove("error");
    return key;
  }

  function loadText(ref, panel, statusEl, btn) {
    var key = requireKey(statusEl);
    if (!key) return;

    btn.setAttribute("aria-busy", "true");
    statusEl.textContent = "Loading passage…";
    statusEl.classList.remove("error");

    var params = new URLSearchParams({
      q: ref,
      "include-headings": "true",
      "include-footnotes": "false",
      "include-verse-numbers": "true",
      "include-short-copyright": "true",
      "include-passage-references": "false"
    });

    fetch(TEXT_ENDPOINT + "?" + params.toString(), {
      headers: { Authorization: "Token " + key }
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed (" + res.status + ")");
        return res.json();
      })
      .then(function (data) {
        var text = (data.passages && data.passages[0]) || "Passage not found.";
        panel.innerHTML = formatPassage(text);
        panel.dataset.loaded = "true";
        panel.classList.add("open");
        btn.textContent = "Hide";
        statusEl.textContent = "";
      })
      .catch(function (err) {
        statusEl.textContent = "Couldn't load passage: " + err.message;
        statusEl.classList.add("error");
      })
      .finally(function () {
        btn.removeAttribute("aria-busy");
      });
  }

  function formatPassage(raw) {
    // Split off the trailing "(ESV)" short copyright if present
    var copyright = "";
    var text = raw.trim();
    var match = text.match(/\(ESV\)\s*$/);
    if (match) {
      copyright = "ESV";
      text = text.slice(0, match.index).trim();
    }
    var paragraphs = text.split(/\n\s*\n/).filter(Boolean);
    var html = paragraphs
      .map(function (p) {
        var withVerseNums = p.replace(/\[(\d+)\]\s*/g, '<span class="vn">$1</span>');
        return "<p>" + withVerseNums.trim() + "</p>";
      })
      .join("");
    if (copyright) {
      html += '<div class="passage-copyright">' + copyright + " · English Standard Version</div>";
    }
    return html;
  }

  function loadAudio(ref, panel, statusEl, btn) {
    var key = requireKey(statusEl);
    if (!key) return;

    btn.setAttribute("aria-busy", "true");
    statusEl.textContent = "Loading audio…";
    statusEl.classList.remove("error");

    // The /passage/audio/ endpoint 302-redirects to audio.esv.org, and that
    // redirect target doesn't send CORS headers — so a browser-side fetch of
    // it fails with an opaque "Failed to fetch" error. Instead we ask the
    // HTML endpoint for the passage (a normal, CORS-friendly JSON response)
    // and pull the direct mp3 link out of it. <audio src> can load that link
    // directly with no CORS involved, since media elements don't require it.
    var params = new URLSearchParams({
      q: ref,
      "include-audio-link": "true",
      "include-footnotes": "false",
      "include-headings": "false",
      "include-css-link": "false",
      "include-styles": "false"
    });

    fetch(HTML_ENDPOINT + "?" + params.toString(), {
      headers: { Authorization: "Token " + key }
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Request failed (" + res.status + ")");
        return res.json();
      })
      .then(function (data) {
        var html = (data.passages && data.passages[0]) || "";
        var match = html.match(/href="(https:\/\/audio\.esv\.org\/[^"]+\.mp3)"/);
        if (!match) throw new Error("No audio available for this passage");
        var mp3Url = match[1];
        audioObjectUrls[ref] = mp3Url;
        panel.innerHTML = '<audio controls preload="none" src="' + mp3Url + '"></audio>';
        panel.dataset.loaded = "true";
        panel.classList.add("open");
        btn.textContent = "Hide player";
        statusEl.textContent = "";
      })
      .catch(function (err) {
        statusEl.textContent = "Couldn't load audio: " + err.message;
        statusEl.classList.add("error");
      })
      .finally(function () {
        btn.removeAttribute("aria-busy");
      });
  }

  render();

  // Register the service worker (enables installing as an app on Android
  // and lets the shell load offline). Safe no-op in unsupported browsers.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("service-worker.js").catch(function () {
        // Installing without a server (e.g. opened via file://) will fail
        // silently here — that's fine, the app still works normally.
      });
    });
  }

  } // end initApp
})();
