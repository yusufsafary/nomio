// Launch countdown, live stats and artwork marquee for nomio.uk.
// Read-only. Defensive: any failure leaves the static page untouched.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (x) { return Number(x).toLocaleString('en-US'); };

  // ---------- countdown to the PancakeSwap launch: 8 Nov 2026, 00.00 UTC ----------
  var TARGET = Date.UTC(2026, 10, 8, 0, 0, 0);
  function pad(n) { return String(n).padStart(2, '0'); }
  function tickCd() {
    var d = $('cdD'), h = $('cdH'), m = $('cdM'), s = $('cdS');
    if (!d) return;
    var left = TARGET - Date.now();
    if (left <= 0) {
      d.textContent = '00'; h.textContent = '00'; m.textContent = '00'; s.textContent = '00';
      var note = $('cdNote');
      if (note) note.textContent = 'The pool is live. Trading has started on PancakeSwap.';
      return;
    }
    var sec = Math.floor(left / 1000);
    d.textContent = pad(Math.floor(sec / 86400));
    h.textContent = pad(Math.floor(sec % 86400 / 3600));
    m.textContent = pad(Math.floor(sec % 3600 / 60));
    s.textContent = pad(sec % 60);
  }
  tickCd(); setInterval(tickCd, 1000);

  // ---------- live stats in the launch band ----------
  async function loadLaunchStats() {
    try {
      var j = await window.NomioChain.stats();
      if (j && !j.error) {
        var el = $('lzMinted');
        if (el) el.textContent = fmt(j.totalWorks !== undefined ? j.totalWorks : j.series1Minted + j.minted) + ' / 7,221';
      }
      var c = await window.NomioChain.claim();
      if (c && !c.error) {
        var el2 = $('lzClaimed');
        if (el2) el2.textContent = fmt(c.claimed);
      }
    } catch (e) {}
  }
  loadLaunchStats(); setInterval(loadLaunchStats, 30000);

  // ---------- marquee of real works ----------
  var DEMO = [
    '0xbc2b116f80ae4cfe01fec51c14411b79b74f57b91c67d49c2f9ae297ddca9f44',
    '0xaf39e47e62f9454aae0e68e9e10e64d1ecfd57d4908b17e0741d1ff3ccdf8d28',
    '0xe3d0d5a7e0191b9e823d8af472fb7e32922d99ad7381276705ce8e07ed283d49',
    '0x252867f8b0bcd1137406873496f3e153b734f3c9f7013e1d0c8456b70e14a9d0'
  ];
  function fillMarquee(items) {
    var track = $('mqTrack');
    if (!track || !items.length) return;
    var html = items.map(function (it) {
      return '<a href="https://nomio-six.vercel.app/api/svg/' + it.id + '" target="_blank" rel="noopener" aria-label="Nomio work ' + it.id + '">' +
        window.Nomio.render(it.seed, it.id).svg + '</a>';
    }).join('');
    track.innerHTML = html + html; // duplicated for a seamless loop
  }
  async function loadMarquee() {
    var track = $('mqTrack');
    if (!track) return;
    try {
      var j = await window.NomioChain.recent();
      if (j && j.items && j.items.length >= 4) { fillMarquee(j.items.slice(0, 10)); return; }
      throw new Error('few items');
    } catch (e) {
      fillMarquee(DEMO.map(function (seed, i) { return { seed: seed, id: i + 1 }; }));
    }
  }
  loadMarquee();
})();
