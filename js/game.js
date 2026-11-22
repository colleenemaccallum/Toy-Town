/* Stuffie Town — first playable loop
   start -> street -> Baby Bear tidy-up (colors) -> cheer + pick a toy -> playroom
   No build step: plain HTML, CSS and JavaScript. */
(function () {
  'use strict';

  var W = 1366, H = 1024;
  var stage = document.getElementById('stage');
  var fx = document.getElementById('fx');
  var scale = 1;

  /* ---------- fit the stage to the screen ---------- */
  function fit() {
    scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    stage.style.transform = 'scale(' + scale + ') translate(-50%, -50%)';
    stage.style.transformOrigin = '0 0';
    // translate(-50%) is in stage pixels, so place the stage by its scaled size instead:
    stage.style.left = ((window.innerWidth - W * scale) / 2) + 'px';
    stage.style.top = ((window.innerHeight - H * scale) / 2) + 'px';
    stage.style.transform = 'scale(' + scale + ')';
  }
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', function () { setTimeout(fit, 200); });
  fit();

  // screen point -> stage point
  function toStage(e) {
    var r = stage.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  }

  /* ---------- saved progress (the playroom) ---------- */
  var SAVE_KEY = 'stuffie-town-v2';   // v2: fresh start on 2026-11-21 (Colleen asked), old v1 toys are ignored
  var save = { toys: [] }; // [{id, x, y}]
  try { var s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.toys) save = s; } catch (e) {}
  function store() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

  /* ---------- sound ----------
     Narrator: Colleen's recorded lines go in audio/narrator/<name>.m4a
     (see docs/NARRATOR-LINES.md). Missing files are skipped quietly.
     Little sound effects are made right here with Web Audio. */
  var narrator = new Audio();
  var actx = null;
  function unlockAudio() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    if (actx && actx.state === 'suspended') actx.resume();
    loadToySounds();
    if (actx && musicOn && music.paused && !document.hidden) startMusic();
  }
  /* Background music: one quiet looping song (audio/music/background.m4a).
     Routed through Web Audio so the volume works on iPad (Safari ignores audio.volume). */
  var MUSIC_VOL = 0.32, MUSIC_DUCK = 0.1;
  var music = new Audio('audio/music/background.m4a');
  music.loop = true; music.preload = 'auto';
  var musicGain = null, musicOn = true;
  try { musicOn = localStorage.getItem('stuffie-music') !== 'off'; } catch (e) {}
  function startMusic() {
    if (!actx || !musicOn) return;
    if (!musicGain) {
      try {
        var src = actx.createMediaElementSource(music);
        musicGain = actx.createGain();
        musicGain.gain.value = MUSIC_VOL;
        src.connect(musicGain); musicGain.connect(actx.destination);
      } catch (e) { return; }
    }
    var p = music.play(); if (p && p.catch) p.catch(function () {});
  }
  function musicLevel(v) {
    if (musicGain) musicGain.gain.setTargetAtTime(v, actx.currentTime, 0.25);
  }
  // music gets softer while Colleen's voice is talking
  narrator.addEventListener('playing', function () { musicLevel(MUSIC_DUCK); });
  narrator.addEventListener('ended', function () { musicLevel(MUSIC_VOL); });
  narrator.addEventListener('pause', function () { musicLevel(MUSIC_VOL); });
  narrator.addEventListener('error', function () { musicLevel(MUSIC_VOL); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) music.pause(); else if (musicOn && musicGain) startMusic();
  });
  function toggleMusic() {
    musicOn = !musicOn;
    try { localStorage.setItem('stuffie-music', musicOn ? 'on' : 'off'); } catch (e) {}
    if (musicOn) startMusic(); else music.pause();
    showMusicBtn();
  }

  function say(name) {
    try {
      narrator.pause();
      narrator.src = 'audio/narrator/' + name + '.m4a';
      var p = narrator.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }
  function tone(freq, start, dur, type, vol) {
    if (!actx) return;
    var t = actx.currentTime + start;
    var o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.25, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  var sfx = {
    tap: function () { tone(660, 0, .12, 'triangle', .18); },
    pop: function () { tone(523, 0, .12, 'triangle'); tone(784, .08, .2, 'triangle'); },
    boing: function () { tone(220, 0, .18, 'sine', .2); tone(196, .12, .22, 'sine', .15); },
    tada: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * .12, .35, 'triangle', .22); }); },
    sparkle: function () { [659, 784, 880, 1047].forEach(function (f, i) { tone(f, i * .07, .25, 'sine', .09); }); }
  };

  /* ---------- each toy has its own soft sound (plays when she picks it up) ----------
     A few are short recordings (audio/toys, all CC0 from Freesound: see audio/toys/CREDITS.txt).
     The rest are made right here: low, soft notes, nothing sharp or loud. */
  function glide(f0, f1, start, dur, type, vol) {
    if (!actx) return;
    var t = actx.currentTime + start, o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  var noiseBuf = null;
  function hush(start, dur, f0, f1, vol, q) {     // soft filtered noise: swishes, whooshes, knocks
    if (!actx) return;
    if (!noiseBuf) {
      noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
      var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var t = actx.currentTime + start, src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    src.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(actx.destination); src.start(t); src.stop(t + dur + 0.05);
  }
  function knock(start, f) { tone(f, start, .09, 'sine', .22); hush(start, .05, 500, 400, .12, 2); }
  var TOY_FILES = ['baby-doll', 'play-doh', 'puppy', 'race-car'], toyBufs = {}, toyGain = null;
  function loadToySounds() {
    if (!actx || toyGain) return;
    toyGain = actx.createGain(); toyGain.gain.value = 0.8; toyGain.connect(actx.destination);
    TOY_FILES.forEach(function (n) {
      fetch('audio/toys/' + n + '.mp3').then(function (r) { return r.arrayBuffer(); }).then(function (b) {
        actx.decodeAudioData(b, function (buf) { toyBufs[n] = buf; }, function () {});
      }).catch(function () {});
    });
  }
  var TOY_SFX = {
    'xylophone':      function () { [262, 330, 392].forEach(function (f, i) { tone(f, i * .14, .45, 'sine', .2); tone(f * 4, i * .14, .12, 'sine', .02); }); },
    'toy-piano':      function () { [196, 262, 330].forEach(function (f, i) { tone(f, i * .16, .6, 'triangle', .16); }); },
    'music-box':      function () { [392, 523, 659, 523, 392].forEach(function (f, i) { tone(f, i * .2, .7, 'sine', .09); }); },
    'stacking-rings': function () { [280, 320, 360].forEach(function (f, i) { knock(i * .12, f); }); },
    'blocks':         function () { knock(0, 220); knock(.16, 250); },
    'magnet-tiles':   function () { hush(0, .05, 900, 800, .14, 3); hush(.12, .05, 900, 800, .14, 3); },
    'tea-set':        function () { tone(784, 0, .35, 'sine', .07); tone(784, .2, .35, 'sine', .06); },
    'fire-truck':     function () { tone(523, 0, .5, 'sine', .12); tone(523, .3, .5, 'sine', .1); },
    'dump-truck':     function () { glide(70, 95, 0, .6, 'triangle', .2); tone(392, .45, .14, 'sine', .07); tone(392, .65, .14, 'sine', .07); },
    'rocket':         function () { hush(0, .9, 250, 1200, .16, 1.2); },
    'doll-stroller':  function () { for (var i = 0; i < 4; i++) hush(i * .1, .06, 1200, 1100, .06, 4); },
    'doll-house':     function () { knock(0, 160); knock(.18, 160); },
    'dress-up':       function () { [523, 659, 784].forEach(function (f, i) { tone(f, i * .09, .35, 'sine', .07); }); },
    'paint-easel':    function () { hush(0, .3, 700, 900, .12, 1); hush(.28, .3, 900, 700, .1, 1); },
    'bunny':          function () { glide(260, 420, 0, .22, 'sine', .14); glide(300, 480, .22, .22, 'sine', .11); }
  };
  var lastToySound = 0;
  function toySound(id) {
    if (!actx) return false;
    var now = actx.currentTime;
    if (now - lastToySound < .35) return true;     // no pile-ups from quick taps
    lastToySound = now;
    if (toyBufs[id]) {
      var src = actx.createBufferSource(); src.buffer = toyBufs[id]; src.connect(toyGain); src.start();
      return true;
    }
    if (TOY_SFX[id]) { TOY_SFX[id](); return true; }
    return false;
  }

  function sparks(x, y, n) {
    for (var i = 0; i < (n || 7); i++) {
      var s = document.createElement('div');
      s.className = 'spark';
      s.style.left = x + 'px'; s.style.top = y + 'px';
      var a = Math.PI * 2 * i / (n || 7) + Math.random() * .5, d = 90 + Math.random() * 70;
      s.style.setProperty('--dx', Math.cos(a) * d + 'px');
      s.style.setProperty('--dy', Math.sin(a) * d + 'px');
      fx.appendChild(s);
      setTimeout(s.remove.bind(s), 900);
    }
  }

  /* ---------- screens ---------- */
  var current = null;
  var enter = {};
  function go(name) {
    if (current === name) return;
    var old = document.querySelector('.screen.on');
    if (old) old.classList.remove('on');
    document.getElementById(name).classList.add('on');
    current = name;
    if (enter[name]) enter[name]();
  }
  document.querySelectorAll('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () { unlockAudio(); sfx.tap(); go(b.getAttribute('data-go')); });
  });

  /* ===== 1. START ===== */
  var musicBtn = document.getElementById('music-btn');
  var musicImg = document.getElementById('music-img');
  function showMusicBtn() { musicImg.src = 'art/music-' + (musicOn ? 'on' : 'off') + '.webp'; }
  // only show the button once its art exists
  var probe = new Image();
  probe.onload = function () { musicBtn.hidden = false; showMusicBtn(); };
  probe.src = 'art/music-on.webp';
  musicBtn.addEventListener('click', function () { unlockAudio(); toggleMusic(); });
  document.getElementById('play-btn').addEventListener('click', function () {
    unlockAudio(); sfx.pop(); go('street');
  });
  enter.start = function () { say('01-welcome'); };

  /* ===== 2. STREET ===== */
  // Where each house sits on the wide street picture (fractions of its width / height).
  var HOUSES = [
    { id: 'baby-bear', x: .033, w: .106, open: 'tidy' },
    { id: 'shelley',   x: .174, w: .143 },
    { id: 'annie',     x: .350, w: .098 },
    { id: 'playroom',  x: .462, w: .170, open: 'playroom' },
    { id: 'bart',      x: .654, w: .092 },
    { id: 'terry',     x: .762, w: .088 },
    { id: 'jeffrey',   x: .861, w: .113, open: 'jeffrey' } // js/jeffrey.js
  ];
  var housesEl = document.getElementById('houses');
  HOUSES.forEach(function (h) {
    var d = document.createElement('div');
    d.className = 'house' + (h.open ? ' open' : '');
    d.style.left = (h.x * 4096) + 'px';
    d.style.width = (h.w * 4096) + 'px';
    d.style.top = '380px';
    d.style.height = '440px';
    d.setAttribute('aria-label', h.id + ' house');
    // a tap, not a scroll: only count it if the finger barely moved
    var sx = 0, sy = 0;
    d.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; });
    d.addEventListener('pointerup', function (e) {
      if (Math.abs(e.clientX - sx) > 14 || Math.abs(e.clientY - sy) > 14) return;
      unlockAudio();
      if (h.open) { sfx.pop(); go(h.open); }
      else {
        sfx.boing(); say('03-not-home');
        d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake');
      }
    });
    housesEl.appendChild(d);
  });
  var streetFirst = true;
  enter.street = function () {
    if (streetFirst) { document.getElementById('street-scroller').scrollLeft = 0; streetFirst = false; }
    say('02-street');
  };

  /* ===== 3. BABY BEAR TIDY-UP (round 1: colors) ===== */
  var BOXES = [
    // bigger bins, centered on the page: 4 x 250px with 14px gaps
    { color: 'red',    x: 162 },
    { color: 'blue',   x: 426 },
    { color: 'yellow', x: 690 },
    { color: 'green',  x: 954 }
  ];
  var BOX_Y = 575;   // bins in the middle of the floor, Baby Bear by the wall on the left
  var TOYS = [
    { id: 'red-ball',    color: 'red' },
    { id: 'red-car',     color: 'red' },
    { id: 'blue-boat',   color: 'blue' },
    { id: 'blue-block',  color: 'blue' },
    { id: 'yellow-duck', color: 'yellow' },
    { id: 'yellow-star', color: 'yellow' },
    { id: 'green-frog',  color: 'green' },
    { id: 'green-train', color: 'green' }
  ];
  // spots on and around the rug (top-left corner of each 130px toy)
  var SPOTS = [
    [300, 870], [460, 890], [620, 860], [780, 890],
    [940, 860], [1100, 885], [1230, 840], [1240, 600]
  ];
  var boxesEl = document.getElementById('boxes');
  var toysEl = document.getElementById('toys');
  var bear = document.getElementById('tidy-bear');
  BOXES.forEach(function (b) {
    var d = document.createElement('div');
    d.className = 'box';
    d.style.left = b.x + 'px'; d.style.top = BOX_Y + 'px';
    d.innerHTML = '<div class="inside"></div><img src="art/' + b.color + '-box.webp" alt="' + b.color + ' box">';
    b.el = d;
    boxesEl.appendChild(d);
  });

  var left = 0, idleTimer = null;

  // Baby Bear stays calm so he doesn't pull her eyes off the toys: he stands
  // still and blinks now and then. The blink is a second ChatGPT picture laid
  // exactly on top and shown for a moment, so nothing moves or redraws.
  var bearBlink = document.createElement('img');
  bearBlink.id = 'tidy-bear-blink';
  bearBlink.src = 'art/baby-bear-blink.webp'; bearBlink.alt = '';
  bear.parentNode.insertBefore(bearBlink, bear.nextSibling);
  new Image().src = 'art/baby-bear-clap.webp';
  var blinkT = null;
  function bearLife() {
    clearTimeout(blinkT);
    bear.src = 'art/baby-bear-stand.webp'; bearBlink.style.visibility = 'hidden';
    (function blink() {
      blinkT = setTimeout(function () {
        if (current === 'tidy' && left) {
          bearBlink.style.visibility = 'visible';
          setTimeout(function () { bearBlink.style.visibility = 'hidden'; }, 160);
        }
        blink();
      }, 2500 + Math.random() * 2500);
    })();
  }

  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (current !== 'tidy' || !left) return;
      var t = toysEl.querySelector('.toy:not(.gone)');
      if (t) { t.classList.remove('hint'); void t.offsetWidth; t.classList.add('hint'); }
      say('06-hint');
      resetIdle();
    }, 12000);
  }

  function startTidy() {
    toysEl.innerHTML = '';
    BOXES.forEach(function (b) { b.el.querySelector('.inside').innerHTML = ''; });
    left = TOYS.length;
    bearLife();
    var spots = shuffle(SPOTS.slice());
    TOYS.forEach(function (t, i) {
      var d = document.createElement('div');
      d.className = 'toy';
      d.innerHTML = '<img src="art/toy-' + t.id + '.webp" alt="' + t.id.replace('-', ' ') + '">';
      d.style.left = spots[i][0] + 'px'; d.style.top = spots[i][1] + 'px';
      d.dataset.home = spots[i].join(',');
      makeDraggable(d, t);
      toysEl.appendChild(d);
    });
    resetIdle();
  }

  function boxUnder(p) {
    for (var i = 0; i < BOXES.length; i++) {
      var b = BOXES[i];
      // generous target: the box plus some room around it
      if (p.x > b.x - 7 && p.x < b.x + 257 && p.y > BOX_Y - 80 && p.y < BOX_Y + 300) return b;
    }
    return null;
  }

  /* Smooth dragging: while a finger moves a toy, slide it with a GPU transform
     instead of left/top. Moving left/top under a drop shadow left smeared
     trails on iPad Safari. */
  function moveBy(el, sc) {
    el.style.transform = 'translate3d(' + (el._nx - el._bx) + 'px,' + (el._ny - el._by) + 'px,0) scale(' + sc + ')';
  }
  function commitMove(el) {
    // still "dragging" (no transition) while we swap transform for left/top
    el.style.left = el._nx + 'px'; el.style.top = el._ny + 'px';
    el.style.transform = '';
    void el.offsetWidth;
    el.classList.remove('dragging');
  }

  function makeDraggable(el, toy) {
    var dragging = false, off = { x: 0, y: 0 }, pid = null;
    el.addEventListener('pointerdown', function (e) {
      if (dragging) return;
      unlockAudio();
      dragging = true; pid = e.pointerId;
      try { el.setPointerCapture(pid); } catch (err) {}
      var p = toStage(e);
      el._bx = parseFloat(el.style.left); el._by = parseFloat(el.style.top);
      el._nx = el._bx; el._ny = el._by;
      off.x = p.x - el._bx; off.y = p.y - el._by;
      el.classList.add('dragging'); el.classList.remove('hint');
      moveBy(el, 1.18);
      sfx.tap(); resetIdle();
    });
    el.addEventListener('pointermove', function (e) {
      if (!dragging || e.pointerId !== pid) return;
      var p = toStage(e);
      el._nx = Math.max(-30, Math.min(W - 100, p.x - off.x));
      el._ny = Math.max(-30, Math.min(H - 100, p.y - off.y));
      moveBy(el, 1.18);
    });
    function drop(e) {
      if (!dragging || e.pointerId !== pid) return;
      dragging = false;
      commitMove(el);
      var p = { x: el._nx + 65, y: el._ny + 65 };
      var b = boxUnder(p);
      if (b && b.color === toy.color) putAway(el, toy, b);
      else {
        var home = el.dataset.home.split(',');
        el.style.left = home[0] + 'px'; el.style.top = home[1] + 'px';
        if (b) { sfx.boing(); say('05-try-again'); el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle'); }
      }
      resetIdle();
    }
    el.addEventListener('pointerup', drop);
    el.addEventListener('pointercancel', drop);
  }

  function putAway(el, toy, b) {
    el.classList.add('gone');
    var inside = b.el.querySelector('.inside');
    var n = inside.children.length;
    var img = document.createElement('img');
    img.src = 'art/toy-' + toy.id + '.webp';
    img.style.left = (40 + n * 79) + 'px';
    img.style.top = (n ? -6 : 4) + 'px';
    inside.appendChild(img);
    b.el.classList.remove('happy'); void b.el.offsetWidth; b.el.classList.add('happy');
    sfx.pop(); sparks(b.x + 125, BOX_Y + 70);
    left--;
    if (!left) { clearTimeout(blinkT); bearBlink.style.visibility = 'hidden'; bear.src = 'art/baby-bear-clap.webp'; }
    if (left === 0) {
      clearTimeout(idleTimer);
      setTimeout(function () {
        sfx.tada(); say('07-all-done');
        sparks(683, 400, 12); sparks(300, 600, 9); sparks(1060, 600, 9);
      }, 450);
      setTimeout(function () { go('prize'); }, 2600);
    } else {
      say('04-yes-' + (1 + Math.floor(Math.random() * 3)));
    }
  }
  enter.tidy = function () { startTidy(); say('03-tidy-intro'); };

  /* ===== 4. CHEER + PICK 1 OF 3 ===== */
  // One girl-leaning, one boy-leaning, one in-between. No labels.
  // Prize toys in three groups. Each time she picks from one of each group,
  // toys she doesn't have yet first. No labels on screen.
  var PRIZE_GROUPS = [
    [ { id: 'baby-doll', h: 230 }, { id: 'doll-house', h: 210 }, { id: 'dress-up', h: 200 }, { id: 'tea-set', h: 170 },
      { id: 'doll-stroller', h: 220 }, { id: 'music-box', h: 230 } ],
    [ { id: 'race-car', h: 150 }, { id: 'fire-truck', h: 170 }, { id: 'dump-truck', h: 160 }, { id: 'rocket', h: 230 } ],
    [ { id: 'paint-easel', h: 220 }, { id: 'blocks', h: 200 }, { id: 'magnet-tiles', h: 200 },
      { id: 'play-doh', h: 175 }, { id: 'bunny', h: 200 }, { id: 'xylophone', h: 140 },
      { id: 'stacking-rings', h: 210 }, { id: 'toy-piano', h: 180 }, { id: 'puppy', h: 180 } ]
  ];
  function pickPrizes() {
    var owned = {};
    save.toys.forEach(function (t) { owned[t.id] = true; });
    return PRIZE_GROUPS.map(function (g) {
      var fresh = g.filter(function (p) { return !owned[p.id]; });
      var pool = fresh.length ? fresh : g;
      return pool[Math.floor(Math.random() * pool.length)];
    });
  }
  var prizesEl = document.getElementById('prizes');
  // (no floating confetti here: she kept trying to tap it)
  var picking = false;
  enter.prize = function () {
    picking = false;
    prizesEl.innerHTML = '';
    shuffle(pickPrizes()).forEach(function (p, i) {
      var c = document.createElement('div');
      c.className = 'cushion';
      // the three cushions are centered on the page and on the rug
      c.style.left = (288 + i * 270) + 'px';
      c.style.top = '545px';
      // cushion first, toy second, so the toy sits ON the cushion
      c.innerHTML = '<img class="pad" src="art/prize-cushion.webp" alt="">' +
                    '<img class="gift" src="art/' + p.id + '.webp" alt="" style="height:' + p.h + 'px">';
      c.addEventListener('click', function () {
        if (picking) return;
        picking = true;
        unlockAudio(); sfx.sparkle();
        setTimeout(function () { toySound(p.id); }, 450);
        c.classList.add('picked');
        prizesEl.querySelectorAll('.cushion').forEach(function (o) { if (o !== c) o.classList.add('other'); });
        sparks(288 + i * 270 + 125, 645, 10);
        say('09-great-pick');
        save.toys.push({ id: p.id, x: null, y: null, isNew: true });
        store();
        setTimeout(function () { go('playroom'); }, 1700);
      });
      prizesEl.appendChild(c);
    });
    say('08-pick-a-toy');
  };

  /* ===== 5. PLAYROOM ===== */
  var ROOM_SIZE = {
    'baby-doll': [90, 143], 'race-car': [143, 98], 'paint-easel': [135, 158],
    'doll-house': [142, 150], 'dress-up': [130, 125], 'tea-set': [140, 123], 'fire-truck': [150, 133],
    'blocks': [116, 120], 'magnet-tiles': [117, 115], 'play-doh': [134, 117], 'bunny': [120, 115],
    'doll-stroller': [126, 140], 'music-box': [92, 150], 'dump-truck': [133, 100], 'rocket': [109, 150],
    'xylophone': [137, 85], 'stacking-rings': [113, 130], 'toy-piano': [134, 115], 'puppy': [147, 115]
  };
  var roomEl = document.getElementById('room-toys');
  var furnEl = document.getElementById('furniture');
  var roomScroller = document.getElementById('room-scroller');
  var roomWide = document.getElementById('room-wide');
  var ROOM_W = 2925;      // the playroom is about two screens wide
  // screen point -> playroom point (adds how far the room is slid over)
  function toRoom(e) { var p = toStage(e); p.x += roomScroller.scrollLeft; return p; }

  // Places a toy can sit. y = the line the toy's bottom rests on.
  // maxH (optional) = the tallest a toy can be there; bigger toys shrink to fit (cubbies).
  // The two wall shelves are part of the playroom picture.
  var SHELVES = [
    { x0: 40,   x1: 350,  y: 260 },   // raised a little (Colleen) so it clears the bookcase
    { x0: 1015, x1: 1325, y: 260 },
    { x0: 1490, x1: 1858, y: 358 },
    { x0: 2410, x1: 2785, y: 358 }
  ];
  var FLOOR_TOP = 690;      // toy bottoms below this line are "on the floor"
  var surfaces = SHELVES.slice();  // rebuilt by rebuildSurfaces()

  // Furniture pieces (ChatGPT felt art). left/bottom/width = where it stands;
  // tops = flat places on it as fractions of the picture: [from x, to x, at y, max toy height (fraction)].
  var FURNITURE = [
    { id: 'cubby-bookcase', left: 18,   bottom: 700, width: 400, tops: [[.06, .94, .10], [.08, .92, .485, .26], [.08, .92, .88, .26]] },
    { id: 'window-seat',    left: 420,  bottom: 660, width: 520, tops: [[.1, .9, .40, 0, 1]] },
    { id: 'toy-chest',      left: 1010, bottom: 695, width: 310, tops: [[.08, .92, .18]] },
    { id: 'tea-table',      left: 463,  bottom: 965, width: 430, tops: [[.3, .7, .28], [.02, .24, .52, 0, 1], [.76, .98, .52, 0, 1]] },
    // the second half of the room
    { id: 'rack-empty',     left: 1400, bottom: 700, width: 250, tops: [] },
    { id: 'beanbag',        left: 1935, bottom: 765, width: 260, tops: [[.2, .8, .56, 0, 1]] },
    { id: 'plant',          left: 2290, bottom: 690, width: 130, tops: [] },
    { id: 'kitchen-closed', left: 2470, bottom: 757, width: 260, tops: [[.06, .94, .31]] },
    { id: 'rocking-horse',  left: 1690, bottom: 905, width: 260, tops: [[.38, .72, .40, 0, 1]] },
    { id: 'floor-pouf',     left: 2255, bottom: 905, width: 190, tops: [[.2, .8, .12, 0, 1]] }
  ];
  // Furniture you can tap: the toy chest lid opens and closes (toys can go
  // inside), and each bench drawer slides open and shut.
  var chest = FURNITURE[2], seat = FURNITURE[1];
  chest.open = false;
  chest.openArt = { src: 'art/toy-chest-open.webp', left: 1018, width: 295 };
  seat.drawers = { left: false, right: false };
  ['toy-chest-open', 'window-seat-left', 'window-seat-right', 'window-seat-both'].forEach(function (n) { new Image().src = 'art/' + n + '.webp'; });

  function rebuildSurfaces() {
    surfaces = SHELVES.slice();
    FURNITURE.forEach(function (f) { (f.surfs || []).forEach(function (s) { surfaces.push(s); }); });
  }
  function surfsFor(f, h) {
    return f.tops.map(function (t) {
      return { x0: f.left + t[0] * f.width, x1: f.left + t[1] * f.width, y: f.bottom - h + t[2] * h,
               maxH: t[3] ? t[3] * h : 0, seat: !!t[4] };
    });
  }

  function onTap(el, fn) {
    var sx = 0, sy = 0;
    el.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; });
    el.addEventListener('pointerup', function (e) {
      if (Math.abs(e.clientX - sx) < 14 && Math.abs(e.clientY - sy) < 14) { unlockAudio(); fn(e); }
    });
  }

  FURNITURE.forEach(function (f) {
    var img = new Image();
    img.onload = function () {
      if (f.h) return;               // already set up
      var h = f.width * img.naturalHeight / img.naturalWidth;
      f.h = h; f.img = img;
      img.className = 'furniture';
      img.style.left = f.left + 'px'; img.style.top = (f.bottom - h) + 'px'; img.style.width = f.width + 'px';
      furnEl.appendChild(img);
      f.surfs = surfsFor(f, h);
      rebuildSurfaces();
      if (f === chest) setupChest();
      if (f === seat) setupSeat();
      if (f.id === 'rack-empty') setupRack(f);
      if (f.id === 'kitchen-closed') setupKitchen(f);
      if (TAP_FUN[f.id]) { img.classList.add('tappable'); onTap(img, function () { playFun(f); }); }
    };
    img.src = 'art/' + f.id + '.webp';
  });

  // The bench's two big drawers: tap a side to open or close it. Toys can go
  // inside an open drawer; the drawer's front is laid over them so they look
  // tucked in, and they're hidden away when the drawer closes.
  var DRAWER = { left: [.07, .47], right: [.53, .93], front: .713, floor: .78, maxH: 72 };
  var drawerFront = {};
  function setupSeat() {
    seat.img.classList.add('tappable');
    onTap(seat.img, function (e) {
      var p = toRoom(e);
      toggleDrawer(p.x < seat.left + seat.width / 2 ? 'left' : 'right');
    });
    ['left', 'right'].forEach(function (side) {
      var f = document.createElement('img');
      f.className = 'furniture chest-front tappable';
      f.src = 'art/window-seat-both.webp';
      f.style.left = seat.left + 'px'; f.style.top = (seat.bottom - seat.h) + 'px'; f.style.width = seat.width + 'px';
      var clip = side === 'left' ? 'inset(' + DRAWER.front * 100 + '% 50% 0 0)' : 'inset(' + DRAWER.front * 100 + '% 0 0 50%)';
      f.style.clipPath = clip; f.style.webkitClipPath = clip;
      f.style.display = 'none';
      roomWide.appendChild(f);
      onTap(f, function () { toggleDrawer(side); });
      drawerFront[side] = f;
    });
  }
  function seatSurfs() {
    var list = surfsFor(seat, seat.h), top = seat.bottom - seat.h;
    ['left', 'right'].forEach(function (side) {
      if (!seat.drawers[side]) return;
      list.push({ x0: seat.left + DRAWER[side][0] * seat.width, x1: seat.left + DRAWER[side][1] * seat.width,
                  y: top + DRAWER.floor * seat.h, maxH: DRAWER.maxH, drawer: side });
    });
    return list;
  }
  function toggleDrawer(side) {
    seat.drawers[side] = !seat.drawers[side];
    var d = seat.drawers, n = d.left && d.right ? '-both' : d.left ? '-left' : d.right ? '-right' : '';
    seat.img.src = 'art/window-seat' + n + '.webp';
    drawerFront[side].style.display = d[side] ? 'block' : 'none';
    seat.surfs = seatSurfs();
    rebuildSurfaces();
    roomEl.querySelectorAll('.room-toy').forEach(function (el) {
      if (el._toy.drawer === side) el.style.display = d[side] ? '' : 'none';
    });
    d[side] ? sfx.pop() : sfx.tap();
    store();
  }
  // toys put away in the closed chest or a closed drawer stay hidden
  function tuckedAway(t) {
    return (t.inside && !chest.open) || (t.drawer && !seat.drawers[t.drawer]) || (t.oven && !(kitchen && kitchen.open));
  }

  /* ---------- little tap moments: every piece does something soft ---------- */
  function wiggleEl(el, cls, ms) {
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    clearTimeout(el._funT); el._funT = setTimeout(function () { el.classList.remove(cls); }, ms);
  }
  var TAP_FUN = {
    'rocking-horse':  { cls: 'fun-rock', ms: 1700, sound: function () { knock(0, 200); knock(.3, 230); knock(.6, 200); knock(.9, 230); } },
    'beanbag':        { cls: 'fun-squish', ms: 700, sound: function () { hush(0, .45, 400, 250, .16, .8); } },
    'floor-pouf':     { cls: 'fun-squish', ms: 700, sound: function () { glide(180, 260, 0, .25, 'sine', .14); } },
    'plant':          { cls: 'fun-sway', ms: 1400, sound: function () { hush(0, .5, 1400, 1100, .07, 2); hush(.3, .5, 1200, 1000, .05, 2); } },
    'cubby-bookcase': { cls: 'fun-wobble', ms: 600, sound: function () { knock(0, 170); } },
    'tea-table':      { cls: 'fun-wobble', ms: 600, sound: function () { TOY_SFX['tea-set'](); } }
  };
  function playFun(f) {
    var fun = TAP_FUN[f.id];
    wiggleEl(f.img, fun.cls, fun.ms);
    fun.sound();
  }

  // The play kitchen: tap to open and shut the oven door. Toys can go in the oven.
  var kitchen = null;
  new Image().src = 'art/kitchen-open.webp';
  function setupKitchen(f) {
    kitchen = f; f.open = false;
    f.img.classList.add('tappable');
    onTap(f.img, function () {
      f.open = !f.open;
      f.img.src = 'art/kitchen-' + (f.open ? 'open' : 'closed') + '.webp';
      f.surfs = surfsFor(f, f.h);
      if (f.open) f.surfs.push({ x0: f.left + .14 * f.width, x1: f.left + .56 * f.width, y: f.bottom - f.h + .60 * f.h, maxH: 62, oven: true });
      rebuildSurfaces();
      roomEl.querySelectorAll('.room-toy').forEach(function (el) {
        if (el._toy.oven) el.style.display = f.open ? '' : 'none';
      });
      if (f.open) { tone(392, 0, .3, 'sine', .09); tone(523, .12, .45, 'sine', .08); } else knock(0, 190);
      store();
    });
  }

  // Window curtains: tap the window to close them, tap the curtains to open them again.
  var curtainsShut = false;
  function setupCurtains() {
    var c = document.createElement('img');
    c.className = 'furniture curtains tappable';
    c.src = 'art/curtains-closed.webp';
    c.style.left = '455px'; c.style.top = '62px'; c.style.width = '450px';
    c.style.display = 'none';
    var zone = document.createElement('div');
    zone.className = 'tap-zone';
    zone.style.cssText = 'left:500px;top:70px;width:360px;height:420px;';
    function toggle() {
      curtainsShut = !curtainsShut;
      c.style.display = curtainsShut ? 'block' : 'none';
      zone.style.display = curtainsShut ? 'none' : 'block';
      hush(0, .45, 700, 500, .1, 1);
    }
    onTap(c, toggle); onTap(zone, toggle);
    furnEl.parentNode.insertBefore(zone, furnEl);
    furnEl.parentNode.insertBefore(c, furnEl);
  }
  // The bunting: its own ChatGPT piece over the wall. Tap it to shake and jingle.
  function setupBunting() {
    var b = document.createElement('img');
    b.className = 'furniture bunting tappable';
    b.src = 'art/bunting.webp';
    b.style.left = '1668px'; b.style.top = '50px'; b.style.width = '940px'; b.style.height = '255px';
    onTap(b, function () {
      wiggleEl(b, 'fun-shake', 1100);
      [659, 784, 880, 784, 659].forEach(function (f, i) { tone(f, i * .09, .3, 'sine', .06); });
    });
    furnEl.parentNode.insertBefore(b, furnEl);
  }
  setupCurtains();
  setupBunting();

  // The dress-up rack: each hanger is its own ChatGPT piece and swings when tapped.
  var HANGERS = [['hang-tutu', .33, 92], ['hang-cape', .56, 90], ['hang-dress', .79, 88]];
  function setupRack(f) {
    var barY = f.bottom - f.h + .21 * f.h;
    HANGERS.forEach(function (hg, i) {
      var el = document.createElement('img');
      el.className = 'furniture hanger tappable';
      el.src = 'art/' + hg[0] + '.webp';
      el.style.width = hg[2] + 'px';
      el.style.left = (f.left + hg[1] * f.width - hg[2] / 2) + 'px';
      el.style.top = (barY - 6) + 'px';
      furnEl.appendChild(el);
      onTap(el, function () {
        wiggleEl(el, 'fun-swing', 1600);
        hush(0, .35, 900, 700, .06, 1.5);
        tone([392, 440, 494][i], 0, .5, 'sine', .07);
      });
    });
  }

  // The open chest: the open picture, plus the same picture's front part laid
  // over the toys so toys put inside look like they're really in the chest.
  var chestFront = null;
  function setupChest() {
    chest.img.classList.add('tappable');
    var oa = chest.openArt;
    var open = new Image();
    open.onload = function () {
      var h = oa.width * open.naturalHeight / open.naturalWidth;
      oa.h = h; oa.top = chest.bottom - h;
      oa.inside = { x0: oa.left + .18 * oa.width, x1: oa.left + .82 * oa.width, y: oa.top + .58 * h, maxH: 0, inside: true };
    };
    open.src = oa.src;
    chestFront = document.createElement('img');
    chestFront.className = 'furniture chest-front tappable';
    chestFront.src = oa.src;
    chestFront.style.left = oa.left + 'px'; chestFront.style.width = oa.width + 'px';
    chestFront.style.display = 'none';
    roomWide.appendChild(chestFront);
    onTap(chest.img, toggleChest);
    onTap(chestFront, toggleChest);
  }
  function toggleChest() {
    var oa = chest.openArt;
    if (!oa.h) return;
    chest.open = !chest.open;
    if (chest.open) {
      chest.img.src = oa.src;
      chest.img.style.left = oa.left + 'px'; chest.img.style.width = oa.width + 'px'; chest.img.style.top = oa.top + 'px';
      chestFront.style.top = oa.top + 'px'; chestFront.style.display = 'block';
      chest.surfs = [oa.inside];
      sfx.pop();
    } else {
      chest.img.src = 'art/' + chest.id + '.webp';
      chest.img.style.left = chest.left + 'px'; chest.img.style.width = chest.width + 'px'; chest.img.style.top = (chest.bottom - chest.h) + 'px';
      chestFront.style.display = 'none';
      chest.surfs = surfsFor(chest, chest.h);
      sfx.tap();
    }
    rebuildSurfaces();
    // toys sitting on the lid hop off when it opens; toys inside hide when it closes
    roomEl.querySelectorAll('.room-toy').forEach(function (el) {
      var t = el._toy;
      if (t.inside) { el.style.display = chest.open ? '' : 'none'; return; }
      if (chest.open && t.onLid) {
        t.x = chest.left - toySize(t)[0] - 10; t.y = 0;   // set down beside the chest
        t.y = FLOOR_TOP + 70 - toySize(t)[1]; t.onLid = false;
        el.classList.add('settling'); placeEl(el, t);
      }
    });
    store();
  }

  // size of a toy at its current spot (smaller inside cubbies)
  function toySize(t) {
    if (t.pal) {
      var P = PALS[t.id], k = t.sitting ? P.sit : P.stand, md = dressOf(t);
      return [k[1] * (md ? md.ratio(t.sitting) : k[2]), k[1]];
    }
    var sz = ROOM_SIZE[t.id] || [110, 110], s = t.s || 1;
    return [sz[0] * s, sz[1] * s];
  }
  function placeEl(el, t) {
    var sz = toySize(t);
    el.style.width = sz[0] + 'px'; el.style.height = sz[1] + 'px';
    el.style.left = t.x + 'px'; el.style.top = t.y + 'px';
  }

  // Find where a toy should settle: on a shelf or furniture top close to it,
  // on the floor if it's low enough, otherwise it drops down to the floor.
  function settle(t) {
    if (t.pal) return settlePal(t);
    var full = ROOM_SIZE[t.id] || [110, 110];
    var cur = toySize(t);
    var cx = t.x + cur[0] / 2, bottom = t.y + cur[1], best = null, bestD = 1e9;
    surfaces.forEach(function (s) {
      if (cx < s.x0 || cx > s.x1) return;
      var d = Math.abs(bottom - s.y);
      if (d < 90 && d < bestD) { best = s; bestD = d; }
    });
    t.s = (best && best.maxH && full[1] > best.maxH) ? best.maxH / full[1] : 1;
    t.inside = !!(best && best.inside);
    t.drawer = (best && best.drawer) || null;
    t.oven = !!(best && best.oven);
    t.onLid = !!(best && !chest.open && chest.surfs && chest.surfs.indexOf(best) >= 0);
    if (best) bottom = best.y + 4;
    else if (bottom < FLOOR_TOP) bottom = FLOOR_TOP + 70;
    bottom = Math.min(bottom, H - 10);
    var sz = toySize(t);
    t.x = Math.max(0, Math.min(ROOM_W - sz[0], cx - sz[0] / 2));
    t.y = bottom - sz[1];
  }

  /* ---------- Maddie and Sandy: move them around and sit them down ----------
     Standing and sitting pictures are ChatGPT art. Drop one near a chair,
     the bench, the beanbag, the pouf or the horse's saddle and she sits there. */
  var PALS = {
    // [picture, height, width/height], lap = how far down the sitting picture the seat line is
    maddie: { stand: ['maddie-point', 300, 610 / 969], sit: ['maddie-sit', 230, 514 / 857], lap: .70, home: [10, 1012] },
    sandy:  { stand: ['sandy-happy', 300, 726 / 980], sit: ['sandy-sit', 230, 615 / 858], lap: .72, home: [ROOM_W - 232, 1012] }
  };
  // Maddie's dress-up look (js/dressup.js): once she wears something new, her
  // picture is the stack of dress-up layers. She sits only if sitting layers exist.
  function dressOf(t) {
    var md = t.id === 'maddie' && window.StuffieTown && window.StuffieTown.maddieDress;
    return md && md.dressed() ? md : null;
  }
  function settlePal(t) {
    var P = PALS[t.id], st = P.stand[1], cx = t.x + toySize(t)[0] / 2, hip = t.y + st * .62, best = null, bestD = 1e9;
    var md = dressOf(t), noSeat = md && !md.canSit();
    surfaces.forEach(function (s) {
      if (noSeat || !s.seat || cx < s.x0 - 30 || cx > s.x1 + 30) return;
      var d = Math.abs(hip - s.y);
      if (d < 140 && d < bestD) { best = s; bestD = d; }
    });
    var bottom = t.y + st;
    t.sitting = !!best;
    var sz = toySize(t);
    if (best) { t.y = best.y - P.lap * sz[1]; cx = Math.max(best.x0, Math.min(best.x1, cx)); }
    else { bottom = Math.max(FLOOR_TOP + 60, Math.min(H - 8, bottom)); t.y = bottom - sz[1]; }
    t.x = Math.max(0, Math.min(ROOM_W - sz[0], cx - sz[0] / 2));
  }
  function palImg(el, t) {
    var P = PALS[t.id], md = dressOf(t);
    if (md && t.sitting && !md.canSit()) t.sitting = false;
    el.classList.toggle('dz-stack', !!md);
    el.innerHTML = md ? md.html(t.sitting)
      : '<img src="art/' + (t.sitting ? P.sit[0] : P.stand[0]) + '.webp" alt="">';
  }
  ['maddie-sit', 'sandy-sit'].forEach(function (n) { new Image().src = 'art/' + n + '.webp'; });
  function addPals() {
    if (!save.pals) save.pals = {};
    Object.keys(PALS).forEach(function (id) {
      var t = save.pals[id];
      if (!t) {
        var P = PALS[id];
        t = save.pals[id] = { id: id, pal: true, sitting: false, x: P.home[0], y: P.home[1] - P.stand[1] };
      }
      var d = document.createElement('div');
      d.className = 'room-toy room-pal';
      d._toy = t;
      // dressed up with no sitting pictures yet: she hops down and stands
      var md = dressOf(t);
      if (md && t.sitting && !md.canSit()) { t.sitting = false; settlePal(t); }
      palImg(d, t); placeEl(d, t);
      roomDrag(d, t);
      roomEl.appendChild(d);
    });
  }

  // where new toys first land (toy center x, bottom y), tried in order:
  // window seat, toy chest, bookcase top, tea table, wall shelves, floor
  var NEW_SPOTS = [[683, 556], [1165, 527], [218, 437], [683, 765], [195, 260], [1170, 260],
    [540, 556], [826, 556], [120, 260], [1250, 260], [519, 832], [837, 832],
    [106, 548], [218, 548], [330, 548], [106, 665], [218, 665], [330, 665],
    [420, 920], [950, 920], [300, 990], [1060, 990],
    // second half of the room
    [2600, 415], [2065, 640], [1570, 358], [1770, 358], [2500, 358], [2700, 358], [2350, 795],
    [1820, 790], [1600, 950], [2100, 950], [2600, 950], [1900, 1000], [2400, 1000]];
  function freeSpot() {
    for (var i = 0; i < NEW_SPOTS.length; i++) {
      var sp = NEW_SPOTS[i], taken = save.toys.some(function (o) {
        if (o.x === null) return false;
        var z = toySize(o);
        return Math.abs(o.x + z[0] / 2 - sp[0]) < 70 && Math.abs(o.y + z[1] - sp[1]) < 40 && !tuckedAway(o);
      });
      if (!taken) return sp;
    }
    return [683, 900];
  }

  var roomPeeked = false;
  enter.playroom = function () {
    roomEl.innerHTML = '';
    var anyNew = false, showX = 0;
    roomScroller.scrollLeft = 0;
    save.toys.forEach(function (t, i) {
      if (t.x === null) {
        var s = freeSpot(), sz0 = toySize(t);
        t.x = s[0] - sz0[0] / 2; t.y = s[1] - sz0[1];
        settle(t);
      }
      var d = document.createElement('div');
      d.className = 'room-toy' + (t.isNew ? ' new' : '');
      placeEl(d, t);
      d.innerHTML = '<img src="art/' + t.id + '.webp" alt="">';
      d._toy = t;
      if (tuckedAway(t)) d.style.display = 'none';
      if (t.isNew) {
        anyNew = true;
        // slide over so the new toy is on screen before it sparkles
        showX = Math.max(0, Math.min(ROOM_W - W, t.x - W / 2));
        roomScroller.scrollLeft = showX;
        var sz = toySize(t);
        setTimeout(function () { sparks(t.x - roomScroller.scrollLeft + sz[0] / 2, t.y + sz[1] / 2, 9); sfx.sparkle(); }, 350);
        t.isNew = false;
      }
      roomDrag(d, t);
      roomEl.appendChild(d);
    });
    addPals();
    store();
    // the first time, the room slides a little to show there's more to the right
    if (!roomPeeked && !anyNew) {
      roomPeeked = true;
      setTimeout(function () { slideRoom(320); }, 900);
      setTimeout(function () { slideRoom(0); }, 2000);
    }
    say(anyNew ? '10-playroom-new' : '11-playroom');
  };

  function slideRoom(x) {
    try { roomScroller.scrollTo({ left: x, behavior: 'smooth' }); } catch (e) { roomScroller.scrollLeft = x; }
  }

  function roomDrag(el, t) {
    var dragging = false, off = { x: 0, y: 0 }, pid = null;
    el.addEventListener('pointerdown', function (e) {
      unlockAudio();
      dragging = true; pid = e.pointerId;
      try { el.setPointerCapture(pid); } catch (err) {}
      // pick it up at full size
      var p = toRoom(e), cur = toySize(t);
      var rx = (p.x - t.x) / cur[0], ry = (p.y - t.y) / cur[1];
      t.s = 1;
      if (t.pal && t.sitting) { t.sitting = false; palImg(el, t); }
      var sz = toySize(t);
      t.x = p.x - rx * sz[0]; t.y = p.y - ry * sz[1];
      off.x = p.x - t.x; off.y = p.y - t.y;
      el.classList.remove('settling');
      el.classList.add('dragging');
      placeEl(el, t);
      el._bx = el._nx = t.x; el._by = el._ny = t.y;
      moveBy(el, 1.1);
      if (!toySound(t.id)) sfx.tap();
    });
    var lastE = null, edgeTimer = null;
    function follow() {
      var p = toRoom(lastE), sz = toySize(t);
      t.x = Math.max(0, Math.min(ROOM_W - sz[0], p.x - off.x));
      t.y = Math.max(110, Math.min(H - sz[1], p.y - off.y));
      el._nx = t.x; el._ny = t.y;
      moveBy(el, 1.1);
    }
    // holding a toy near the side of the screen slides the room along
    function edgeSlide() {
      if (!dragging || !lastE) { edgeTimer = null; return; }
      var sx = toStage(lastE).x, v = sx > W - 120 ? 14 : sx < 120 ? -14 : 0;
      if (v) { roomScroller.scrollLeft += v; follow(); }
      edgeTimer = requestAnimationFrame(edgeSlide);
    }
    el.addEventListener('pointermove', function (e) {
      if (!dragging || e.pointerId !== pid) return;
      lastE = { clientX: e.clientX, clientY: e.clientY };
      follow();
      if (!edgeTimer) edgeTimer = requestAnimationFrame(edgeSlide);
    });
    function up(e) {
      if (!dragging || e.pointerId !== pid) return;
      dragging = false; lastE = null;
      commitMove(el);
      settle(t);
      if (t.pal) palImg(el, t);
      el.classList.add('settling');
      placeEl(el, t);
      sfx.pop();
      store();
    }
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  /* ---------- grown-up reset: hold the start-screen banner for 5 seconds ---------- */
  (function () {
    var b = document.querySelector('#start .banner'), t = null;
    b.style.pointerEvents = 'auto';
    b.addEventListener('pointerdown', function () {
      t = setTimeout(function () { save = { toys: [] }; store(); played = {}; try { localStorage.removeItem(PLAYED_KEY); } catch (e) {} sfx.boing(); }, 5000);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      b.addEventListener(ev, function () { clearTimeout(t); });
    });
  })();

  /* ---------- works offline once loaded (home-screen app) ---------- */
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    try { navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {}
  }

  /* ---------- the game picker inside every house ----------
     Three big cream cushions in a row along the bottom, one game sitting on each.
     They take turns doing a little hop so she knows they're for tapping.
     A gold star sticks to the cushion once she has finished that game. */
  var PLAYED_KEY = SAVE_KEY + '-played';
  var played = {};
  try { played = JSON.parse(localStorage.getItem(PLAYED_KEY)) || {}; } catch (e) {}
  function markPlayed(house, game) {
    played[house] = played[house] || {}; played[house][game] = true;
    try { localStorage.setItem(PLAYED_KEY, JSON.stringify(played)); } catch (e) {}
  }
  // picks: [{id, img, h}] (h = how tall the game's picture sits on its cushion)
  function gamePicker(layer, house, picks, onPick) {
    var xs = [260, 683, 1106];
    picks.forEach(function (p, i) {
      var b = document.createElement('button');
      b.className = 'pick-cushion';
      b.style.left = (xs[i] - 175) + 'px';
      b.style.animationDelay = (i * 1.2) + 's';
      b.setAttribute('aria-label', p.id);
      b.innerHTML = '<img class="pc-cushion" src="art/prize-cushion.webp" alt="">' +
        '<img class="pc-game" src="art/' + p.img + '.webp" alt="" style="height:' + (p.h || 230) + 'px">' +
        (played[house] && played[house][p.id] ? '<img class="pc-star" src="art/gold-star.webp" alt="">' : '');
      b.addEventListener('click', function () { onPick(p.id); });
      layer.appendChild(b);
    });
  }

  /* ---------- shared with the other game files (js/jeffrey.js) ---------- */
  window.StuffieTown = {
    W: W, H: H, go: go, enter: enter, say: say, sfx: sfx, sparks: sparks,
    toStage: toStage, unlockAudio: unlockAudio, shuffle: shuffle,
    gamePicker: gamePicker, markPlayed: markPlayed
  };

  go('start');
})();
