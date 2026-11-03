// Browser chain reads for the static build of nomio.uk (GitHub Pages).
// Replaces the former Vercel /api endpoints (stats, recent, claim, market)
// with direct BSC RPC calls from the visitor's browser. Read-only.
(function () {
  'use strict';
  var NFT = '0x48b5e5573e76caaa41a893496de6c857720e6b40';
  var NFT2 = '0xC9747B35800eB4A0A3221EB45cb9FcDE7463728C';
  var NFT3 = '0xa41Dd6a32dd7a0EfB405Cb38716015Ff44E9877D'; // Series II batch 2 (works 5,556 to 6,666), opens automatically when batch 1 sells out
  var CLAIM = '0xcbeE2612E3f3FEb298b274E7119a6a9ce08871b9';
  var CLAIM2 = '0xeFf514283A109613A5Ae7306e1266Ec52EaB63d2';
  var TOKEN = '0x84B61D73E098e7D46B214bF0032E5C5CdfbAc433';
  var ZERO = '0x0000000000000000000000000000000000000000';
  var RPCS = [
    'https://bsc-rpc.publicnode.com',
    'https://bsc-dataseed.bnbchain.org',
    'https://bsc-dataseed1.binance.org',
    'https://bsc-mainnet.public.blastapi.io'
  ];
  var SEL = {
    totalSupply: '0x18160ddd',
    seedOf: '0x82829f74',
    ownerOf: '0x6352211e',
    stats: '0x8bcdcbf3',
    currentPrice: '0x9d1b464a',
    mintOpen: '0x24bbd049',
    totalClaimed: '0xd54ad2a1',
    claimsRemaining: '0x754c463f',
    claimOpen: '0x4b8bcb58',
    claimedById: '0x4c80ee12'
  };

  function encUint(n) { return BigInt(n).toString(16).padStart(64, '0'); }
  function encAddr(a) { return String(a).toLowerCase().replace(/^0x/, '').padStart(64, '0'); }
  function wordAt(hex, i) { return BigInt('0x' + hex.slice(2 + i * 64, 2 + (i + 1) * 64)); }
  function addrAt(hex, i) { return '0x' + hex.slice(2 + i * 64 + 24, 2 + (i + 1) * 64); }

  function post(url, payload) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 20000) : null;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }, function (e) {
      if (timer) clearTimeout(timer);
      throw e;
    });
  }
  // Try each RPC endpoint in turn until one answers.
  function viaRpc(fn) {
    var p = Promise.reject(new Error('no rpc'));
    RPCS.forEach(function (u) { p = p.catch(function () { return fn(u); }); });
    return p;
  }
  function ethCall(to, data) {
    return viaRpc(function (u) {
      return post(u, { jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: to, data: data }, 'latest'] })
        .then(function (j) {
          if (j.error || typeof j.result !== 'string') throw new Error('rpc error');
          return j.result;
        });
    });
  }
  // Multicall3 aggregate3: many contract reads inside ONE eth_call.
  // (JSON-RPC batch requests are rate-limited by several public RPCs;
  // a single aggregate3 call is not.) calls: [{to, data}] ->
  // [{ok, result}] where result is the raw return-data hex.
  var MC3 = '0xcA11bde05977b3631167028862bE2a173976CA11';
  var AGG_SEL = '0x82ad56cb';
  function encBytes(hex) {
    var body = hex.replace(/^0x/, '');
    var padded = body.padEnd(Math.ceil(body.length / 64) * 64, '0');
    return encUint(body.length / 2) + padded;
  }
  function aggregate3(calls) {
    var tuples = calls.map(function (c) {
      return encAddr(c.to) + encUint(1) + encUint(96) + encBytes(c.data);
    });
    var head = '', tail = '', off = tuples.length * 32;
    tuples.forEach(function (t) {
      head += encUint(off);
      tail += t;
      off += t.length / 2;
    });
    var data = AGG_SEL + encUint(32) + encUint(calls.length) + head + tail;
    return ethCall(MC3, data).then(function (hex) {
      var base = 2 + Number(wordAt(hex, 0)) * 2; // start of array data
      var len = Number(wordAt(hex, (base - 2) / 64));
      var out = [];
      for (var i = 0; i < len; i++) {
        var rel = Number(wordAt(hex, (base - 2) / 64 + 1 + i));
        var t = (base - 2) / 64 + 1 + rel / 32;
        var ok = wordAt(hex, t) !== 0n;
        var bOff = Number(wordAt(hex, t + 1));
        var bLen = Number(wordAt(hex, t + bOff / 32));
        var bytes = '0x' + hex.slice((t + bOff / 32 + 1) * 64 + 2, (t + bOff / 32 + 1) * 64 + 2 + bLen * 2);
        out.push({ ok: ok, result: bytes });
      }
      return out;
    });
  }
  // Run aggregate3 over chunks of `size` calls, up to 4 chunks in parallel.
  function aggregate3Chunked(calls, size) {
    var chunks = [];
    for (var i = 0; i < calls.length; i += size) chunks.push(calls.slice(i, i + size));
    var out = new Array(chunks.length);
    var next = 0;
    function worker() {
      var idx = next++;
      if (idx >= chunks.length) return Promise.resolve();
      return aggregate3(chunks[idx]).then(function (r) {
        out[idx] = r;
        return worker();
      });
    }
    var pool = [];
    for (var w = 0; w < Math.min(4, chunks.length); w++) pool.push(worker());
    return Promise.all(pool).then(function () {
      var flat = [];
      out.forEach(function (r) { flat = flat.concat(r); });
      return flat;
    });
  }

  // ---- /api/stats equivalent: the live mint is Series II; the Series I
  // total rides along so the header can show the whole edition. ----
  function stats(wallet) {
    var hasWallet = /^0x[0-9a-fA-F]{40}$/.test(wallet || '') && wallet.toLowerCase() !== ZERO.toLowerCase();
    // Series II runs in two batches of 1,111. Batch 2 (NFT3) opens
    // automatically when batch 1 (NFT2) sells out, so the live ledger is
    // the sum of both and the "active" contract is batch 1 until it is
    // complete, then batch 2. Direct reads only: stats() on either
    // contract reverts for the zero address.
    return aggregate3([
      { to: NFT2, data: SEL.totalSupply },
      { to: NFT3, data: SEL.totalSupply },
      { to: NFT, data: SEL.totalSupply }
    ]).then(function (r) {
      if (!r[0].ok) throw new Error('stats read failed');
      var n2 = Number(wordAt(r[0].result, 0));
      var n3 = r[1].ok ? Number(wordAt(r[1].result, 0)) : 0;
      var s1 = r[2].ok ? Number(wordAt(r[2].result, 0)) : 4444;
      var active = n2 >= 1111 ? NFT3 : NFT2;
      var base = {
        minted: n2 + n3,
        max: 2222,
        series1Minted: s1,
        contract: active
      };
      if (!hasWallet) {
        return aggregate3([
          { to: active, data: SEL.currentPrice },
          { to: active, data: SEL.mintOpen }
        ]).then(function (r2) {
          base.priceWei = r2[0].ok ? wordAt(r2[0].result, 0).toString() : '270000000000000';
          base.open = r2[1].ok ? wordAt(r2[1].result, 0) !== 0n : false;
          base.hasAgentId = false;
          base.hasMinted = false;
          return base;
        });
      }
      return ethCall(active, SEL.stats + encAddr(wallet)).then(function (hex) {
        base.priceWei = wordAt(hex, 2).toString();
        base.open = wordAt(hex, 3) !== 0n;
        base.hasAgentId = wordAt(hex, 4) !== 0n;
        base.hasMinted = wordAt(hex, 5) !== 0n;
        return base;
      });
    });
  }

  // ---- /api/recent equivalent ----
  function recent() {
    return ethCall(NFT, SEL.totalSupply).then(function (hex) {
      var n = Number(wordAt(hex, 0));
      var ids = [];
      for (var i = n; i > Math.max(0, n - 12); i--) ids.push(i);
      var calls = ids.map(function (id) { return { to: NFT, data: SEL.seedOf + encUint(id) }; });
      return aggregate3(calls).then(function (results) {
        var items = [];
        ids.forEach(function (id, k) {
          var r = results[k];
          if (!r || !r.ok) return;
          var v = wordAt(r.result, 0);
          if (v === 0n) return;
          items.push({ id: id, seed: '0x' + v.toString(16).padStart(64, '0') });
        });
        return { minted: n, items: items };
      });
    });
  }

  // ---- /api/claim equivalent: both series combined in the ledger;
  // a per-work read routes by number (1-4,444 Series I, 4,445+ Series II).
  function claim(id) {
    var calls = [
      { to: CLAIM, data: SEL.totalClaimed },
      { to: CLAIM, data: SEL.claimsRemaining },
      { to: CLAIM, data: SEL.claimOpen },
      { to: CLAIM2, data: SEL.totalClaimed },
      { to: CLAIM2, data: SEL.claimsRemaining },
      { to: CLAIM2, data: SEL.claimOpen }
    ];
    if (id !== undefined) {
      var p2 = id > 4444;
      calls.push({ to: p2 ? CLAIM2 : CLAIM, data: SEL.claimedById + encUint(id) });
      calls.push({ to: p2 ? NFT2 : NFT, data: SEL.ownerOf + encUint(id) });
    }
    return aggregate3(calls).then(function (r) {
      if (!r[0].ok || !r[3].ok) throw new Error('claim read failed');
      var out = {
        claimed: Number(wordAt(r[0].result, 0)) + Number(wordAt(r[3].result, 0)),
        max: 5555,
        remaining: Number(wordAt(r[1].result, 0)) + Number(wordAt(r[4].result, 0)),
        open: wordAt(r[2].result, 0) !== 0n && wordAt(r[5].result, 0) !== 0n,
        claimContract: CLAIM,
        tokenContract: TOKEN
      };
      if (id !== undefined) {
        out.id = id;
        out.claimedForId = r[6].ok ? wordAt(r[6].result, 0) !== 0n : false;
        out.owner = r[7].ok ? addrAt(r[7].result, 0) : null;
      }
      return out;
    });
  }

  // ---- /api/market equivalent ----
  // Traits never change (seed is fixed at mint), so Series I traits ship
  // as a static snapshot in /market-data.json; owners and new mints are
  // read live. Series II works (4,445 and up) are read live from the
  // second contract in the same pass, traits rendered from their seeds.
  function market() {
    var snapP = fetch('/market-data.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
    var countsP = aggregate3([
      { to: NFT, data: SEL.totalSupply },
      { to: NFT2, data: SEL.totalSupply },
      { to: NFT3, data: SEL.totalSupply }
    ]);
    return Promise.all([snapP, countsP]).then(function (pair) {
      var snap = pair[0] || { minted: 0, items: [] };
      var n = Number(wordAt(pair[1][0].result, 0));
      var n2 = Number(wordAt(pair[1][1].result, 0));
      var n3 = pair[1][2] && pair[1][2].ok ? Number(wordAt(pair[1][2].result, 0)) : 0;
      var byId = {};
      (snap.items || []).forEach(function (it) { byId[it.id] = it; });
      var calls = [];
      var i;
      for (i = 1; i <= n; i++) calls.push({ to: NFT, data: SEL.ownerOf + encUint(i) });
      for (i = 1; i <= n2; i++) calls.push({ to: NFT2, data: SEL.ownerOf + encUint(4444 + i) });
      for (i = 1; i <= n3; i++) calls.push({ to: NFT3, data: SEL.ownerOf + encUint(5555 + i) });
      return aggregate3Chunked(calls, 300).then(function (owners) {
        var fresh = [];
        for (i = (snap.minted || 0) + 1; i <= n; i++) if (!byId[i]) fresh.push({ id: i, to: NFT });
        for (i = 1; i <= n2; i++) fresh.push({ id: 4444 + i, to: NFT2 });
        for (i = 1; i <= n3; i++) fresh.push({ id: 5555 + i, to: NFT3 });
        var seedCalls = fresh.map(function (f) { return { to: f.to, data: SEL.seedOf + encUint(f.id) }; });
        return (seedCalls.length ? aggregate3(seedCalls) : Promise.resolve([])).then(function (seeds) {
          fresh.forEach(function (f, k) {
            var r = seeds[k];
            if (!r || !r.ok) return;
            var v = wordAt(r.result, 0);
            if (v === 0n || !window.Nomio) return;
            var seed = '0x' + v.toString(16).padStart(64, '0');
            try {
              var t = window.Nomio.render(seed, f.id).traits;
              byId[f.id] = { id: f.id, owner: null, form: t.Form, palette: t.Palette, rule: t.Rule };
            } catch (e) {}
          });
          var items = [];
          var ownerSet = {};
          function pushItem(id, contract) {
            var base = byId[id];
            if (!base) return;
            var oi = contract === NFT ? id - 1 : contract === NFT2 ? n + (id - 4444) - 1 : n + n2 + (id - 5555) - 1;
            var owner = owners[oi] && owners[oi].ok ? addrAt(owners[oi].result, 0) : base.owner;
            if (!owner) return;
            ownerSet[owner.toLowerCase()] = 1;
            items.push({
              id: id,
              owner: owner,
              form: base.form,
              palette: base.palette,
              rule: base.rule,
              img: contract === NFT ? 'https://nomio-six.vercel.app/api/image/' + id : 'https://nomio.uk/api/svg/' + id + '.svg',
              element: 'https://element.market/assets/bsc/' + contract + '/' + id
            });
          }
          for (i = 1; i <= n; i++) pushItem(i, NFT);
          for (i = 1; i <= n2; i++) pushItem(4444 + i, NFT2);
          for (i = 1; i <= n3; i++) pushItem(5555 + i, NFT3);
          return { contract: NFT, chain: 'bsc', minted: n + n2 + n3, owners: Object.keys(ownerSet).length, items: items };
        });
      });
    });
  }

  window.NomioChain = { stats: stats, recent: recent, claim: claim, market: market };
})();
