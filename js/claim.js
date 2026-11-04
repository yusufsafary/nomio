// Holder claim panel: reads the claim contract directly from the browser
// (window.NomioChain) and fills the claim ledger; also powers the
// check-a-work form.
(function () {
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Number(n).toLocaleString('en-US');
  if (!$('claim')) return;

  async function loadClaim() {
    try {
      const j = await window.NomioChain.claim();
      if (j.error) return;
      $('cClaimed').textContent = fmt(j.claimed);
      $('cFill').style.width = (j.claimed / j.max * 100) + '%';
      $('cStatus').textContent = j.open ? 'Claims open' : 'Claims closed';
    } catch (e) {}
  }
  loadClaim(); setInterval(loadClaim, 15000);

  // Claims close on 8 November 2026 at 00.00 UTC, aligned with the $NOMIO PancakeSwap launch (moved on 3 November).
  var CLOSE_AT = Date.UTC(2026, 10, 8, 0, 0, 0);
  function tickCountdown() {
    var D = $('cCdD'), H = $('cCdH'), M = $('cCdM'), S = $('cCdS');
    if (!D) return;
    var p = function (n) { return String(n).padStart(2, '0'); };
    var ms = CLOSE_AT - Date.now();
    if (ms <= 0) { D.textContent = H.textContent = M.textContent = S.textContent = '00'; return; }
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    D.textContent = p(d); H.textContent = p(h); M.textContent = p(m); S.textContent = p(s);
  }
  tickCountdown(); setInterval(tickCountdown, 1000);

  $('workBtn').addEventListener('click', async () => {
    const out = $('workOut');
    const v = $('work').value.trim();
    if (!/^\d+$/.test(v) || Number(v) < 1 || Number(v) > 7221) { out.textContent = 'Enter a Nomio number between 1 and 7,221.'; return; }
    const id = Number(v);
    out.textContent = 'Checking…';
    try {
      const j = await window.NomioChain.claim(id);
      if (j.error) { out.textContent = 'Could not reach the contract. Try again.'; return; }
      if (!j.owner) out.textContent = 'Nomio #' + id + ' has not been minted yet.';
      else if (j.claimedForId) out.textContent = 'Nomio #' + id + ' has already claimed its $NOMIO.';
      else if (id > 6666) out.textContent = 'Nomio #' + id + ' can still claim ' + fmt(Number(BigInt(j.claimAmount || '0') / 1000000000000000000n)) + ' $NOMIO (Premium, by rarity class). Held by ' + j.owner.slice(0, 6) + '…' + j.owner.slice(-4) + '.';
      else out.textContent = 'Nomio #' + id + ' can still claim 250,000 $NOMIO. Held by ' + j.owner.slice(0, 6) + '…' + j.owner.slice(-4) + '.';
    } catch (e) { out.textContent = 'Could not reach the contract. Try again.'; }
  });
})();
