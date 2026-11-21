/* Stuffie Town — Jeffrey's music corner (counting games).
   Jeffrey's room shows three games to pick from:
     band  = Fill the band stage: the star card shows how many players Jeffrey needs; drag that many onto the stage.
     drum  = Copy Jeffrey's drum: Jeffrey taps his drum 1-5 times; tap the big drum the same number of times.
     count = How many are playing?: count the players on the stage and tap the star card with the same number.
   Each game is 3 short rounds, then the cheer + pick-a-toy screen. Nobody ever loses.
   All art is ChatGPT felt art (art/jeffrey-*, art/band-*, art/star-card-*). */
(function () {
  'use strict';
  var ST = window.StuffieTown;
  if (!ST) return;
  var say = ST.say, sfx = ST.sfx, shuffle = ST.shuffle;

  var layer = document.getElementById('jf-layer');
  var jeff = document.getElementById('jf-jeffrey');
  var PLAYERS = ['drum', 'trumpet', 'guitar', 'tambourine', 'maracas'];
  // where players stand on the stage: [centre x, feet y]
  var STAGE = [[330, 800], [505, 830], [680, 800], [855, 830], [1030, 800]];
  var game = null, round = 0, rounds = [], busy = false, timers = [];

  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearLater() { timers.forEach(clearTimeout); timers = []; }
  function el(tag, cls, html) { var d = document.createElement(tag); if (cls) d.className = cls; if (html) d.innerHTML = html; layer.appendChild(d); return d; }
  function bounce(e, cls) { e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls); }
  function pose(name) { jeff.src = 'art/jeffrey-' + name + '.webp'; jeff.className = 'char jf-' + name; }
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  /* ---------- little music made with Web Audio (no recordings needed) ---------- */
  var NOTE = { drum: 196, trumpet: 523, guitar: 330, tambourine: 784, maracas: 659 };
  function drum() { sfx.drum(); }
  function playerSound(id) { sfx.note(NOTE[id]); }
  function bandPlays(n) {
    var ids = PLAYERS.slice(0, n);
    for (var i = 0; i < n * 2; i++) later((function (k) { return function () { sfx.note(NOTE[ids[k % n]]); }; })(i), i * 180);
    later(sfx.tada, n * 360 + 100);
  }

  /* ---------- the picker: three big felt pictures on the stage ---------- */
  var PICKS = [
    { id: 'band',  img: 'band-drum',    x: 250, w: 220 },
    { id: 'drum',  img: 'big-drum',     x: 520, w: 260 },
    { id: 'count', img: 'star-card-3',  x: 820, w: 200 }
  ];
  function showPicker() {
    clearLater(); layer.innerHTML = ''; game = null; busy = false;
    pose('wave');
    PICKS.forEach(function (p, i) {
      var b = el('button', 'jf-pick');
      b.style.left = p.x + 'px'; b.style.width = p.w + 'px';
      b.style.animationDelay = (i * .35) + 's';
      b.setAttribute('aria-label', p.id);
      b.innerHTML = '<img src="art/' + p.img + '.webp" alt="">';
      b.addEventListener('click', function () { ST.unlockAudio(); sfx.pop(); start(p.id); });
    });
    say('16-jeffrey-pick');
  }

  function start(id) {
    game = id; round = 0;
    // three rounds, each a different number, a little bigger as she goes
    rounds = shuffle([[1, 2, 3], [2, 3, 4], [2, 3, 5], [2, 4, 5], [3, 4, 5]])[0];
    next();
  }

  function next() {
    clearLater(); layer.innerHTML = ''; busy = false;
    if (round >= rounds.length) return finish();
    var n = rounds[round++];
    if (game === 'band') bandRound(n);
    else if (game === 'drum') drumRound(n);
    else countRound(n);
  }

  function roundWon(x, y) {
    busy = true;
    pose('cheer'); bounce(jeff, 'cheer-on');
    ST.sparks(x || 683, y || 600, 10);
    later(function () { pose(game === 'drum' ? 'drum' : 'wave'); next(); }, 2300);
  }

  function finish() {
    pose('cheer');
    sfx.tada(); say('07-all-done');
    ST.sparks(683, 400, 12); ST.sparks(300, 600, 9); ST.sparks(1060, 600, 9);
    later(function () { showPrizeHost(); ST.go('prize'); }, 2400);
  }

  /* ---------- game 1: fill the band stage ---------- */
  function bandRound(n) {
    pose('wave');
    var card = el('div', 'jf-target');
    card.innerHTML = '<img src="art/star-card-' + n + '.webp" alt="' + n + ' stars">';
    bounce(card, 'pop-in');
    var onStage = 0, free = STAGE.slice();
    var waiting = shuffle(PLAYERS.slice());
    waiting.forEach(function (id, i) {
      var m = el('div', 'jf-player waiting');
      m.style.animationDelay = (i * .2) + 's';
      m.innerHTML = '<img src="art/band-' + id + '.webp" alt="' + id + ' player">';
      // waiting at the back of the room: two left of the window, three right of it
      var hx = [20, 135, 250, 1010, 1130][i];
      m.dataset.home = hx + ',455';
      m.style.left = hx + 'px'; m.style.top = '455px';
      dragPlayer(m, function (p) {
        // dropped: on the stage?
        if (p.y > 560 && p.x > 180 && p.x < 1180 && free.length) {
          if (onStage >= n) { // one too many: hop back
            sfx.boing(); say('17-band-enough'); bounce(card, 'wiggle'); return false;
          }
          // nearest free spot
          free.sort(function (s1, s2) { return Math.abs(s1[0] - p.x) - Math.abs(s2[0] - p.x); });
          var s = free.shift();
          m.classList.remove('waiting');
          m.style.left = (s[0] - 75) + 'px'; m.style.top = (s[1] - 200) + 'px';
          m.locked = true;
          onStage++;
          playerSound(id); ST.sparks(s[0], s[1] - 100, 5);
          say('num-' + onStage); // the narrator counts along: "one", "two", ...
          if (onStage === n) {
            later(function () {
              layer.querySelectorAll('.jf-player:not(.waiting)').forEach(function (e) { e.classList.add('playing'); });
              bandPlays(n); say('18-band-yes');
              roundWon(680, 600);
            }, 700);
          }
          return true;
        }
        return false;
      });
    });
    later(function () { say('19-band-ask-' + n); }, 400);
  }

  function dragPlayer(m, onDrop) {
    var dragging = false, off = { x: 0, y: 0 }, pid = null;
    m.addEventListener('pointerdown', function (e) {
      if (dragging || m.locked || busy) return;
      ST.unlockAudio(); dragging = true; pid = e.pointerId;
      try { m.setPointerCapture(pid); } catch (err) {}
      var p = ST.toStage(e);
      off.x = p.x - parseFloat(m.style.left); off.y = p.y - parseFloat(m.style.top);
      m.classList.add('dragging'); sfx.tap();
    });
    m.addEventListener('pointermove', function (e) {
      if (!dragging || e.pointerId !== pid) return;
      var p = ST.toStage(e);
      m.style.left = Math.max(-40, Math.min(ST.W - 110, p.x - off.x)) + 'px';
      m.style.top = Math.max(-40, Math.min(ST.H - 160, p.y - off.y)) + 'px';
    });
    function up(e) {
      if (!dragging || e.pointerId !== pid) return;
      dragging = false; m.classList.remove('dragging');
      var p = { x: parseFloat(m.style.left) + 75, y: parseFloat(m.style.top) + 200 };
      if (!onDrop(p)) {
        var h = m.dataset.home.split(',');
        m.style.left = h[0] + 'px'; m.style.top = h[1] + 'px';
      }
    }
    m.addEventListener('pointerup', up);
    m.addEventListener('pointercancel', up);
  }

  /* ---------- game 2: copy Jeffrey's drum ---------- */
  function drumRound(n) {
    pose('drum');
    busy = true;
    var row = el('div', 'jf-row');
    var stars = [];
    for (var i = 0; i < n; i++) { var s = document.createElement('img'); s.src = 'art/gold-star.webp'; s.className = 'dim'; row.appendChild(s); stars.push(s); }
    var big = el('button', 'jf-bigdrum', '<img src="art/big-drum.webp" alt="drum">');
    var taps = 0, waitT = null;
    function jeffreyPlays() {
      busy = true; taps = 0;
      stars.forEach(function (s) { s.className = 'dim'; });
      say('20-drum-listen');
      for (var k = 0; k < n; k++) {
        later((function (k) {
          return function () { drum(); bounce(jeff, 'tap'); stars[k].className = 'lit'; note(1180, 380); };
        })(k), 1300 + k * 650);
      }
      later(function () {
        stars.forEach(function (s) { s.className = 'dim'; });
        busy = false; say('21-drum-your-turn'); bounce(big, 'glow');
      }, 1300 + n * 650 + 700);
    }
    big.addEventListener('click', function () {
      if (busy) return;
      ST.unlockAudio(); drum(); bounce(big, 'hit'); note(680, 560);
      taps++;
      if (taps <= n) stars[taps - 1].className = 'lit';
      clearTimeout(waitT);
      if (taps > n) { // too many: Jeffrey plays it again, no fuss
        busy = true; sfx.boing(); say('22-drum-again');
        later(jeffreyPlays, 1200);
        return;
      }
      waitT = later(function () {
        if (taps === n) { say('23-drum-yes'); roundWon(680, 500); }
        else { busy = true; say('22-drum-again'); later(jeffreyPlays, 1000); }
      }, taps === n ? 900 : 2600);
    });
    jeffreyPlays();
  }

  function note(x, y) {
    var s = document.createElement('div');
    s.className = 'jf-note';
    s.style.left = x + 'px'; s.style.top = y + 'px';
    s.style.backgroundImage = 'url(art/music-note-' + ['pink', 'purple', 'yellow', 'blue'][rnd(0, 3)] + '.webp)';
    document.getElementById('fx').appendChild(s);
    setTimeout(s.remove.bind(s), 1300);
  }

  /* ---------- game 3: how many are playing? ---------- */
  function countRound(n) {
    pose('wave');
    var spots = STAGE.slice(0, 5);
    // spread n players evenly-ish across the stage
    var pick = { 1: [2], 2: [1, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4] }[n];
    var ids = shuffle(PLAYERS.slice());
    var players = pick.map(function (si, i) {
      var m = el('div', 'jf-player playing hop-in');
      m.innerHTML = '<img src="art/band-' + ids[i] + '.webp" alt="">';
      m.style.left = (spots[si][0] - 75) + 'px'; m.style.top = (spots[si][1] - 230) + 'px';
      m.style.animationDelay = (i * .25) + 's';
      return m;
    });
    later(function () { bandPlays(n); }, 400);
    // three answer cards: the right one and two neighbours
    var choices = [n];
    var others = shuffle([1, 2, 3, 4, 5].filter(function (v) { return v !== n; }))
      .sort(function (a, b) { return Math.abs(a - n) - Math.abs(b - n); }).slice(0, 2);
    choices = shuffle(choices.concat(others));
    choices.forEach(function (v, i) {
      var c = el('button', 'jf-card');
      c.style.left = (430 + i * 200) + 'px';
      c.innerHTML = '<img src="art/star-card-' + v + '.webp" alt="' + v + ' stars">';
      c.addEventListener('click', function () {
        if (busy) return;
        ST.unlockAudio();
        if (v === n) {
          sfx.sparkle(); c.classList.add('right'); say('24-count-yes');
          roundWon(530 + i * 200, 880);
        } else {
          sfx.boing(); bounce(c, 'wiggle'); say('25-count-together');
          // count together: each player hops in turn
          busy = true;
          players.forEach(function (m, k) {
            later(function () { bounce(m, 'counted'); sfx.tap(); say('num-' + (k + 1)); }, 900 + k * 800);
          });
          later(function () { busy = false; }, 900 + players.length * 800);
        }
      });
    });
    later(function () { say('26-count-ask'); }, 900);
  }

  /* ---------- the cheer screen shows Jeffrey after his games ---------- */
  var prizeBg = document.querySelector('#prize .bg');
  var prizeChar = document.getElementById('prize-bear');
  var homeBg = prizeBg.getAttribute('src'), homeChar = prizeChar.getAttribute('src');
  function showPrizeHost() {
    prizeBg.src = 'art/bg-jeffrey-room.webp'; prizeChar.src = 'art/jeffrey-cheer.webp'; prizeChar.classList.add('jf-host');
  }
  var tidyEnter = ST.enter.tidy;
  ST.enter.tidy = function () {
    prizeBg.src = homeBg; prizeChar.src = homeChar; prizeChar.classList.remove('jf-host');
    if (tidyEnter) tidyEnter();
  };

  ST.enter.jeffrey = function () { showPicker(); };
  document.querySelector('#jeffrey .home').addEventListener('click', clearLater);
})();
