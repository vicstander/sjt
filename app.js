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
  var MED_STORAGE = "sjt_show_meditation";
  var TEXT_ENDPOINT = "https://api.esv.org/v3/passage/text/";
  var HTML_ENDPOINT = "https://api.esv.org/v3/passage/html/";
  var COPYRIGHT_HTML = '<div class="passage-copyright">ESV · English Standard Version</div>';

  var PLAN_START = PLAN.MIN_DATE; // first published schedule (Jan 1, 2025); the cycle repeats forever after

  var mainEl = document.getElementById("mainContent");
  var dateHeadingEl = document.getElementById("dateHeading");
  var dateSubEl = document.getElementById("dateSub");
  var datePickerEl = document.getElementById("datePicker");
  var ribbonFillEl = document.getElementById("ribbonFill");
  var ribbonMarkerEl = document.getElementById("ribbonMarker");

  var currentDate = defaultDate();

  // ---------- Storage (falls back to memory if the browser blocks localStorage) ----------
  var memStore = {};
  function storeGet(k) {
    try {
      var v = window.localStorage.getItem(k);
      if (v !== null) return v;
    } catch (e) { /* storage unavailable */ }
    return Object.prototype.hasOwnProperty.call(memStore, k) ? memStore[k] : null;
  }
  function storeSet(k, v) {
    if (v === null || v === "") delete memStore[k]; else memStore[k] = v;
    try {
      if (v === null || v === "") window.localStorage.removeItem(k);
      else window.localStorage.setItem(k, v);
    } catch (e) { /* storage unavailable */ }
  }

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
    return clampToPlan(toKey(new Date()));
  }

  function dayOfYear(key) {
    var d = fromKey(key);
    var start = new Date(d.getFullYear(), 0, 1);
    return Math.floor((d - start) / 86400000) + 1;
  }

  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }

  function fmtTime(s) {
    s = Math.max(0, Math.floor(s || 0));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return h ? h + ":" + pad(m) + ":" + pad(r) : m + ":" + pad(r);
  }

  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // ---------- Settings ----------
  var backdrop = document.getElementById("settingsBackdrop");
  var apiKeyInput = document.getElementById("apiKeyInput");
  var medToggle = document.getElementById("medToggle");
  var showMeditation = storeGet(MED_STORAGE) !== "off";

  function getApiKey() { return storeGet(API_KEY_STORAGE) || ""; }
  function setApiKey(key) { storeSet(API_KEY_STORAGE, key); }

  function applyMeditationSetting() {
    mainEl.classList.toggle("hide-med", !showMeditation);
    medToggle.checked = showMeditation;
  }

  function openSettings(focusKey) {
    apiKeyInput.value = getApiKey();
    medToggle.checked = showMeditation;
    backdrop.classList.add("open");
    // Only focus the key field when a key is actually needed, so the keyboard
    // doesn't pop up when you just want to flip the meditation switch.
    var howto = document.getElementById("howto");
    if (howto) howto.open = !getApiKey();
    (focusKey === true ? howto.querySelector("summary") : medToggle).focus();
  }
  function closeSettings() {
    backdrop.classList.remove("open");
  }

  document.getElementById("openSettings").addEventListener("click", function () { openSettings(false); });
  document.getElementById("saveKey").addEventListener("click", function () {
    setApiKey(apiKeyInput.value.trim());
    closeSettings();
  });
  document.getElementById("clearKey").addEventListener("click", function () {
    apiKeyInput.value = "";
    setApiKey("");
  });
  medToggle.addEventListener("change", function () {
    showMeditation = medToggle.checked;
    storeSet(MED_STORAGE, showMeditation ? "on" : "off");
    applyMeditationSetting();
    if (!showMeditation) {
      // Don't keep playing something that is no longer on screen.
      players.slice().forEach(function (p) { if (p.kind === "med") p.pause(); });
    }
  });
  backdrop.addEventListener("click", function (e) {
    if (e.target === backdrop) closeSettings();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSettings();
  });

  // ---------- Navigation ----------
  document.getElementById("prevDay").addEventListener("click", function () { shiftDay(-1); });
  document.getElementById("nextDay").addEventListener("click", function () { shiftDay(1); });
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

  // ---------- ESV API ----------
  function makeCache(limit) {
    var map = {}, order = [];
    return {
      get: function (k) { return map[k]; },
      set: function (k, v) {
        if (!(k in map)) order.push(k);
        map[k] = v;
        while (order.length > limit) delete map[order.shift()];
      },
      del: function (k) {
        delete map[k];
        var i = order.indexOf(k);
        if (i >= 0) order.splice(i, 1);
      }
    };
  }
  // Small, in-memory only (ESV terms limit how much text may be stored).
  var textCache = makeCache(8);
  var audioCache = makeCache(16);

  function apiGet(url, params) {
    var key = getApiKey();
    if (!key) {
      var e = new Error("Add your ESV API key in Settings to load passages.");
      e.noKey = true;
      return Promise.reject(e);
    }
    return fetch(url + "?" + new URLSearchParams(params).toString(), {
      headers: { Authorization: "Token " + key }
    }).then(function (res) {
      if (!res.ok) {
        throw new Error(res.status === 401 || res.status === 403
          ? "ESV rejected the API key (" + res.status + "). Check it in Settings."
          : "Request failed (" + res.status + ")");
      }
      return res.json();
    });
  }

  function formatPassage(raw) {
    var text = raw.trim().replace(/\(ESV\)\s*$/, "").trim();
    return text
      .split(/\n\s*\n/)
      .filter(Boolean)
      .map(function (p) {
        return "<p>" + p.replace(/\[(\d+)\]\s*/g, '<span class="vn">$1</span>').trim() + "</p>";
      })
      .join("");
  }

  function fetchText(ref) {
    var hit = textCache.get(ref);
    if (hit) return hit;
    var p = apiGet(TEXT_ENDPOINT, {
      q: ref,
      "include-headings": "true",
      "include-footnotes": "false",
      "include-verse-numbers": "true",
      "include-short-copyright": "true",
      "include-passage-references": "false"
    }).then(function (data) {
      var raw = (data.passages && data.passages[0]) || "";
      if (!raw.trim()) throw new Error("Passage not found");
      return formatPassage(raw);
    });
    textCache.set(ref, p);
    p.catch(function () { textCache.del(ref); });
    return p;
  }

  // The /passage/audio/ endpoint 302-redirects to audio.esv.org, which sends no
  // CORS headers, so the bytes can't be fetched from a browser. The HTML endpoint
  // is CORS-friendly and includes the direct mp3 link; <audio src> may load that
  // link without CORS.
  function fetchAudioUrl(ref) {
    var hit = audioCache.get(ref);
    if (hit) return hit;
    var p = apiGet(HTML_ENDPOINT, {
      q: ref,
      "include-audio-link": "true",
      "include-footnotes": "false",
      "include-headings": "false",
      "include-css-link": "false",
      "inline-styles": "false"
    }).then(function (data) {
      var html = (data.passages && data.passages[0]) || "";
      var m = html.match(/href="(https:\/\/audio\.esv\.org\/[^"]+\.mp3)"/);
      if (!m) throw new Error("No audio available for " + ref);
      return m[1];
    });
    audioCache.set(ref, p);
    p.catch(function () { audioCache.del(ref); });
    return p;
  }

  // ---------- Audio player ----------
  // One player plays 1..n passages back to back as a single continuous listen:
  // one play/pause button, one seek bar and one running time across all passages.
  // (The ESV audio host doesn't allow joining the files in the browser, so the
  // passages are queued on a single audio element and advance automatically.)
  var players = [];
  var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';

  function createPlayer(root, refs, kind, label, say) {
    var n = refs.length;
    var audio = new Audio();
    audio.preload = "auto";
    var urls = null, loading = null, destroyed = false;
    var durs = [], cum = [0];
    var idx = 0, dragging = false, finished = false;

    root.innerHTML =
      '<button class="pl-btn" type="button" aria-label="Play"></button>' +
      '<div class="pl-main">' +
      '<input class="pl-seek" type="range" min="0" max="0" step="1" value="0" disabled aria-label="Seek">' +
      '<div class="pl-meta"><span class="pl-now"></span><span class="pl-time">0:00</span></div>' +
      "</div>";
    var btn = root.querySelector(".pl-btn");
    var seek = root.querySelector(".pl-seek");
    var nowEl = root.querySelector(".pl-now");
    var timeEl = root.querySelector(".pl-time");
    btn.innerHTML = ICON_PLAY;

    function validDur(x) { return x > 0 && isFinite(x); }
    function totalKnown() {
      for (var i = 0; i < n; i++) if (!validDur(durs[i])) return false;
      return true;
    }
    function recompute() {
      cum = [0];
      for (var i = 0; i < n; i++) cum[i + 1] = cum[i] + (validDur(durs[i]) ? durs[i] : 0);
    }
    function globalPos() { return cum[idx] + (audio.currentTime || 0); }
    function setIcon(playing) {
      btn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
      btn.setAttribute("aria-label", playing ? "Pause" : "Play");
    }

    function refresh() {
      var cur = audio.currentTime || 0;
      nowEl.textContent = n > 1 ? (idx + 1) + "/" + n + " · " + refs[idx] : "";
      if (totalKnown()) {
        var tot = cum[n], pos = Math.min(tot, cum[idx] + cur);
        seek.disabled = false;
        seek.max = String(Math.floor(tot));
        if (!dragging) seek.value = String(Math.floor(pos));
        timeEl.textContent = fmtTime(dragging ? Number(seek.value) : pos) + " / " + fmtTime(tot);
      } else {
        seek.disabled = true;
        timeEl.textContent = fmtTime(cur);
      }
    }

    // Read each file's length up front so the seek bar can span all passages.
    function probe() {
      urls.forEach(function (u, i) {
        var a = new Audio();
        a.preload = "metadata";
        a.addEventListener("loadedmetadata", function () {
          if (validDur(a.duration)) { durs[i] = a.duration; recompute(); refresh(); }
          a.removeAttribute("src");
          try { a.load(); } catch (e) { /* ignore */ }
        }, { once: true });
        a.src = u;
      });
    }

    function ready() {
      if (urls) return Promise.resolve();
      if (loading) return loading;
      loading = Promise.all(refs.map(fetchAudioUrl)).then(function (u) {
        if (destroyed) return;
        urls = u;
        audio.src = urls[0];
        probe();
        refresh();
      });
      loading.catch(function () { loading = null; });
      return loading;
    }

    function playNow() {
      var p = audio.play();
      if (p && p.catch) {
        p.catch(function (err) {
          if (!err || err.name === "AbortError") return;
          if (err.name === "NotAllowedError") say("Tap play to start.", false);
          else say("Couldn't play audio.", true);
        });
      }
    }

    function pauseOthers() {
      players.forEach(function (p) { if (p !== api) p.pause(); });
    }

    function loadTrack(i, startAt, autoplay) {
      idx = i;
      finished = false;
      audio.src = urls[i];
      if (startAt > 0) {
        audio.addEventListener("loadedmetadata", function h() {
          audio.removeEventListener("loadedmetadata", h);
          try { audio.currentTime = startAt; } catch (e) { /* ignore */ }
        });
      }
      if (autoplay) playNow();
      refresh();
      updateMediaSession();
    }

    function seekTo(t) {
      if (!urls) return;
      var i = 0;
      while (i < n - 1 && t >= cum[i + 1]) i++;
      var off = Math.max(0, t - cum[i]);
      var wasPlaying = !audio.paused;
      finished = false;
      if (i === idx) {
        try { audio.currentTime = off; } catch (e) { /* ignore */ }
      } else {
        loadTrack(i, off, wasPlaying);
      }
      refresh();
    }

    function skip(delta) {
      if (totalKnown()) seekTo(Math.max(0, globalPos() + delta));
      else audio.currentTime = Math.max(0, (audio.currentTime || 0) + delta);
    }

    function play() {
      if (destroyed || !urls) return;
      pauseOthers();
      if (finished) { loadTrack(0, 0, true); return; }
      playNow();
    }

    function updateMediaSession() {
      if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
      try {
        var ms = navigator.mediaSession;
        ms.metadata = new MediaMetadata({ title: refs[idx], artist: "ESV · " + label, album: "Seeing Jesus Together" });
        ms.setActionHandler("play", play);
        ms.setActionHandler("pause", function () { audio.pause(); });
        ms.setActionHandler("seekbackward", function () { skip(-15); });
        ms.setActionHandler("seekforward", function () { skip(15); });
        ms.setActionHandler("previoustrack", n > 1 ? function () {
          if (idx === 0 || audio.currentTime > 3) audio.currentTime = 0;
          else loadTrack(idx - 1, 0, !audio.paused);
        } : null);
        ms.setActionHandler("nexttrack", n > 1 ? function () {
          if (idx < n - 1) loadTrack(idx + 1, 0, !audio.paused);
        } : null);
      } catch (e) { /* not supported */ }
    }

    audio.addEventListener("play", function () { setIcon(true); pauseOthers(); updateMediaSession(); });
    audio.addEventListener("pause", function () { if (!audio.ended) setIcon(false); });
    audio.addEventListener("timeupdate", refresh);
    audio.addEventListener("loadedmetadata", function () {
      if (validDur(audio.duration)) { durs[idx] = audio.duration; recompute(); }
      refresh();
    });
    audio.addEventListener("ended", function () {
      if (idx < n - 1) {
        loadTrack(idx + 1, 0, true);   // roll straight into the next passage
      } else {
        finished = true;
        setIcon(false);
        refresh();
      }
    });
    audio.addEventListener("error", function () {
      if (!audio.getAttribute("src")) return;
      setIcon(false);
      say("Couldn't play this audio. Check your connection and try again.", true);
    });

    btn.addEventListener("click", function () {
      if (audio.paused || audio.ended) play(); else audio.pause();
    });
    seek.addEventListener("input", function () { dragging = true; refresh(); });
    seek.addEventListener("change", function () { dragging = false; seekTo(Number(seek.value)); });
    seek.addEventListener("blur", function () { dragging = false; });

    var api = {
      kind: kind,
      ready: ready,
      play: play,
      pause: function () { audio.pause(); },
      destroy: function () {
        destroyed = true;
        audio.pause();
        audio.removeAttribute("src");
        try { audio.load(); } catch (e) { /* ignore */ }
        var i = players.indexOf(api);
        if (i >= 0) players.splice(i, 1);
      }
    };
    players.push(api);
    return api;
  }

  // ---------- Rendering ----------
  function restCard(title, text) {
    return (
      '<div class="rest-card">' +
      '<div class="glyph">✦</div>' +
      "<h2>" + title + "</h2>" +
      "<p>" + text + "</p>" +
      "</div>"
    );
  }

  function noteBlock(text, extraClass) {
    return '<p class="day-note' + (extraClass ? " " + extraClass : "") + '">' + text + "</p>";
  }

  function render() {
    players.slice().forEach(function (p) { p.destroy(); });

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

    // Order on screen: Old Testament, New Testament, Combined, Meditation.
    var cards = [];
    entry.ot.forEach(function (ref) {
      var isPsalm = /^Psalm /.test(ref);
      cards.push({
        kind: "ot", cls: "track-ot", label: isPsalm ? "Psalm" : "Old Testament",
        ref: ref, items: [{ ref: ref }], titled: false
      });
    });
    entry.nt.forEach(function (ref) {
      cards.push({ kind: "nt", cls: "track-nt", label: "New Testament", ref: ref, items: [{ ref: ref }], titled: false });
    });
    if (entry.ot.length + entry.nt.length >= 2) {
      var items = [];
      entry.ot.forEach(function (ref) { items.push({ ref: ref, title: "Old Testament · " + ref }); });
      entry.nt.forEach(function (ref) { items.push({ ref: ref, title: "New Testament · " + ref }); });
      cards.push({
        kind: "combo", cls: "track-combo", label: "Combined passages",
        ref: items.map(function (i) { return i.ref; }).join(" + "), items: items, titled: true
      });
    }
    entry.med.forEach(function (ref) {
      cards.push({ kind: "med", cls: "track-med", label: "A Passage for Meditation", ref: ref, items: [{ ref: ref }], titled: false });
    });
    cards.forEach(function (c, i) { c.key = c.kind + i; });

    var html = '<div class="cards">';
    cards.forEach(function (c) { html += renderCard(c); });
    html += "</div>";

    if (entry.note === "folded") {
      html += noteBlock("Two Old Testament chapters today: this year has one fewer weekday than the reading plan, so the last chapter is folded into the final reading day of the year.");
    }
    if (entry.reconstructed) {
      html += noteBlock("This part of the 2027 plan was reconstructed from the 2024 schedule — it may differ from the official 2027 July–December schedule once it is published.");
    }
    if (entry.kind === "psalm" && entry.med.length === 0) {
      html += noteBlock("No meditation excerpt is published for this psalm, so only the full psalm is shown.", "med-card");
    }
    mainEl.innerHTML = html;

    cards.forEach(function (c) {
      wireCard(c, mainEl.querySelector('.card[data-key="' + c.key + '"]'));
    });
  }

  function renderCard(c) {
    return (
      '<article class="card ' + c.cls + (c.kind === "med" ? " med-card" : "") + '" data-key="' + c.key + '">' +
      '<div class="card-top">' +
      '<div class="card-text">' +
      '<p class="card-label">' + c.label + "</p>" +
      '<h3 class="card-ref">' + c.ref + "</h3>" +
      "</div>" +
      '<div class="card-actions">' +
      '<button class="action-btn" data-action="read" type="button">Read</button>' +
      '<button class="action-btn" data-action="listen" type="button">Listen</button>' +
      "</div>" +
      "</div>" +
      '<div class="status-line" role="status"></div>' +
      '<div class="passage-panel"></div>' +
      '<div class="player"></div>' +
      "</article>"
    );
  }

  function wireCard(c, root) {
    if (!root) return;
    var readBtn = root.querySelector('[data-action="read"]');
    var listenBtn = root.querySelector('[data-action="listen"]');
    var statusEl = root.querySelector(".status-line");
    var textPanel = root.querySelector(".passage-panel");
    var playerEl = root.querySelector(".player");
    var player = null;

    function say(msg, isError) {
      statusEl.textContent = msg || "";
      statusEl.classList.toggle("error", !!isError);
    }
    function fail(prefix, err) {
      say(prefix + err.message, true);
      if (err.noKey) openSettings(true);
    }

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
      readBtn.setAttribute("aria-busy", "true");
      say("Loading passage…", false);
      Promise.all(c.items.map(function (i) { return fetchText(i.ref); }))
        .then(function (parts) {
          var out = "";
          parts.forEach(function (h, i) {
            if (c.titled) out += '<h4 class="pass-title">' + c.items[i].title + "</h4>";
            out += h;
          });
          textPanel.innerHTML = out + COPYRIGHT_HTML;
          textPanel.dataset.loaded = "true";
          textPanel.classList.add("open");
          readBtn.textContent = "Hide";
          say("", false);
        })
        .catch(function (err) { fail("Couldn't load passage: ", err); })
        .finally(function () { readBtn.removeAttribute("aria-busy"); });
    });

    listenBtn.addEventListener("click", function () {
      if (playerEl.classList.contains("open")) {
        playerEl.classList.remove("open");
        listenBtn.textContent = "Listen";
        if (player) player.pause();
        return;
      }
      if (!player) {
        player = createPlayer(playerEl, c.items.map(function (i) { return i.ref; }), c.kind, c.label, say);
      }
      listenBtn.setAttribute("aria-busy", "true");
      say("Loading audio…", false);
      player.ready()
        .then(function () {
          if (!root.isConnected) return;
          playerEl.classList.add("open");
          listenBtn.textContent = "Hide";
          say("", false);
          player.play();
        })
        .catch(function (err) { fail("Couldn't load audio: ", err); })
        .finally(function () { listenBtn.removeAttribute("aria-busy"); });
    });
  }

  applyMeditationSetting();
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
