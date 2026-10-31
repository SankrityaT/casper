/* Casper cast: fuzzy, always-moving characters drawn in SVG.
   Usage: Plush.svg(kind, {mood, size, still}) -> '<svg …>' string.
   Kinds: casper, pumpkin (Jack), bat (Batty), candle (Wick), moon (Luna), cat (Salem).
   Moods: calm, alert, worried, sleep, happy. */
const Plush = (() => {
  let n = 0;
  const C = {
    casper: { base: '#eeebf7', light: '#ffffff', dark: '#a9a1cf' },
    pumpkin:{ base: '#f58a33', light: '#ffbe76', dark: '#b84a14' },
    bat:    { base: '#8e78f2', light: '#c3b8ff', dark: '#4f3cc0' },
    candle: { base: '#f3e6cd', light: '#fffaf0', dark: '#c4ab80' },
    moon:   { base: '#ffcf4a', light: '#ffe9a0', dark: '#d0921c' },
    cat:    { base: '#4a4558', light: '#8d86a6', dark: '#24212d' },
  };
  const BODY = {
    casper: 'M22 54 C22 30 35 15 50 15 C65 15 78 30 78 54 L78 86 C73 92 69 84 64 89 C59 94 55 85 50 89 C45 94 41 85 36 89 C31 94 27 86 22 86 Z',
    pumpkin:'M50 34 C66 31 84 38 87 58 C90 79 75 90 50 90 C25 90 10 79 13 58 C16 38 34 31 50 34 Z',
    bat:    'M27 48 L24 22 L41 37 C47 35 53 35 59 37 L76 22 L73 48 C80 56 80 70 74 79 C67 89 58 91 50 91 C42 91 33 89 26 79 C20 70 20 56 27 48 Z',
    candle: 'M30 44 C30 37 35 34 42 34 L58 34 C65 34 70 37 70 44 L70 84 C70 89 66 92 61 92 L39 92 C34 92 30 89 30 84 Z',
    moon:   'M50 24 C70 24 84 39 84 58 C84 77 70 91 50 91 C30 91 16 77 16 58 C16 39 30 24 50 24 Z',
    cat:    'M24 50 L23 20 L42 36 C47 35 53 35 58 36 L77 20 L76 50 C82 60 81 74 74 82 C67 90 59 92 50 92 C41 92 33 90 26 82 C19 74 18 60 24 50 Z',
  };
  const EYES = {
    casper: [[41, 50], [59, 50]], pumpkin: [[41, 62], [59, 62]], bat: [[42, 60], [58, 60]],
    candle: [[42, 62], [58, 62]], moon: [[41, 60], [59, 60]], cat: [[40, 60], [60, 60]],
  };
  const defs = () => {
    if (document.getElementById('plush-defs')) return;
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.id = 'plush-defs'; s.setAttribute('width', 0); s.setAttribute('height', 0);
    s.style.position = 'absolute';
    s.innerHTML = `<defs>
      <filter id="pl-fur" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="edge"/>
        <feDisplacementMap in="SourceGraphic" in2="edge" scale="7" xChannelSelector="R" yChannelSelector="G" result="shape"/>
        <feTurbulence type="fractalNoise" baseFrequency="1.05 0.5" numOctaves="2" seed="11" result="g0"/>
        <feGaussianBlur in="g0" stdDeviation=".45" result="grain"/>
        <feDiffuseLighting in="grain" surfaceScale="1.7" lighting-color="#ffffff" result="lit"><feDistantLight azimuth="235" elevation="62"/></feDiffuseLighting>
        <feComposite in="shape" in2="lit" operator="arithmetic" k1="0.42" k2="0.66" k3="0" k4="0" result="furry"/>
        <feComposite in="furry" in2="shape" operator="in"/>
      </filter>
      <filter id="pl-felt" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="2" result="e"/>
        <feDisplacementMap in="SourceGraphic" in2="e" scale="2.5" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <filter id="pl-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3"/></filter>
      <filter id="pl-shadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter>
    </defs>`;
    document.body.prepend(s);
    const st = document.createElement('style');
    st.textContent = `
      .pl{overflow:visible;display:block}
      .pl .rig{transform-box:view-box;transform-origin:50% 92%;animation:pl-sway var(--sw,7s) ease-in-out infinite;animation-delay:var(--d,0s)}
      .pl .breathe{transform-box:view-box;transform-origin:50% 92%;animation:pl-breathe var(--br,3.6s) ease-in-out infinite;animation-delay:var(--d,0s)}
      .pl .look{animation:pl-look var(--lk,9s) ease-in-out infinite;animation-delay:var(--d,0s)}
      .pl .eye{transform-box:fill-box;transform-origin:center;animation:pl-blink var(--bl,5.5s) infinite;animation-delay:var(--d,0s)}
      .pl .flame{transform-box:fill-box;transform-origin:50% 100%;animation:pl-flick .5s ease-in-out infinite alternate}
      .pl .glow{animation:pl-glow 1.6s ease-in-out infinite alternate}
      .pl.still *{animation:none!important}
      @keyframes pl-sway{0%,100%{transform:rotate(-1.6deg)}50%{transform:rotate(1.6deg)}}
      @keyframes pl-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.03,.97)}}
      @keyframes pl-look{0%,30%{transform:translate(0,0)}36%,52%{transform:translate(-2.2px,.4px)}58%,74%{transform:translate(2.2px,-.3px)}80%,100%{transform:translate(0,0)}}
      @keyframes pl-blink{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.08)}}
      @keyframes pl-flick{0%{transform:scale(.94,1.04) rotate(-2deg)}100%{transform:scale(1.04,.95) rotate(2deg)}}
      @keyframes pl-glow{0%{opacity:.55}100%{opacity:.9}}
      @media (prefers-reduced-motion:reduce){.pl *{animation:none!important}}`;
    document.head.appendChild(st);
  };

  function eyes(kind, mood) {
    const [L, R] = EYES[kind];
    if (kind === 'cat' && mood !== 'sleep' && mood !== 'happy') {
      return [L, R].map(([x, y]) => `<g class="eye"><ellipse cx="${x}" cy="${y}" rx="6.6" ry="7.6" fill="#c8f25a"/><ellipse cx="${x}" cy="${y}" rx="1.9" ry="6" fill="#111"/><circle cx="${x - 2.2}" cy="${y - 3}" r="1.5" fill="#fff" opacity=".9"/></g>`).join('');
    }
    if (mood === 'sleep') return [L, R].map(([x, y]) => `<path d="M${x - 5} ${y} Q${x} ${y + 3.6} ${x + 5} ${y}" stroke="#141218" stroke-width="2.6" fill="none" stroke-linecap="round"/>`).join('');
    if (mood === 'happy') return [L, R].map(([x, y]) => `<path d="M${x - 5} ${y + 1.5} Q${x} ${y - 5} ${x + 5} ${y + 1.5}" stroke="#141218" stroke-width="2.6" fill="none" stroke-linecap="round"/>`).join('');
    const rx = mood === 'alert' ? 4.6 : 3.9, ry = mood === 'alert' ? 6 : 5.1;
    let s = [L, R].map(([x, y]) => `<g class="eye"><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#141218"/><ellipse cx="${x - 1.3}" cy="${y - 2}" rx="1.3" ry="1.6" fill="#fff" opacity=".85"/></g>`).join('');
    if (mood === 'worried') s += `<path d="M${L[0] - 6} ${L[1] - 9} L${L[0] + 4} ${L[1] - 12}" stroke="#141218" stroke-width="2.4" stroke-linecap="round"/><path d="M${R[0] - 4} ${R[1] - 12} L${R[0] + 6} ${R[1] - 9}" stroke="#141218" stroke-width="2.4" stroke-linecap="round"/>`;
    return s;
  }

  function extras(kind, id, mood) {
    // things drawn on top of the fur (black Ghostbusters-style gear)
    switch (kind) {
      case 'pumpkin': return `
        <path d="M47 33 C46 25 49 19 55 16 L58 19 C54 22 53 27 54 33 Z" fill="#4c6b2a" filter="url(#pl-felt)"/>
        <g><rect x="22" y="42" width="56" height="5" rx="2.5" fill="#141218"/>
          <circle cx="39" cy="44.5" r="8" fill="#141218"/><circle cx="61" cy="44.5" r="8" fill="#141218"/>
          <circle cx="39" cy="44.5" r="4.6" fill="#2f6b3a"/><circle cx="61" cy="44.5" r="4.6" fill="#2f6b3a"/>
          <circle cx="37.5" cy="43" r="1.4" fill="#b8f5a0" opacity=".9"/><circle cx="59.5" cy="43" r="1.4" fill="#b8f5a0" opacity=".9"/></g>`;
      case 'bat': return `
        <path d="M24 56 C24 30 76 30 76 56" stroke="#141218" stroke-width="4.5" fill="none" stroke-linecap="round"/>
        <rect x="18" y="52" width="10" height="16" rx="5" fill="#141218"/><rect x="72" y="52" width="10" height="16" rx="5" fill="#141218"/>
        <path d="M23 66 C25 78 34 80 42 78" stroke="#141218" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="43.5" cy="77.6" r="3" fill="#141218"/>`;
      case 'candle': return `
        <ellipse class="glow" cx="50" cy="24" rx="12" ry="14" fill="#ffb347" opacity=".7" filter="url(#pl-glow)"/>
        <path class="flame" d="M50 9 C57 17 58 24 55 29 C53 32 47 32 45 29 C42 24 43 17 50 9 Z" fill="url(#${id}-fl)"/>
        <rect x="48.8" y="29" width="2.4" height="6" rx="1.2" fill="#2a2522"/>
        <g fill="none" stroke="#141218" stroke-width="2.8"><circle cx="42" cy="62" r="8"/><circle cx="58" cy="62" r="8"/><path d="M50 61 Q50 58 50 61"/><path d="M48.6 61.5 Q50 59.5 51.4 61.5"/></g>`;
      case 'moon': return `
        <g filter="url(#pl-felt)"><path d="M18 46 C20 26 40 16 60 22 C70 25 76 32 80 42 C66 36 40 36 18 46 Z" fill="#2e2a38"/>
          <path d="M60 22 C74 18 86 24 90 36 C84 33 80 34 78 38 Z" fill="#2e2a38"/></g>
        <circle cx="90" cy="38" r="5.6" fill="#f4f1ea" filter="url(#pl-fur)"/>`;
      case 'casper': return `<path d="M44 66 Q50 70 56 66" stroke="#141218" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="${mood === 'happy' ? 1 : 0}"/>`;
      default: return '';
    }
  }

  function svg(kind, { mood = 'calm', size, still = false, title } = {}) {
    defs();
    const c = C[kind] || C.casper, id = 'pl' + (++n);
    const d = (-(n * 1.37) % 5).toFixed(2) + 's';
    const vars = `--d:${d};--sw:${(6.4 + (n % 5) * .5).toFixed(1)}s;--br:${(3.2 + (n % 4) * .3).toFixed(1)}s;--bl:${(4.6 + (n % 6) * .7).toFixed(1)}s;--lk:${(8 + (n % 3) * 1.5).toFixed(1)}s`;
    const ears = kind === 'pumpkin'
      ? `<path d="M50 34 C44 46 44 78 50 90" stroke="${c.dark}" stroke-width="2.2" fill="none" opacity=".45"/><path d="M33 37 C24 50 25 76 34 88" stroke="${c.dark}" stroke-width="2" fill="none" opacity=".35"/><path d="M67 37 C76 50 75 76 66 88" stroke="${c.dark}" stroke-width="2" fill="none" opacity=".35"/>`
      : '';
    const sz = size ? ` width="${size}" height="${size}"` : '';
    return `<svg class="pl${still ? ' still' : ''}" viewBox="0 0 100 100"${sz} style="${vars}" role="img" aria-label="${title || kind}">
      <defs>
        <radialGradient id="${id}-g" cx="36%" cy="30%" r="78%"><stop offset="0" stop-color="${c.light}"/><stop offset=".48" stop-color="${c.base}"/><stop offset="1" stop-color="${c.dark}"/></radialGradient>
        <linearGradient id="${id}-fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".55" stop-color="#ffb43c"/><stop offset="1" stop-color="#f06a1d"/></linearGradient>
      </defs>
      <ellipse cx="50" cy="94" rx="27" ry="4.2" fill="#000" opacity=".35" filter="url(#pl-shadow)"/>
      <g class="rig"><g class="breathe">
        <g filter="url(#pl-fur)"><path d="${BODY[kind]}" fill="url(#${id}-g)"/>${ears}</g>
        <g class="look">${eyes(kind, mood)}</g>
        ${extras(kind, id, mood)}
      </g></g>
    </svg>`;
  }

  function mountAll(root = document) {
    root.querySelectorAll('[data-plush]').forEach(el => {
      if (el.dataset.mounted) return;
      el.dataset.mounted = 1;
      el.innerHTML = svg(el.dataset.plush, { mood: el.dataset.mood || 'calm', still: el.hasAttribute('data-still') });
    });
  }
  return { svg, mountAll };
})();
