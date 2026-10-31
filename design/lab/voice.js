/* How agents talk: three voices and a live thread preview.
   Usage: Voice.mount(el, { agent: () => ({ name, kind }), onChange(voice) })
   Uses Cast (cast.js) for avatars when it's loaded. */
const Voice = (() => {
  const YOU = ['yeah looks cute', 'make sure u dont commit anything', 'lets plan them out in a visual way ig'];

  const OPTIONS = [
    { id: 'chill', title: 'lowercase, low-key', sub: 'Short, no caps, like texting a teammate.', sample: 'done. 6 tests pass, can u look?' },
    { id: 'pro', title: 'Clear and professional', sub: 'Full sentences, no filler. Good for client rooms.', sample: 'Done. All 6 tests pass. Could you review?' },
    { id: 'mirror', title: 'Match how I write', sub: 'Learns from your messages in the room and writes back the same way.', sample: 'yeah 6 tests pass, look before i push?' },
  ];

  // Same thread, three voices. {name} is your agent.
  const LINES = {
    chill: {
      casper: 'ok so tuesday’s call turned into 3 tasks. {name} has the api, batty has the ui',
      answer: 'one setting per account, read on every bill. a column skips a join on the hot path. casper says autopay is opt-in so it defaults to false',
      review: 'done. 6 tests pass, can u look before i push?',
      card: 'review + push 2 files',
    },
    pro: {
      casper: 'Tuesday’s call produced 3 tasks. {name} has the API and Batty has the toggle UI.',
      answer: 'It’s one setting per account and it’s read on every bill, so a column avoids a join on the hot path. Autopay is opt-in, so it defaults to false.',
      review: 'Done. All 6 tests pass. Could you review before I push?',
      card: 'Review and push 2 files',
    },
    mirror: {
      casper: 'yeah so tuesday’s call became 3 tasks ig. {name} took the api, batty’s on the ui',
      answer: 'yeah its one setting per account and we read it every bill, so a column skips the join on the hot path. defaults to false since autopay is opt-in',
      review: 'yeah 6 tests pass. look before i push? didnt commit anything else',
      card: 'review and push 2 files',
    },
  };

  let styled = false;
  function css() {
    if (styled) return; styled = true;
    const s = document.createElement('style');
    s.textContent = `
      .vx{--vx-card:#1e1d22;--vx-card2:#26252b;--vx-line:#2f2e35;--vx-ink:#f1eff4;--vx-ink2:#b4b1bb;--vx-ink3:#7d7a85;--vx-or:#f58a33;--vx-vi:#9b87ff;--vx-ok:#58c47e}
      .vx-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
      .vx-opt{display:flex;flex-direction:column;justify-content:flex-start;text-align:left;background:var(--vx-card);border:1.5px solid var(--vx-line);border-radius:14px;padding:14px;cursor:pointer;color:var(--vx-ink);font:inherit;transition:border-color .2s,background .2s}
      .vx-opt:hover{border-color:#45444c}
      .vx-opt.on{border-color:var(--vx-or);background:rgba(245,138,51,.07)}
      .vx-opt b{display:block;font-size:14px}
      .vx-opt span{display:block;color:var(--vx-ink3);font-size:12.5px;line-height:1.4;margin:3px 0 10px}
      .vx-opt q{display:block;quotes:none;margin-top:auto;padding-top:7px;background:var(--vx-card2);border-radius:10px 10px 10px 3px;padding:7px 10px;font-size:12.5px;color:var(--vx-ink2)}
      .vx-learn{display:none;margin-top:12px;background:var(--vx-card);border:1px dashed #3a3941;border-radius:12px;padding:10px 12px}
      .vx-learn.on{display:block;animation:vx-in .3s ease-out}
      .vx-learn small{color:var(--vx-ink3);font-size:12px;display:block;margin-bottom:7px}
      .vx-learn .ch{display:inline-flex!important;width:auto!important;background:rgba(155,135,255,.12);border:1px solid rgba(155,135,255,.35);color:#cfc6ff;border-radius:99px;padding:3px 10px;font-size:12.5px;margin:0 6px 6px 0}
      .vx-prev{margin-top:14px;background:#141317;border:1px solid var(--vx-line);border-radius:16px;overflow:hidden}
      .vx-bar{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--vx-line);font-size:13px;color:var(--vx-ink2)}
      .vx-bar b{color:var(--vx-ink)}
      .vx-bar .lv{margin-left:auto;font-size:12px;color:var(--vx-ink3);display:flex;align-items:center;gap:6px}
      .vx-bar .lv i{width:7px;height:7px;border-radius:50%;background:var(--vx-ok)}
      .vx-th{padding:6px 14px 14px}
      .vx-m{display:flex;gap:10px;padding:8px 0}
      .vx-av{width:30px;height:30px;border-radius:9px;background:var(--vx-card);flex:none;overflow:hidden;display:grid;place-items:center;font:700 12px inherit;color:#fff}
      .vx-av svg{width:100%;height:100%}
      .vx-who{font-size:13px}.vx-who b{font-weight:700}.vx-who small{color:var(--vx-ink3);font-size:11.5px;margin-left:6px}
      .vx-tx{color:var(--vx-ink2);font-size:13.5px;line-height:1.55;margin-top:1px;min-height:1.55em}
      .vx-tx .cur{display:inline-block;width:7px;height:14px;background:var(--vx-or);vertical-align:-2px;margin-left:1px;animation:vx-bl .8s steps(2) infinite}
      .vx-card{margin-top:8px;background:var(--vx-card);border:1px solid rgba(245,138,51,.5);border-radius:12px;padding:10px 12px;opacity:0;transform:translateY(6px);transition:all .35s ease-out}
      .vx-card.on{opacity:1;transform:none}
      .vx-card .k{color:var(--vx-or);font-size:12px;font-weight:500}
      .vx-card .t{font-size:14px;font-weight:700;margin:1px 0 7px;color:var(--vx-ink)}
      .vx-card .f{font:400 12px/1.7 "Geist Mono",ui-monospace,monospace;color:var(--vx-ink2)}
      .vx-card .f span{float:right;color:var(--vx-ok)}
      .vx-card .r{display:flex;gap:6px;margin-top:9px}
      .vx-card .r i{font-style:normal;font-size:12.5px;font-weight:700;border-radius:8px;padding:5px 10px;border:1px solid #3a3941;color:var(--vx-ink)}
      .vx-card .r i:first-child{background:var(--vx-ink);color:#141218;border-color:var(--vx-ink)}
      @keyframes vx-bl{50%{opacity:0}}
      @keyframes vx-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
      @media (prefers-reduced-motion:reduce){.vx *{animation:none!important;transition:none!important}}`;
    document.head.appendChild(s);
  }

  const av = (kind, letter, bg) => typeof Cast !== 'undefined' && kind ? `<span class="vx-av">${Cast.svg(kind, { crop: 'head', still: true })}</span>` : `<span class="vx-av" style="background:${bg}">${letter}</span>`;

  function mount(el, { agent = () => ({ name: 'Jack', kind: 'pumpkin' }), value = 'chill', onChange } = {}) {
    css();
    el.classList.add('vx');
    el.innerHTML = `
      <div class="vx-opts">${OPTIONS.map(o => `<button type="button" class="vx-opt" data-v="${o.id}"><b>${o.title}</b><span>${o.sub}</span><q>${o.sample}</q></button>`).join('')}</div>
      <div class="vx-learn"><small>Learning from your last messages in this room (never DMs). You can see and delete what it learned.</small>${YOU.map(t => `<span class="ch">“${t}”</span>`).join('')}</div>
      <div class="vx-prev">
        <div class="vx-bar"><span>#</span><b>autopay-launch</b><span>· preview</span><span class="lv"><i></i>how it’ll sound</span></div>
        <div class="vx-th"></div>
      </div>`;
    const th = el.querySelector('.vx-th');
    let cur = value, run = 0;

    function render() {
      const a = agent(), L = LINES[cur], my = ++run;
      const msgs = [
        { av: av('casper', 'C', '#3a3742'), who: 'Casper', meta: '2:01 PM', text: L.casper.replace('{name}', a.name) },
        { av: av(null, 'K', '#6f5fa8'), who: 'Kinjal', meta: '2:06 PM', text: `@${a.name} why a column, not a table?`, fixed: true },
        { av: av(a.kind, a.name[0], '#e2702f'), who: a.name, meta: 'your agent · 2:06 PM', text: L.answer },
        { av: av(a.kind, a.name[0], '#e2702f'), who: a.name, meta: '2:09 PM', text: L.review, card: L.card },
      ];
      th.innerHTML = msgs.map((m, i) => `<div class="vx-m"><span>${m.av}</span><div style="flex:1;min-width:0"><div class="vx-who"><b>${m.who}</b><small>${m.meta}</small></div><div class="vx-tx" data-i="${i}"></div>${m.card ? `<div class="vx-card"><div class="k">Needs you</div><div class="t">${m.card}</div><div class="f">api/autopay.ts<span>+24 −9</span><br>api/autopay.test.ts<span>+38</span></div><div class="r"><i>Approve and push</i><i>Open diff</i></div></div>` : ''}</div></div>`).join('');
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const boxes = [...th.querySelectorAll('.vx-tx')];
      const card = th.querySelector('.vx-card');
      if (reduce) { boxes.forEach((b, i) => b.textContent = msgs[i].text); card.classList.add('on'); return; }
      let i = 0;
      const next = () => {
        if (my !== run) return;
        if (i >= msgs.length) { card.classList.add('on'); return; }
        const box = boxes[i], text = msgs[i].text;
        if (msgs[i].fixed) { box.textContent = text; i++; return setTimeout(next, 250); }
        let n = 0;
        const tick = () => {
          if (my !== run) return;
          n = Math.min(text.length, n + 3);
          box.innerHTML = text.slice(0, n) + (n < text.length ? '<span class="cur"></span>' : '');
          if (n < text.length) setTimeout(tick, 16); else { i++; setTimeout(next, 220); }
        };
        tick();
      };
      next();
    }

    function set(v) {
      cur = v;
      el.querySelectorAll('.vx-opt').forEach(b => b.classList.toggle('on', b.dataset.v === v));
      el.querySelector('.vx-learn').classList.toggle('on', v === 'mirror');
      render();
      onChange && onChange(v);
    }
    el.querySelectorAll('.vx-opt').forEach(b => b.onclick = () => set(b.dataset.v));
    set(cur);
    return { set, refresh: render, get: () => cur, line: k => LINES[cur][k] };
  }
  return { mount, LINES, OPTIONS };
})();
