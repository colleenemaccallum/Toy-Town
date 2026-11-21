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
  var SAVE_KEY = 'stuffie-town-v1';
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
    sparkle: function () { [1319, 1568, 1760, 2093].forEach(function (f, i) { tone(f, i * .06, .2, 'sine', .1); }); }
  };

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
  document.getElementById('play-btn').addEventListener('click', function () {
    unlockAudio(); sfx.pop(); go('street');
  });
  enter.start = function () { say('01-welcome'); };

  /* ===== 2. STREET ===== */
  // Where each house sits on the wide street picture (fractions of its width / height).
  var HOUSES = [
    { id: 'baby-bear', x: .033, w: .106, open: 'baby-bear' }, // colors and shapes take turns (js/shapes.js)
    { id: 'jeffrey',   x: .165, w: .106 },
    { id: 'shelley',   x: .293, w: .143 },
    { id: 'playroom',  x: .462, w: .170, open: 'playroom' },
    { id: 'bart',      x: .654, w: .092 },
    { id: 'terry',     x: .762, w: .088 },
    { id: 'annie',     x: .869, w: .097 }
  ];
  // a house can pick its screen each visit (filled in by other files, e.g. js/shapes.js)
  var ROUTES = { 'baby-bear': function () { return 'tidy'; } };
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
      if (h.open) { sfx.pop(); go(ROUTES[h.open] ? ROUTES[h.open]() : h.open); }
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
    { color: 'red',    x: 438 },
    { color: 'blue',   x: 654 },
    { color: 'yellow', x: 870 },
    { color: 'green',  x: 1086 }
  ];
  var BOX_Y = 528;
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
    [370, 770], [520, 830], [660, 755], [800, 835],
    [940, 765], [1080, 830], [1200, 745], [450, 900]
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
    bear.src = 'art/baby-bear-wave.webp';
    var spots = shuffle(SPOTS.slice());
    left = TOYS.length;
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
      if (p.x > b.x - 30 && p.x < b.x + 240 && p.y > BOX_Y - 80 && p.y < BOX_Y + 250) return b;
    }
    return null;
  }

  function makeDraggable(el, toy) {
    var dragging = false, off = { x: 0, y: 0 }, pid = null;
    el.addEventListener('pointerdown', function (e) {
      if (dragging) return;
      unlockAudio();
      dragging = true; pid = e.pointerId;
      try { el.setPointerCapture(pid); } catch (err) {}
      var p = toStage(e);
      off.x = p.x - parseFloat(el.style.left); off.y = p.y - parseFloat(el.style.top);
      el.classList.add('dragging'); el.classList.remove('hint');
      sfx.tap(); resetIdle();
    });
    el.addEventListener('pointermove', function (e) {
      if (!dragging || e.pointerId !== pid) return;
      var p = toStage(e);
      el.style.left = Math.max(-30, Math.min(W - 100, p.x - off.x)) + 'px';
      el.style.top = Math.max(-30, Math.min(H - 100, p.y - off.y)) + 'px';
    });
    function drop(e) {
      if (!dragging || e.pointerId !== pid) return;
      dragging = false;
      el.classList.remove('dragging');
      var p = { x: parseFloat(el.style.left) + 65, y: parseFloat(el.style.top) + 65 };
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
    img.style.left = (34 + n * 66) + 'px';
    img.style.top = (n ? -6 : 4) + 'px';
    inside.appendChild(img);
    b.el.classList.remove('happy'); void b.el.offsetWidth; b.el.classList.add('happy');
    sfx.pop(); sparks(b.x + 105, BOX_Y + 60);
    bear.src = 'art/baby-bear-cheer.webp';
    bear.classList.remove('cheer-on'); void bear.offsetWidth; bear.classList.add('cheer-on');
    clearTimeout(bear._t);
    bear._t = setTimeout(function () { if (left) bear.src = 'art/baby-bear-wave.webp'; }, 1100);
    left--;
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
  var PRIZES = [
    { id: 'baby-doll',   h: 230 },
    { id: 'race-car',    h: 150 },
    { id: 'paint-easel', h: 220 }
  ];
  var prizesEl = document.getElementById('prizes');
  var confettiEl = document.getElementById('confetti');
  [[120, 60, -12], [1000, 40, 14], [520, 90, 4], [1120, 300, -8]].forEach(function (c, i) {
    var img = document.createElement('img');
    img.src = 'art/confetti.webp';
    img.style.left = c[0] + 'px'; img.style.top = c[1] + 'px';
    img.style.rotate = c[2] + 'deg';
    img.style.animationDelay = (i * .5) + 's';
    confettiEl.appendChild(img);
  });
  var picking = false;
  enter.prize = function () {
    picking = false;
    prizesEl.innerHTML = '';
    shuffle(PRIZES.slice()).forEach(function (p, i) {
      var c = document.createElement('div');
      c.className = 'cushion';
      c.style.left = (520 + i * 280) + 'px';
      c.style.top = '500px';
      // cushion first, toy second, so the toy sits ON the cushion
      c.innerHTML = '<img class="pad" src="art/prize-cushion.webp" alt="">' +
                    '<img class="gift" src="art/' + p.id + '.webp" alt="" style="height:' + p.h + 'px">';
      c.addEventListener('click', function () {
        if (picking) return;
        picking = true;
        unlockAudio(); sfx.sparkle();
        c.classList.add('picked');
        prizesEl.querySelectorAll('.cushion').forEach(function (o) { if (o !== c) o.classList.add('other'); });
        sparks(520 + i * 280 + 125, 600, 10);
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
  var ROOM_SIZE = { 'baby-doll': [120, 190], 'race-car': [190, 130], 'paint-easel': [180, 210] };
  // where new toys land (top-left corner), tried in order
  var ROOM_SPOTS = [
    [600, 640], [170, 180], [1080, 180], [800, 700], [450, 720], [330, 180], [930, 180], [700, 820]
  ];
  var roomEl = document.getElementById('room-toys');

  function freeSpot(i) { return ROOM_SPOTS[i % ROOM_SPOTS.length]; }

  enter.playroom = function () {
    roomEl.innerHTML = '';
    var anyNew = false;
    save.toys.forEach(function (t, i) {
      var sz = ROOM_SIZE[t.id] || [150, 150];
      if (t.x === null) { var s = freeSpot(i); t.x = s[0]; t.y = s[1] - (sz[1] - 130); }
      var d = document.createElement('div');
      d.className = 'room-toy' + (t.isNew ? ' new' : '');
      d.style.width = sz[0] + 'px'; d.style.height = sz[1] + 'px';
      d.style.left = t.x + 'px'; d.style.top = t.y + 'px';
      d.innerHTML = '<img src="art/' + t.id + '.webp" alt="">';
      if (t.isNew) {
        anyNew = true;
        setTimeout(function () { sparks(t.x + sz[0] / 2, t.y + sz[1] / 2, 9); sfx.sparkle(); }, 350);
        t.isNew = false;
      }
      roomDrag(d, t, sz);
      roomEl.appendChild(d);
    });
    store();
    say(anyNew ? '10-playroom-new' : '11-playroom');
  };

  function roomDrag(el, t, sz) {
    var dragging = false, off = { x: 0, y: 0 }, pid = null;
    el.addEventListener('pointerdown', function (e) {
      unlockAudio();
      dragging = true; pid = e.pointerId;
      try { el.setPointerCapture(pid); } catch (err) {}
      var p = toStage(e);
      off.x = p.x - t.x; off.y = p.y - t.y;
      el.classList.add('dragging'); sfx.tap();
    });
    el.addEventListener('pointermove', function (e) {
      if (!dragging || e.pointerId !== pid) return;
      var p = toStage(e);
      t.x = Math.max(0, Math.min(W - sz[0], p.x - off.x));
      t.y = Math.max(110, Math.min(H - sz[1], p.y - off.y));
      el.style.left = t.x + 'px'; el.style.top = t.y + 'px';
    });
    function up(e) {
      if (!dragging || e.pointerId !== pid) return;
      dragging = false; el.classList.remove('dragging'); store();
    }
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  /* ---------- grown-up reset: hold the start-screen banner for 5 seconds ---------- */
  (function () {
    var b = document.querySelector('#start .banner'), t = null;
    b.style.pointerEvents = 'auto';
    b.addEventListener('pointerdown', function () {
      t = setTimeout(function () { save = { toys: [] }; store(); sfx.boing(); }, 5000);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      b.addEventListener(ev, function () { clearTimeout(t); });
    });
  })();

  /* ---------- works offline once loaded (home-screen app) ---------- */
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    try { navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {}
  }

  /* ---------- shared with the other game files (js/shapes.js) ---------- */
  window.StuffieTown = {
    W: W, H: H, go: go, enter: enter, routes: ROUTES, say: say, sfx: sfx, sparks: sparks,
    toStage: toStage, unlockAudio: unlockAudio, shuffle: shuffle,
    current: function () { return current; }
  };

  go('start');
})();
