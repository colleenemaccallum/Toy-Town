/* Stuffie Town — Maddie's dress-up screen.
   Tap Maddie on the start screen to open it. Maddie stands big on the left;
   on the right, four shelves hold bows, tops, skirts and shoes. Tap a piece and
   she puts it on. Her look is saved on the iPad and shows on the start screen
   and in the playroom.

   ART RULE: every picture is ChatGPT felt art. Nothing is drawn here.
   Layers: one plain Maddie (art/dress-base.webp) plus one picture per piece
   (art/dress-<id>.webp), all the SAME size with see-through backgrounds, drawn
   from Maddie's reference sheet so they line up when stacked. Sitting versions
   (art/dress-base-sit.webp, art/dress-<id>-sit.webp) let her sit in the playroom
   while dressed up; until they exist she stays standing when dressed up.
   Missing pictures are simply left out. The dress-up screen (and tapping
   Maddie) only turns on once the room, plain Maddie and her usual outfit exist. */
(function () {
  'use strict';
  var ST = window.StuffieTown;
  if (!ST) return;

  // Layer order, bottom to top. The skirt goes over the top's hem, the bow over her hair.
  var PARTS = ['shoes', 'top', 'skirt', 'bow'];
  // Her usual outfit (from the reference sheet) is the first piece of each part.
  // nudge (optional) = [x %, y %, scale] to line a piece up if ChatGPT drew it a touch off.
  var ITEMS = [
    { id: 'bow-pink',         part: 'bow' },     // usual
    { id: 'bow-purple',       part: 'bow' },
    { id: 'bow-yellow',       part: 'bow' },
    { id: 'bow-flower',       part: 'bow' },
    { id: 'top-purple-heart', part: 'top' },     // usual
    { id: 'top-pink-star',    part: 'top' },
    { id: 'top-yellow-sun',   part: 'top' },
    { id: 'top-white-rainbow', part: 'top' },
    { id: 'skirt-pink-dots',  part: 'skirt' },   // usual
    { id: 'skirt-purple-tutu', part: 'skirt' },
    { id: 'skirt-yellow-ruffle', part: 'skirt' },
    { id: 'skirt-rainbow',    part: 'skirt' },
    { id: 'shoes-yellow',     part: 'shoes' },   // usual
    { id: 'shoes-pink-ballet', part: 'shoes' },
    { id: 'shoes-purple-boots', part: 'shoes' },
    { id: 'shoes-pink-sparkle', part: 'shoes' }
  ];
  var USUAL = {};
  PARTS.forEach(function (p) { USUAL[p] = ITEMS.filter(function (i) { return i.part === p; })[0].id; });
  var byId = {};
  ITEMS.forEach(function (i) { byId[i.id] = i; });

  /* ---------- her saved look ---------- */
  var KEY = 'stuffie-town-v2-outfit';
  var outfit = {};
  try { outfit = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  PARTS.forEach(function (p) { if (!byId[outfit[p]]) outfit[p] = USUAL[p]; });
  function storeOutfit() { try { localStorage.setItem(KEY, JSON.stringify(outfit)); } catch (e) {} }
  function isUsual() { return PARTS.every(function (p) { return outfit[p] === USUAL[p]; }); }

  /* ---------- which pictures exist ---------- */
  var have = {};       // src -> Image once loaded
  var waiting = 0;
  function probe(src) {
    waiting++;
    var im = new Image();
    im.onload = function () { have[src] = im; waiting--; changed(); };
    im.onerror = function () { waiting--; changed(); };
    im.src = src;
  }
  function art(id, sit) { return 'art/dress-' + id + (sit ? '-sit' : '') + '.webp'; }
  var BG = 'art/bg-dressup.webp';
  probe(BG);
  probe(art('base')); probe(art('base', true));
  ITEMS.forEach(function (i) { probe(art(i.id)); probe(art(i.id, true)); });

  function ready() {
    return !!(have[BG] && have[art('base')]) &&
      PARTS.every(function (p) { return have[art(USUAL[p])]; });
  }
  // the stack of pictures for her current look ([] if any piece is missing)
  function layers(sit) {
    var list = [art('base', sit)].concat(PARTS.map(function (p) { return art(outfit[p], sit); }));
    return list.every(function (s) { return have[s]; }) ? list : null;
  }
  function ratio(sit) {
    var b = have[art('base', sit)] || have[art('base')];
    return b ? b.naturalWidth / b.naturalHeight : .6;
  }
  function nudgeStyle(id) {
    var n = byId[id] && byId[id].nudge;
    return n ? ' style="transform:translate(' + n[0] + '%,' + n[1] + '%) scale(' + (n[2] || 1) + ')"' : '';
  }
  function stackHTML(sit) {
    var list = layers(sit);
    if (!list) return '';
    return list.map(function (s, k) {
      var id = k ? outfit[PARTS[k - 1]] : 'base';
      return '<img class="dz-layer dz-' + (k ? PARTS[k - 1] : 'base') + '" src="' + s + '" alt=""' + nudgeStyle(id) + '>';
    }).join('');
  }

  // For the playroom (js/game.js): only used once she's wearing something new.
  ST.maddieDress = {
    dressed: function () { return ready() && !isUsual() && !!layers(false); },
    canSit: function () { return !!layers(true); },
    html: stackHTML,
    ratio: ratio
  };

  /* ---------- start screen: tap Maddie to dress her up ---------- */
  var startImg = document.getElementById('start-maddie');
  var startStack = document.createElement('div');
  startStack.id = 'start-maddie-dressed';
  startStack.className = 'char bob delay dz-stack';
  startStack.setAttribute('aria-label', 'Dress up Maddie');
  startStack.hidden = true;
  startImg.parentNode.insertBefore(startStack, startImg.nextSibling);
  var hooked = false;
  function refreshStart() {
    if (!ready()) return;
    if (!hooked) {
      hooked = true;
      [startImg, startStack].forEach(function (el) {
        el.classList.add('dz-open');
        el.addEventListener('click', openDressUp);
      });
    }
    var dressed = ST.maddieDress.dressed();
    startImg.hidden = dressed;
    startStack.hidden = !dressed;
    if (dressed) {
      startStack.innerHTML = stackHTML(false);
      startStack.style.width = (590 * ratio(false)) + 'px';
    }
  }
  function openDressUp() { ST.unlockAudio(); ST.sfx.pop(); ST.go('dressup'); }

  var prevStart = ST.enter.start;
  ST.enter.start = function () { if (prevStart) prevStart(); refreshStart(); };

  /* ---------- the dress-up screen ---------- */
  var screen = document.getElementById('dressup');
  var bgImg = screen.querySelector('.bg');
  var doll = document.getElementById('dz-maddie');
  var shelves = document.getElementById('dz-shelves');
  // four shelves on the right, top to bottom (centre y of each row)
  var ROWS = { bow: 190, top: 400, skirt: 610, shoes: 820 };
  var ROW_X = 770, ITEM_W = 130, ITEM_H = 160, GAP = 14;
  var DOLL_H = 860;

  function showDoll(pop) {
    doll.innerHTML = stackHTML(false);
    doll.style.width = (DOLL_H * ratio(false)) + 'px';
    if (pop) {
      var l = doll.querySelector('.dz-' + pop);
      if (l) { l.classList.remove('dz-pop'); void l.offsetWidth; l.classList.add('dz-pop'); }
    }
  }

  // Shelf pieces are the same pictures, trimmed to the piece itself so they sit nicely on a shelf.
  function trimmed(im) {
    var c = document.createElement('canvas');
    try {
      var w = im.naturalWidth, h = im.naturalHeight, t = document.createElement('canvas');
      t.width = w; t.height = h;
      var x = t.getContext('2d'); x.drawImage(im, 0, 0);
      var d = x.getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = 0, y1 = 0;
      for (var y = 0; y < h; y += 2) for (var i = 0; i < w; i += 2) {
        if (d[(y * w + i) * 4 + 3] > 20) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (x1 <= x0 || y1 <= y0) throw 0;
      c.width = x1 - x0 + 2; c.height = y1 - y0 + 2;
      c.getContext('2d').drawImage(im, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
      return c;
    } catch (e) {
      var copy = new Image(); copy.src = im.src; return copy;
    }
  }

  var built = false;
  function buildShelves() {
    shelves.innerHTML = '';
    PARTS.forEach(function (p) {
      var list = ITEMS.filter(function (i) { return i.part === p && have[art(i.id)]; });
      list.forEach(function (it, k) {
        var b = document.createElement('button');
        b.className = 'dz-item';
        b.setAttribute('aria-label', it.id);
        b.style.left = (ROW_X + k * (ITEM_W + GAP)) + 'px';
        b.style.top = (ROWS[p] - ITEM_H / 2) + 'px';
        b.style.width = ITEM_W + 'px'; b.style.height = ITEM_H + 'px';
        b.style.animationDelay = (k * .3) + 's';
        b.appendChild(trimmed(have[art(it.id)]));
        b._id = it.id;
        b.addEventListener('click', function () { wear(it, b); });
        shelves.appendChild(b);
      });
    });
    built = true;
    markWorn();
  }
  function markWorn() {
    shelves.querySelectorAll('.dz-item').forEach(function (b) {
      b.classList.toggle('worn', outfit[byId[b._id].part] === b._id);
    });
  }

  /* ---------- soft sounds: a little cloth swish and one low gentle note per part ---------- */
  var ac = null;
  function audio() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  var NOTE = { bow: 523, top: 440, skirt: 392, shoes: 330 };
  function swish(part) {
    var a = audio(); if (!a) return;
    var t = a.currentTime;
    // swish: soft filtered noise
    var buf = a.createBuffer(1, a.sampleRate * .4, a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(1000, t + .35);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.05, t + .12); g.gain.exponentialRampToValueAtTime(.0001, t + .38);
    src.connect(f); f.connect(g); g.connect(a.destination); src.start(t); src.stop(t + .4);
    // gentle note
    var o = a.createOscillator(), og = a.createGain();
    o.type = 'sine'; o.frequency.value = NOTE[part];
    og.gain.setValueAtTime(.0001, t + .15); og.gain.exponentialRampToValueAtTime(.07, t + .2); og.gain.exponentialRampToValueAtTime(.0001, t + .75);
    o.connect(og); og.connect(a.destination); o.start(t + .15); o.stop(t + .8);
  }

  function wear(it, b) {
    ST.unlockAudio();
    b.classList.remove('dz-wiggle'); void b.offsetWidth; b.classList.add('dz-wiggle');
    if (outfit[it.part] === it.id) { swish(it.part); return; }
    outfit[it.part] = it.id;
    storeOutfit();
    swish(it.part);
    showDoll(it.part);
    markWorn();
    var r = doll.getBoundingClientRect(), s = screen.getBoundingClientRect(), k = 1366 / s.width;
    var yFrac = { bow: .12, top: .42, skirt: .58, shoes: .92 }[it.part];
    ST.sparks((r.left - s.left + r.width / 2) * k, (r.top - s.top + r.height * yFrac) * k, 5);
  }

  ST.enter.dressup = function () {
    if (!ready()) { ST.go('start'); return; }
    if (!bgImg.getAttribute('src')) bgImg.src = BG;
    if (!built) buildShelves();
    showDoll();
    markWorn();
    ST.say('12-dress-up');
  };

  // as pictures arrive, turn things on
  function changed() {
    if (waiting) return;
    refreshStart();
  }
})();
