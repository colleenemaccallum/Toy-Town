/* Stuffie Town — Baby Bear's tidy-up, round 2: the shape shelf.
   Drag each felt shape onto the shelf spot with the same shape (circle, square, triangle, star).
   Colors are mixed on purpose, so the shape is the only clue.
   Baby Bear's house takes turns: color boxes one visit, shape shelf the next. */
(function () {
  'use strict';
  var ST = window.StuffieTown;
  if (!ST) return;
  var say = ST.say, sfx = ST.sfx;

  /* ---------- which Baby Bear game is next ---------- */
  var ROUND_KEY = 'stuffie-town-bear-round';
  function nextRound() {
    var n = 0;
    try { n = parseInt(localStorage.getItem(ROUND_KEY), 10) || 0; } catch (e) {}
    try { localStorage.setItem(ROUND_KEY, String(n + 1)); } catch (e) {}
    return n % 2 === 0 ? 'tidy' : 'shapes';
  }
  // turned on once the ChatGPT shape art is added
  ST.routes['baby-bear'] = nextRound;

  /* ---------- the shelf ---------- */
  var SHELF = { x: 400, y: 410, w: 900, h: 330 };
  // cubby centres inside the shelf picture (from tools/make-shape-art.py)
  var CUBBIES = [
    { shape: 'circle',   cx: 134, cy: 171 },
    { shape: 'square',   cx: 345, cy: 171 },
    { shape: 'triangle', cx: 555, cy: 171 },
    { shape: 'star',     cx: 766, cy: 171 }
  ];
  var BLOCKS = [
    { shape: 'circle',   color: 'pink' },
    { shape: 'circle',   color: 'blue' },
    { shape: 'square',   color: 'yellow' },
    { shape: 'square',   color: 'purple' },
    { shape: 'triangle', color: 'green' },
    { shape: 'triangle', color: 'pink' },
    { shape: 'star',     color: 'purple' },
    { shape: 'star',     color: 'yellow' }
  ];
  var SIZE = 150;      // a block on the floor
  var SMALL = 118;     // a block sitting on the shelf
  // spots on and around the rug (top-left corner of each block)
  var SPOTS = [
    [330, 770], [490, 840], [640, 760], [790, 845],
    [940, 770], [1090, 845], [1190, 755], [560, 870]
  ];

  var screen = document.getElementById('shapes');
  var shelfEl = document.getElementById('shelf');
  var blocksEl = document.getElementById('blocks');
  var bear = document.getElementById('shapes-bear');
  shelfEl.style.left = SHELF.x + 'px'; shelfEl.style.top = SHELF.y + 'px';
  shelfEl.style.width = SHELF.w + 'px'; shelfEl.style.height = SHELF.h + 'px';

  CUBBIES.forEach(function (c) {
    c.x = SHELF.x + c.cx; c.y = SHELF.y + c.cy; // stage centre
    var d = document.createElement('div');
    d.className = 'cubby';
    d.style.left = (c.cx - 95) + 'px'; d.style.top = (c.cy - 125) + 'px';
    shelfEl.appendChild(d);
    c.el = d;
  });

  var left = 0, idleTimer = null;

  function src(b) { return 'art/shape-' + b.shape + '-' + b.color + '.webp'; }

  function point(c) {
    // Baby Bear "taps" the right spot: it glows and bounces
    c.el.classList.remove('glow'); void c.el.offsetWidth; c.el.classList.add('glow');
  }

  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      if (ST.current() !== 'shapes' || !left) return;
      var t = blocksEl.querySelector('.toy:not(.gone)');
      if (t) {
        t.classList.remove('hint'); void t.offsetWidth; t.classList.add('hint');
        point(cubbyFor(t._block.shape));
      }
      say('15-shape-hint');
      resetIdle();
    }, 12000);
  }

  function cubbyFor(shape) {
    for (var i = 0; i < CUBBIES.length; i++) if (CUBBIES[i].shape === shape) return CUBBIES[i];
  }

  function cubbyUnder(p) {
    for (var i = 0; i < CUBBIES.length; i++) {
      var c = CUBBIES[i];
      // generous target: the whole cubby plus a little room around it
      if (Math.abs(p.x - c.x) < 120 && p.y > c.y - 170 && p.y < c.y + 200) return c;
    }
    return null;
  }

  function start() {
    blocksEl.innerHTML = '';
    shelfEl.querySelectorAll('.on-shelf').forEach(function (e) { e.remove(); });
    CUBBIES.forEach(function (c) { c.count = 0; });
    bear.src = 'art/baby-bear-wave.webp';
    var spots = ST.shuffle(SPOTS.slice());
    var blocks = ST.shuffle(BLOCKS.slice());
    left = blocks.length;
    blocks.forEach(function (b, i) {
      var d = document.createElement('div');
      d.className = 'toy';
      d.style.width = SIZE + 'px'; d.style.height = SIZE + 'px';
      d.innerHTML = '<img src="' + src(b) + '" alt="' + b.color + ' ' + b.shape + '">';
      d.style.left = spots[i][0] + 'px'; d.style.top = spots[i][1] + 'px';
      d.style.rotate = (Math.random() * 16 - 8).toFixed(1) + 'deg';
      d.dataset.home = spots[i].join(',');
      d._block = b;
      drag(d, b);
      blocksEl.appendChild(d);
    });
    resetIdle();
  }

  function drag(el, b) {
    var dragging = false, off = { x: 0, y: 0 }, pid = null;
    el.addEventListener('pointerdown', function (e) {
      if (dragging) return;
      ST.unlockAudio();
      dragging = true; pid = e.pointerId;
      try { el.setPointerCapture(pid); } catch (err) {}
      var p = ST.toStage(e);
      off.x = p.x - parseFloat(el.style.left); off.y = p.y - parseFloat(el.style.top);
      el.classList.add('dragging'); el.classList.remove('hint');
      sfx.tap(); resetIdle();
    });
    el.addEventListener('pointermove', function (e) {
      if (!dragging || e.pointerId !== pid) return;
      var p = ST.toStage(e);
      el.style.left = Math.max(-30, Math.min(ST.W - 120, p.x - off.x)) + 'px';
      el.style.top = Math.max(-30, Math.min(ST.H - 120, p.y - off.y)) + 'px';
    });
    function drop(e) {
      if (!dragging || e.pointerId !== pid) return;
      dragging = false;
      el.classList.remove('dragging');
      var p = { x: parseFloat(el.style.left) + SIZE / 2, y: parseFloat(el.style.top) + SIZE / 2 };
      var c = cubbyUnder(p);
      if (c && c.shape === b.shape) putAway(el, b, c);
      else {
        var home = el.dataset.home.split(',');
        el.style.left = home[0] + 'px'; el.style.top = home[1] + 'px';
        if (c) {
          // a gentle wobble, and Baby Bear shows the right spot
          sfx.boing(); say('14-shape-try-again');
          el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle');
          point(cubbyFor(b.shape));
        }
      }
      resetIdle();
    }
    el.addEventListener('pointerup', drop);
    el.addEventListener('pointercancel', drop);
  }

  function putAway(el, b, c) {
    el.classList.add('gone');
    var img = document.createElement('img');
    img.className = 'on-shelf';
    img.src = src(b);
    // two blocks share a cubby: the first sits up-left, the second down-right
    var dx = c.count ? 14 : -14, dy = c.count ? 30 : -38;
    img.style.width = SMALL + 'px'; img.style.height = SMALL + 'px';
    img.style.left = (c.cx - SMALL / 2 + dx) + 'px';
    img.style.top = (c.cy - SMALL / 2 + dy) + 'px';
    shelfEl.appendChild(img);
    c.count++;
    c.el.classList.remove('glow');
    shelfEl.classList.remove('happy'); void shelfEl.offsetWidth; shelfEl.classList.add('happy');
    sfx.pop(); ST.sparks(c.x, c.y, 7);
    bear.src = 'art/baby-bear-cheer.webp';
    bear.classList.remove('cheer-on'); void bear.offsetWidth; bear.classList.add('cheer-on');
    clearTimeout(bear._t);
    bear._t = setTimeout(function () { if (left) bear.src = 'art/baby-bear-wave.webp'; }, 1100);
    left--;
    if (left === 0) {
      clearTimeout(idleTimer);
      setTimeout(function () {
        sfx.tada(); say('07-all-done');
        ST.sparks(683, 400, 12); ST.sparks(300, 600, 9); ST.sparks(1060, 600, 9);
      }, 450);
      setTimeout(function () { ST.go('prize'); }, 2600);
    } else {
      // the narrator names the shape: "Circle!", "Square!", "Triangle!", "Star!"
      say('13-' + b.shape);
    }
  }

  ST.enter.shapes = function () { start(); say('12-shapes-intro'); };
})();
