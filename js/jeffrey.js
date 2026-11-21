/* Stuffie Town — Jeffrey's music corner (counting games).
   Jeffrey's room shows three games to pick from:
     band  = Fill the band stage: the number card shows how many players Jeffrey needs; drag that many onto the stage.
     drum  = Copy Jeffrey's drum: Jeffrey taps his drum 1-5 times; tap the big drum the same number of times.
     count = How many are playing?: count the players on the stage and tap the card with that number.
   Each game is 3 short rounds, then the cheer + pick-a-toy screen. Nobody ever loses.
   All art is ChatGPT felt art (art/jeffrey-*, art/band-*, art/number-card-*). */
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

  /* ---------- instrument sounds, made right here with Web Audio ----------
     Each mouse plays its own instrument. Nothing is recorded or downloaded, so the
     sounds are ours to keep, share or sell. */
  var ac = null;
  function audio() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function out(vol) { var g = ac.createGain(); g.gain.value = vol; g.connect(ac.destination); return g; }
  function noiseBuf(sec) {
    var b = ac.createBuffer(1, Math.floor(ac.sampleRate * sec), ac.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function hiss(t, dur, type, freq, q, vol, attack) { // filtered noise burst
    var s = ac.createBufferSource(); s.buffer = noiseBuf(dur + .05);
    var f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    var g = ac.createGain(); env(g, t, attack || .004, vol, dur);
    s.connect(f); f.connect(g); g.connect(out(1)); s.start(t); s.stop(t + dur + .05);
  }
  var SOUND = {
    drum: function (t) { // a soft round "boom" with a little stick tap
      var o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(55, t + .3);
      env(g, t, .005, .9, .45); o.connect(g); g.connect(out(.8)); o.start(t); o.stop(t + .5);
      hiss(t, .05, 'bandpass', 2500, 1, .25);
    },
    trumpet: function (t) { // "toot-too!" brassy notes with a little wobble
      [[523, 0, .16], [659, .2, .34]].forEach(function (n) {
        var o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), v = ac.createOscillator(), vg = ac.createGain();
        o.type = 'sawtooth'; o.frequency.value = n[0];
        v.frequency.value = 6; vg.gain.value = 6; v.connect(vg); vg.connect(o.frequency);
        f.type = 'lowpass'; f.frequency.setValueAtTime(900, t + n[1]); f.frequency.linearRampToValueAtTime(2600, t + n[1] + .06); f.Q.value = 2;
        env(g, t + n[1], .03, .35, n[2]);
        o.connect(f); f.connect(g); g.connect(out(.6));
        o.start(t + n[1]); v.start(t + n[1]); o.stop(t + n[1] + n[2] + .05); v.stop(t + n[1] + n[2] + .05);
      });
    },
    guitar: function (t) { // a gentle strum: plucked strings, one after another
      [196, 247, 294, 392].forEach(function (hz, i) {
        var start = t + i * .035, len = 1.2, sr = ac.sampleRate;
        var b = ac.createBuffer(1, Math.floor(sr * len), sr), d = b.getChannelData(0);
        var p = Math.round(sr / hz), ring = new Float32Array(p);
        for (var k = 0; k < p; k++) ring[k] = Math.random() * 2 - 1;
        for (var j = 0, idx = 0; j < d.length; j++) { // Karplus-Strong pluck
          var nx = (idx + 1) % p; d[j] = ring[idx]; ring[idx] = .497 * (ring[idx] + ring[nx]); idx = nx;
        }
        var s = ac.createBufferSource(); s.buffer = b;
        var g = ac.createGain(); env(g, start, .005, .5, len);
        s.connect(g); g.connect(out(.7)); s.start(start); s.stop(start + len);
      });
    },
    tambourine: function (t) { // shake-shake-jingle
      [0, .12, .24].forEach(function (d, i) {
        hiss(t + d, i === 2 ? .35 : .12, 'highpass', 6500, .8, i === 2 ? .5 : .35, .003);
        [3100, 4400].forEach(function (hz) { // little metal jingles
          var o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = hz + Math.random() * 200;
          env(g, t + d, .002, .06, .18); o.connect(g); g.connect(out(1)); o.start(t + d); o.stop(t + d + .2);
        });
      });
    },
    maracas: function (t) { // ch-ch, ch-ch
      [0, .14, .32, .46].forEach(function (d) { hiss(t + d, .09, 'bandpass', 5200, 1.2, .45, .012); });
    }
  };
  function playerSound(id, delay) {
    if (audio()) SOUND[id](ac.currentTime + (delay || 0) + .01);
    playerMoves(id, delay);
  }
  // the mouse holding that instrument moves in time with its sound
  // (drum: bang, trumpet: toot back, guitar: strum rock, tambourine: shake, maracas: shake-shake)
  function playerMoves(id, delay) {
    later(function () {
      layer.querySelectorAll('.jf-player:not(.waiting) img').forEach(function (img) {
        if (img.getAttribute('src').indexOf('band-' + id + '.') < 0) return;
        img.classList.remove('play-' + id); void img.offsetWidth; img.classList.add('play-' + id);
        img.addEventListener('animationend', function done() { img.classList.remove('play-' + id); img.removeEventListener('animationend', done); });
      });
    }, (delay || 0) * 1000 + 10);
  }
  function drum() { playerSound('drum'); }
  function bandPlays(ids) { // everyone on the stage plays together, twice round
    ids.forEach(function (id, i) { playerSound(id, i * .45); playerSound(id, ids.length * .45 + .3 + i * .2); });
    later(sfx.tada, (ids.length * .65 + .6) * 1000);
  }

  /* ---------- the picker: three big felt pictures on the stage ---------- */
  var PICKS = [
    { id: 'band',  img: 'band-drum',    x: 250, w: 220 },
    { id: 'drum',  img: 'big-drum',     x: 520, w: 260 },
    { id: 'count', img: 'number-card-3',  x: 820, w: 200 }
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
      b.addEventListener('click', function () { ST.unlockAudio(); audio(); sfx.pop(); start(p.id); });
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
    card.innerHTML = '<img src="art/number-card-' + n + '.webp" alt="' + n + '">';
    bounce(card, 'pop-in');
    var onStage = 0, free = STAGE.slice(), placed = [];
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
          placed.push(id); playerSound(id); ST.sparks(s[0], s[1] - 100, 5);
          say('num-' + onStage); // the narrator counts along: "one", "two", ...
          if (onStage === n) {
            later(function () {
              layer.querySelectorAll('.jf-player:not(.waiting)').forEach(function (e) { e.classList.add('playing'); });
              bandPlays(placed); say('18-band-yes');
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

  // tap a mouse that is already on the stage: it plays its instrument again
  layer.addEventListener('pointerdown', function (e) {
    var m = e.target.closest && e.target.closest('.jf-player');
    if (!m || m.classList.contains('waiting')) return;
    var img = m.querySelector('img'), hit = /band-(\w+)\./.exec(img.getAttribute('src'));
    if (!hit) return;
    ST.unlockAudio(); audio(); playerSound(hit[1]);
  });
  function dragPlayer(m, onDrop) {
    var dragging = false, off = { x: 0, y: 0 }, pid = null;
    m.addEventListener('pointerdown', function (e) {
      if (dragging || m.locked || busy) return;
      ST.unlockAudio(); audio(); dragging = true; pid = e.pointerId;
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
      ST.unlockAudio(); audio(); drum(); bounce(big, 'hit'); note(680, 560);
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
    later(function () { bandPlays(ids.slice(0, n)); }, 400);
    // three answer cards: the right one and two neighbours
    var choices = [n];
    var others = shuffle([1, 2, 3, 4, 5].filter(function (v) { return v !== n; }))
      .sort(function (a, b) { return Math.abs(a - n) - Math.abs(b - n); }).slice(0, 2);
    choices = shuffle(choices.concat(others));
    choices.forEach(function (v, i) {
      var c = el('button', 'jf-card');
      c.style.left = (430 + i * 200) + 'px';
      c.innerHTML = '<img src="art/number-card-' + v + '.webp" alt="' + v + '">';
      c.addEventListener('click', function () {
        if (busy) return;
        ST.unlockAudio(); audio();
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
