/* ============================================================
   PARKER · 13 — memory wall that comes alive
   Flow: title → memory wall (scatter) → assemble → cinematic
         → singing-video moment → warm finale
   ============================================================ */
(function () {
  "use strict";

  /* ---------- config ---------- */
  const PHOTO_COUNT = 127;
  const GRID_COLS = 13;                 // thematic
  const GRID_ROWS = Math.ceil(PHOTO_COUNT / GRID_COLS);

  const FAST = new URLSearchParams(location.search).has("fast");
  const S = FAST ? 0.04 : 1;
  const T = (ms) => Math.max(70, Math.round(ms * S));

  const WALL_HOLD    = T(6200);   // float before assembly
  const ASSEMBLE_MS  = T(5000);   // scatter → grid transition
  const GRID_HOLD    = T(3600);   // admire the full wall
  const PHOTO_MS     = T(2200);   // per-photo in cinematic
  const VIDEO_AT     = 112;       // singing video (Feb 27, 2026) in its chronological spot

  /* ---------- elements ---------- */
  const $ = (id) => document.getElementById(id);
  const titleEl = $("title"), wallEl = $("wall"), cinemaEl = $("cinema"),
        videoEl_phase = $("videoMoment"), finaleEl = $("finale");
  const wallCanvas = $("wallCanvas");
  const cinA = $("cinA"), cinB = $("cinB");
  const video = $("singingVideo");
  const musicA = $("musicA"), musicB = $("musicB");
  const beginBtn = $("beginBtn"), replayBtn = $("replayBtn");

  /* ---------- state ---------- */
  let tiles = [];
  let curLayer = false;           // false = cinA, true = cinB
  let aborted = false;
  let running = false;

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pad = (n) => String(n).padStart(3, "0");

  /* ============================================================
     AUDIO
     ============================================================ */
  musicA.src = "audio/the_nights.mp3";     // The Nights — Avicii (the journey)
  musicB.src = "audio/life_goes_on.mp3";   // Life Goes On — Oliver Tree (warm ending)
  video.src = "video/parker_singing.mp4";  // Parker singing (the climax)
  musicA.volume = 0;
  musicB.volume = 0;
  let activeMusic = "A";                  // "A" = The Nights, "B" = Life Goes On

  function fadeVolume(el, target, ms) {
    const from = Math.max(0, Math.min(1, el.volume));
    const start = performance.now();
    return new Promise((res) => {
      function step(t) {
        const p = Math.max(0, Math.min(1, (t - start) / ms));
        el.volume = Math.max(0, Math.min(1, from + (target - from) * p));
        if (p < 1) requestAnimationFrame(step); else res();
      }
      requestAnimationFrame(step);
    });
  }

  async function startJourneyMusic() {
    activeMusic = "A";
    musicA.currentTime = 0;
    musicB.currentTime = 0;
    musicB.volume = 0;
    try { await musicA.play(); } catch (e) {}
    await fadeVolume(musicA, 1, 2500);
  }

  // When The Nights finishes, continue with Life Goes On (no looping)
  musicA.addEventListener("ended", () => {
    if (activeMusic !== "A") return;
    activeMusic = "B";
    musicB.currentTime = 0;
    musicB.volume = 0;
    musicB.play().catch(() => {});
    fadeVolume(musicB, 1, 3000);
  });

  /* ============================================================
     PHASE SWITCHING
     ============================================================ */
  function showPhase(el) {
    [titleEl, wallEl, cinemaEl, videoEl_phase, finaleEl].forEach((p) => {
      if (p === el) p.classList.add("active");
      else p.classList.remove("active");
    });
  }

  /* ============================================================
     MEMORY WALL
     ============================================================ */
  function computeLayout() {
    const vw = innerWidth, vh = innerHeight;
    const mx = vw * 0.035, my = vh * 0.035;
    const gap = 7;
    const availW = vw - mx * 2, availH = vh - my * 2;
    let tw = (availW - gap * (GRID_COLS - 1)) / GRID_COLS;
    let th = tw / 0.75;                       // 3:4 portrait tile
    if (th * GRID_ROWS + gap * (GRID_ROWS - 1) > availH) {
      th = (availH - gap * (GRID_ROWS - 1)) / GRID_ROWS;
      tw = th * 0.75;
    }
    return { vw, vh, mx, my, gap, tw, th };
  }

  function gridPos(i) {
    const L = computeLayout();
    const row = Math.floor(i / GRID_COLS);
    const col = i % GRID_COLS;
    // centre an incomplete last row
    const inLast = row === GRID_ROWS - 1;
    const lastCount = PHOTO_COUNT - (GRID_ROWS - 1) * GRID_COLS;
    const extra = inLast ? ((GRID_COLS - lastCount) / 2) : 0;
    const x = L.mx + (col + extra) * (L.tw + L.gap);
    const y = L.my + row * (L.th + L.gap);
    return { x, y };
  }

  function buildWall() {
    const L = computeLayout();
    wallCanvas.innerHTML = "";
    tiles = [];
    const frag = document.createDocumentFragment();
    const rnd = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < PHOTO_COUNT; i++) {
      const tile = document.createElement("div");
      tile.className = "tile wall-float";
      tile.style.setProperty("--tw", L.tw + "px");
      tile.style.setProperty("--th", L.th + "px");
      tile.innerHTML = '<div class="tile-frame"><img loading="lazy" alt="" src="photos/thumb/' + pad(i + 1) + '.jpg?v=2"></div>';
      const sx = rnd(-40, L.vw - L.tw + 40);
      const sy = rnd(-40, L.vh - L.th + 40);
      const rot = rnd(-16, 16);
      const sc = rnd(0.92, 1.1);
      tile.dataset.scatter = JSON.stringify({ x: sx, y: sy, r: rot, s: sc });
      tile.style.transform = `translate(${sx}px, ${sy}px) rotate(${rot}deg) scale(${sc})`;
      frag.appendChild(tile);
      tiles.push(tile);
    }
    wallCanvas.appendChild(frag);
  }

  function assemble() {
    const L = computeLayout();
    tiles.forEach((tile, i) => {
      const g = gridPos(i);
      tile.style.transform = `translate(${g.x}px, ${g.y}px) rotate(0deg) scale(1)`;
      tile.style.transition = `transform ${ASSEMBLE_MS}ms cubic-bezier(0.22, 0.9, 0.26, 1)`;
    });
  }

  /* ============================================================
     CINEMATIC
     ============================================================ */
  const preloadCache = new Set();
  function preload(i) {
    if (i > PHOTO_COUNT || preloadCache.has(i)) return;
    preloadCache.add(i);
    const img = new Image();
    img.src = "photos/full/" + pad(i) + ".jpg?v=2";
  }

  function showPhoto(i) {
    const layer = curLayer ? cinB : cinA;
    const prev  = curLayer ? cinA : cinB;
    curLayer = !curLayer;

    layer.style.backgroundImage = `url("photos/full/${pad(i)}.jpg?v=2")`;
    layer.style.transition = "opacity 0.7s ease";
    layer.classList.remove("kenburns");
    void layer.offsetWidth;                 // restart animation
    layer.classList.add("kenburns");
    layer.classList.add("show");
    prev.classList.remove("show");
    preload(i + 3);
  }

  async function runCinematic() {
    for (let i = 1; i <= PHOTO_COUNT; i++) {
      if (aborted) return;
      if (i === VIDEO_AT + 1) await videoMoment();
      showPhoto(i);
      await wait(PHOTO_MS);
    }
  }

  /* ============================================================
     VIDEO MOMENT  (Parker singing)
     ============================================================ */
  async function videoMoment() {
    const el = activeMusic === "B" ? musicB : musicA;
    await fadeVolume(el, 0, T(1400));        // dip the current song
    showPhase(videoEl_phase);
    video.currentTime = 0;
    video.playbackRate = FAST ? 8 : 1;
    video.muted = true;                      // start muted → autoplay is allowed on mobile
    video.play()
      .then(() => { video.muted = false; })  // bring the sound up once playing
      .catch(() => {});                      // failed → onerror/fallback below skips quickly

    await new Promise((res) => {
      let done = false;
      const finish = () => { if (!done) { done = true; res(); } };
      video.onended = finish;
      video.onerror = finish;                // skip fast if the video can't load/play
      setTimeout(finish, T(15000));          // safety fallback (12.4s video + buffer)
    });

    video.pause();
    if (!el.ended) {                         // resume the current song
      el.play().catch(() => {});
      fadeVolume(el, 1, T(1600));
    }
    showPhase(cinemaEl);
  }

  /* ============================================================
     FINALE
     ============================================================ */
  function buildStars() {
    const stars = finaleEl.querySelector(".stars");
    stars.innerHTML = "";
    const n = 46;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.style.left = Math.random() * 100 + "%";
      s.style.top = Math.random() * 70 + "%";
      s.style.animationDelay = (Math.random() * 3.4) + "s";
      s.style.opacity = 0.2 + Math.random() * 0.5;
      stars.appendChild(s);
    }
  }

  async function showFinale() {
    showPhase(finaleEl);
    replayBtn.style.opacity = "1";
    // let the warm song breathe, then very gently fade the music down
    await wait(T(26000));
    fadeVolume(activeMusic === "B" ? musicB : musicA, 0.25, T(4000));
  }

  /* ============================================================
     MAIN SEQUENCE
     ============================================================ */
  async function run() {
    if (running) return;
    running = true;
    aborted = false;

    showPhase(wallEl);
    buildWall();
    startJourneyMusic();                      // The Nights begins (fire-and-forget)
    await wait(WALL_HOLD);

    if (aborted) return;
    wallCanvas.classList.add("wall-float");   // keep float during scatter→grid
    tiles.forEach((t) => t.classList.remove("wall-float"));
    assemble();
    await wait(ASSEMBLE_MS + 200);

    if (aborted) return;
    await wait(GRID_HOLD);

    if (aborted) return;
    showPhase(cinemaEl);
    await runCinematic();

    if (aborted) return;
    await showFinale();
  }

  function reset() {
    aborted = true;
    fadeVolume(musicA, 0, 800);
    fadeVolume(musicB, 0, 800);
    setTimeout(() => { musicA.pause(); musicB.pause(); }, 900);
    video.pause();
    tiles = [];
    wallCanvas.innerHTML = "";
    cinA.classList.remove("show", "kenburns");
    cinB.classList.remove("show", "kenburns");
    replayBtn.style.opacity = "0";
    showPhase(titleEl);
    running = false;
  }

  /* ---------- wire up ---------- */
  beginBtn.addEventListener("click", () => {
    buildStars();
    run();
  });
  replayBtn.addEventListener("click", reset);

  // pre-warm first few full images so the cinematic starts instantly
  for (let i = 1; i <= 6; i++) preload(i);
})();
