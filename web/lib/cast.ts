/* eslint-disable */
// @ts-nocheck
/* Casper cast, full body, in Halloween costumes. Drawn in SVG, always moving.
   Usage: Cast.svg(kind, {mood, crop, still}) -> '<svg …>' string.
     crop: 'full' (default) or 'head' (for small avatars).
   Kinds and costumes:
     casper  (ghost)    dressed as a vampire
     pumpkin (Jack)     skeleton onesie, night-vision goggles up
     bat     (Batty)    witch, with a broom
     candle  (Wick)     mummy
     moon    (Luna)     Frankenstein's monster
     cat     (Salem)    little devil, with a pitchfork
   The Ghostly Trio (house crew): stretch (dispatcher), fatso (the Library), stinkie (watchdog).
   Moods: calm, alert, worried, sleep, happy.
   Cast.mountAll() fills every [data-cast] element. */
const Cast: { svg: (kind: string, o?: { mood?: string; crop?: string; still?: boolean; title?: string }) => string; mountAll: () => void } = (() => {
  let n = 0;
  const INK = '#1d1a22';

  /* ---------- colour helpers ---------- */
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
  function shade(id, grads) {
    return (c, key) => {
      const g = `${id}-${key}`;
      grads.push(`<linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix(c, '#ffffff', .32)}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${mix(c, '#000000', .28)}"/></linearGradient>`);
      return `url(#${g})`;
    };
  }
  const S = (d, fill, sw = 2.6, extra = '') => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
  const line = (d, c = INK, sw = 2.2, extra = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  const gloss = (cx, cy, rx, ry, rot = -30, o = .55) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})" fill="#fff" opacity="${o}"/>`;
  const hatch = d => `<path d="${d}" fill="url(#ch-hatch)" opacity=".13" style="mix-blend-mode:multiply"/>`;
  /* an outlined limb: ink stroke under a colour stroke, plus a mitten hand */
  const limb = (d, c, w = 13) => line(d, INK, w + 5.2) + line(d, c, w);
  const hand = (x, y, c, r = 8.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${INK}" stroke-width="2.6"/>` + gloss(x - 2.5, y - 3, 2.6, 1.6, -30, .7);

  /* ---------- faces ---------- */
  function face(ex, ey, gap, mood, { pupil = INK, iris, my = 13, fang = false, blush = '#ff8f9d', mouth = true } = {}) {
    const L = ex - gap, R = ex + gap;
    let s = '';
    if (mood === 'sleep') s += [L, R].map(x => line(`M${x - 5} ${ey} Q${x} ${ey + 4} ${x + 5} ${ey}`, INK, 2.6)).join('');
    else if (mood === 'happy') s += [L, R].map(x => line(`M${x - 5} ${ey + 2} Q${x} ${ey - 5} ${x + 5} ${ey + 2}`, INK, 2.6)).join('');
    else {
      const rx = mood === 'alert' ? 5.4 : 4.6, ry = mood === 'alert' ? 6.6 : 5.8;
      s += `<g class="look">` + [L, R].map(x => `<g class="eye">` +
        (iris ? `<ellipse cx="${x}" cy="${ey}" rx="${rx + 1.8}" ry="${ry + 1.4}" fill="${iris}" stroke="${INK}" stroke-width="1.6"/><ellipse cx="${x}" cy="${ey}" rx="1.8" ry="${ry - .6}" fill="${pupil}"/>`
              : `<ellipse cx="${x}" cy="${ey}" rx="${rx}" ry="${ry}" fill="${pupil}"/>`) +
        `<circle cx="${x - 1.6}" cy="${ey - 2.4}" r="1.7" fill="#fff"/></g>`).join('') + `</g>`;
      if (mood === 'worried') s += line(`M${L - 6} ${ey - 10} L${L + 4} ${ey - 13}`) + line(`M${R - 4} ${ey - 13} L${R + 6} ${ey - 10}`);
    }
    if (blush) s += `<ellipse cx="${L - 6}" cy="${ey + 8}" rx="5" ry="2.6" fill="${blush}" opacity=".45"/><ellipse cx="${R + 6}" cy="${ey + 8}" rx="5" ry="2.6" fill="${blush}" opacity=".45"/>`;
    const m = ey + my;
    if (!mouth) return s;
    if (mood === 'worried') s += line(`M${ex - 4} ${m + 2} Q${ex} ${m - 1} ${ex + 4} ${m + 2}`, INK, 2.2);
    else if (mood === 'alert') s += `<ellipse cx="${ex}" cy="${m}" rx="3" ry="3.6" fill="${INK}"/>`;
    else s += `<path d="M${ex - 5} ${m - 1} Q${ex} ${m + (mood === 'happy' ? 6 : 4)} ${ex + 5} ${m - 1}" fill="${mood === 'happy' ? '#7a2d3a' : 'none'}" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
    if (fang) s += `<path d="M${ex - 3.6} ${m + .4} l1.4 3.6 l1.2 -3.2z M${ex + 1} ${m + .6} l1.4 3.4 l1.2 -3.6z" fill="#fff" stroke="${INK}" stroke-width="1"/>`;
    return s;
  }

  /* ---------- shared body parts ---------- */
  const shadow = (rx = 44) => `<ellipse cx="100" cy="227" rx="${rx}" ry="6" fill="#000" opacity=".28" filter="url(#ch-soft)"/>`;
  function legs(pant, shoe, { stripes, boots } = {}) {
    const leg = (x, cls) => {
      const sh = boots ? `M${x - 12} 222 v-12 q0 -7 8 -7 h12 q8 0 8 9 v10z` : `M${x - 12} 222 q0 -9 9 -9 h10 q9 0 9 9z`;
      let st = '';
      if (stripes) for (let y = 184; y < 210; y += 7) st += `<rect x="${x - 7}" y="${y}" width="14" height="3.4" fill="${stripes}"/>`;
      return `<g class="${cls}">${S(`M${x - 7} 176 h14 v36 h-14z`, pant)}${st}${S(sh, shoe)}${gloss(x - 4, boots ? 208 : 216, 4, 1.6, 0, .5)}</g>`;
    };
    return leg(86, 'leg-l') + leg(114, 'leg-r');
  }
  const armRest = (c, h, x = 72) => `<g class="arm-l">${limb(`M${x + 2} 128 Q${x - 12} 146 ${x - 12} 164`, c)}${hand(x - 12, 168, h)}</g>`;
  const armWave = (c, h, x = 128) => `<g class="arm-r">${limb(`M${x - 2} 128 Q${x + 18} 114 ${x + 20} 94`, c)}${hand(x + 20, 88, h)}</g>`;

  /* ---------- the cast ---------- */
  const DRAW = {
    pumpkin(g, mood) {
      const onesie = '#2b2833', bone = '#f4efe6';
      const body = `<g class="torso">${S('M70 128 Q70 116 84 116 H116 Q130 116 130 128 L132 182 Q132 188 126 188 H74 Q68 188 68 182 Z', g(onesie, 'on'))}
        ${line('M100 124 V176', bone, 3.4)}${[136, 146, 156, 166].map((y, i) => line(`M${84 + i} ${y} Q100 ${y + 4} ${116 - i} ${y}`, bone, 3)).join('')}
        ${line('M86 182 Q100 176 114 182', bone, 3)}</g>`;
      const head = `<g class="head">
        ${S('M100 40 C127 36 148 50 150 77 C152 105 129 118 100 118 C71 118 48 105 50 77 C52 50 73 36 100 40 Z', g('#f58a33', 'pk'))}
        ${line('M100 42 C91 62 91 98 100 116', '#b84a14', 2, 'opacity=".55"')}${line('M80 44 C66 60 67 100 80 114', '#b84a14', 2, 'opacity=".45"')}${line('M120 44 C134 60 133 100 120 114', '#b84a14', 2, 'opacity=".45"')}
        ${S('M97 42 C96 32 99 25 107 22 L111 27 C105 30 104 35 105 42 Z', '#557a2e', 2.2)}
        ${gloss(72, 58, 10, 5)}
        <g>${S('M56 60 Q100 42 144 60 L143 66 Q100 50 57 66Z', INK, 1.2)}
          <circle cx="83" cy="54" r="9.5" fill="${INK}"/><circle cx="117" cy="54" r="9.5" fill="${INK}"/>
          <circle cx="83" cy="54" r="5.6" fill="#3b8a4a"/><circle cx="117" cy="54" r="5.6" fill="#3b8a4a"/>
          <circle cx="81" cy="52" r="1.8" fill="#c6ffb0"/><circle cx="115" cy="52" r="1.8" fill="#c6ffb0"/></g>
        ${face(100, 82, 13, mood, { blush: '#ffcf9e' })}</g>`;
      return shadow() + legs(onesie, '#f58a33') + `<g class="lines">${line('M86 190 V208', bone, 2.6)}${line('M114 190 V208', bone, 2.6)}</g>`
        + armRest(onesie, bone) + body + head + armWave(onesie, bone);
    },

    bat(g, mood) {
      const robe = '#3b2a63', fur = '#8e78f2';
      const wings = `<g class="cape">${S('M74 128 C46 112 22 128 26 152 C34 146 42 150 46 160 C50 151 58 151 64 158 C66 146 70 136 74 128Z', g('#4f3cc0', 'wg'))}
        ${S('M126 128 C154 112 178 128 174 152 C166 146 158 150 154 160 C150 151 142 151 136 158 C134 146 130 136 126 128Z', g('#4f3cc0', 'wg2'))}</g>`;
      const broom = `<g class="prop">${line('M44 116 L74 214', '#8a5a2b', 5)}${line('M44 116 L74 214', INK, 1, 'opacity=".4"')}
        ${S('M66 200 L84 196 L96 226 L60 230 Z', '#e6b450')}${line('M72 204 L72 226 M80 202 L84 226 M88 206 L92 226', '#b8862f', 1.6)}</g>`;
      const body = `<g class="torso">${S('M78 118 H122 L142 200 Q100 208 58 200 Z', g(robe, 'rb'))}
        ${S('M88 118 L100 136 L112 118Z', '#f58a33', 2)}
        <path d="M78 160 l2 4 4 .6 -3 3 .8 4.4 -3.8 -2 -3.8 2 .8 -4.4 -3 -3 4 -.6z" fill="#ffd36b" transform="translate(4 0)"/>
        <path d="M118 176 l1.6 3.2 3.2 .5 -2.4 2.3 .6 3.4 -3 -1.6 -3 1.6 .6 -3.4 -2.4 -2.3 3.2 -.5z" fill="#ffd36b"/>
        ${hatch('M100 118 H122 L142 200 Q120 205 100 205 Z')}</g>`;
      const head = `<g class="head">
        ${S('M66 74 L44 48 L80 58Z', g(fur, 'e1'))}${S('M134 74 L156 48 L120 58Z', g(fur, 'e2'))}
        ${S('M100 44 C125 44 143 60 143 82 C143 104 125 116 100 116 C75 116 57 104 57 82 C57 60 75 44 100 44 Z', g(fur, 'bt'))}
        ${gloss(76, 64, 9, 5)}
        ${S('M44 54 Q100 34 156 54 Q100 70 44 54Z', g('#26222e', 'br'))}
        <g class="hat">${S('M70 52 C78 36 84 18 102 6 C109 1 117 6 112 12 C105 20 120 32 130 52 Q100 60 70 52Z', g('#26222e', 'ht'))}
        ${S('M73 46 Q100 54 127 46 L129 52 Q100 60 71 52Z', '#f58a33', 2)}</g>
        ${face(100, 84, 13, mood, { my: 12, fang: true })}</g>`;
      return shadow() + broom + wings + legs('#2b2833', INK, { stripes: '#f58a33' }) + armRest(robe, fur) + body + head + armWave(robe, fur);
    },

    candle(g, mood) {
      const wax = '#f3e6cd', wrap = '#f8f4ea';
      const flame = `<g class="flame-wrap"><ellipse class="glow" cx="100" cy="20" rx="16" ry="18" fill="#ffb347" opacity=".6" filter="url(#ch-glow)"/>
        <path class="flame" d="M100 2 C109 12 110 21 106 27 C104 31 96 31 94 27 C90 21 91 12 100 2 Z" fill="url(#ch-fl)" stroke="${INK}" stroke-width="2"/>
        ${line('M100 28 V36', INK, 2.4)}</g>`;
      const bands = [[64, 70], [102, 96], [126, 132], [152, 146], [174, 180]].map(([a, b], i) =>
        S(`M68 ${a} L132 ${b - 6} L132 ${b + 6} L68 ${a + 12}Z`, wrap, 2) + line(`M74 ${a + 5} L126 ${b - 1}`, '#d9cfb8', 1.2)).join('');
      const head = `<g class="head">
        ${S('M68 46 Q68 36 80 36 H120 Q132 36 132 46 V184 Q132 194 120 194 H80 Q68 194 68 184 Z', g(wax, 'wx'))}
        ${S('M68 46 Q68 36 80 36 H120 Q132 36 132 46 Q128 58 124 50 Q120 62 114 48 Q108 56 100 46 Q92 60 86 48 Q80 56 76 48 Q72 54 68 46Z', '#fffaf0', 2)}
        ${gloss(80, 70, 4, 16, 0, .6)}
        ${bands}
        <path class="tail" d="M132 126 Q148 128 154 140 Q144 136 132 138Z" fill="${wrap}" stroke="${INK}" stroke-width="2"/>
        ${face(100, 84, 13, mood, { my: 12 })}
        <g fill="none" stroke="${INK}" stroke-width="2.8"><circle cx="87" cy="84" r="9"/><circle cx="113" cy="84" r="9"/>${line('M96 84 Q100 80 104 84')}</g>
        </g>`;
      return shadow(40) + legs(wrap, '#cdbf9f') + `<g>${line('M80 186 L92 190 M80 198 L92 202 M108 188 L120 192 M108 200 L120 204', '#c9bfa6', 1.4)}</g>`
        + armRest(wrap, wrap, 70) + flame + head + armWave(wrap, wrap, 130);
    },

    moon(g, mood) {
      const jacket = '#4a6650', skin = '#ffd659';
      const body = `<g class="torso">${S('M68 128 Q68 116 82 116 H118 Q132 116 132 128 L134 186 Q134 190 128 190 H72 Q66 190 66 186 Z', g(jacket, 'jk'))}
        ${S('M92 116 L100 140 L108 116Z', '#e9e3d4', 2)}${line('M82 116 L100 150 L118 116', INK, 2.4)}
        ${S('M74 160 h14 v12 h-14z', '#6d4f8f', 1.8)}${line('M76 162 l10 8 M86 162 l-10 8', INK, 1)}
        ${line('M120 170 h8 M122 167 v6 M126 167 v6', INK, 1.4)}${hatch('M100 116 H118 Q132 116 132 128 L134 186 Q134 190 128 190 H100Z')}</g>`;
      const head = `<g class="head">
        ${S('M54 102 h10 v8 h-10z', '#9aa0a8', 2)}${S('M136 102 h10 v8 h-10z', '#9aa0a8', 2)}
        ${S('M100 44 C125 44 143 61 143 82 C143 104 125 118 100 118 C75 118 57 104 57 82 C57 61 75 44 100 44 Z', g(skin, 'mn'))}
        <circle cx="122" cy="98" r="5" fill="#e0a92c" opacity=".55"/><circle cx="76" cy="104" r="3.4" fill="#e0a92c" opacity=".5"/>
        ${S('M57 74 V58 Q59 44 74 44 H126 Q141 44 143 58 V74 Q132 64 124 70 Q114 60 106 70 Q98 60 90 70 Q80 62 72 70 Q64 64 57 74Z', g('#24212d', 'hr'))}
        ${gloss(70, 52, 7, 3, -10, .35)}
        ${line('M114 104 L130 98', INK, 1.6)}${line('M118 98 L120 106 M124 96 L126 104', INK, 1.4)}
        ${face(100, 86, 13, mood, { blush: '#f0a35a' })}</g>`;
      return shadow() + legs('#2f2c37', INK, { boots: true }) + armRest(jacket, '#8fc27a') + body + head + armWave(jacket, '#8fc27a');
    },

    cat(g, mood) {
      const fur = '#4a4558', red = '#d23a33';
      const cape = `<g class="cape">${S('M74 120 C56 150 50 190 58 214 Q100 222 142 214 C150 190 144 150 126 120Z', g('#8f1f24', 'cp'))}</g>`;
      const tail = `<g class="tail">${line('M126 182 C150 186 160 168 152 152 C146 140 156 132 164 136', INK, 6.6)}${line('M126 182 C150 186 160 168 152 152 C146 140 156 132 164 136', red, 3)}
        ${S('M160 128 L174 132 L164 144Z', red, 2)}</g>`;
      const fork = `<g class="prop">${line('M48 106 L66 214', '#a9adb8', 4.4)}${S('M36 104 Q46 112 56 98 M46 112 L44 92', 'none', 2.6)}
        ${line('M36 104 L34 92 M56 98 L56 86 M45 108 L44 88', '#a9adb8', 3)}</g>`;
      const body = `<g class="torso">${S('M70 128 Q70 116 84 116 H116 Q130 116 130 128 L132 184 Q132 190 126 190 H74 Q68 190 68 184 Z', g(red, 'rd'))}
        ${S('M86 116 Q100 130 114 116', '#24212d', 2)}${gloss(80, 134, 4, 9, 10, .35)}${hatch('M100 116 H116 Q130 116 130 128 L132 184 Q132 190 126 190 H100Z')}</g>`;
      const head = `<g class="head">
        ${S('M62 70 L60 34 L86 52Z', g(fur, 'c1'))}${S('M138 70 L140 34 L114 52Z', g(fur, 'c2'))}
        ${S('M100 46 C125 46 143 62 143 84 C143 106 125 118 100 118 C75 118 57 106 57 84 C57 62 75 46 100 46 Z', g(fur, 'ct'))}
        ${S('M64 46 L62 42 L69 45Z', '#ff9db0', 1)}
        ${S('M78 52 Q72 36 82 26 Q80 40 88 48Z', red, 2)}${S('M122 52 Q128 36 118 26 Q120 40 112 48Z', red, 2)}
        ${gloss(76, 64, 9, 5, -30, .3)}
        ${line('M60 92 L44 88 M60 98 L44 100 M140 92 L156 88 M140 98 L156 100', '#bdb7d0', 1.4)}
        ${face(100, 82, 14, mood, { iris: '#c8f25a', my: 14, blush: '#ff9db0' })}</g>`;
      return shadow() + cape + tail + fork + legs('#24212d', red) + armRest(red, fur) + body + head + armWave(red, fur);
    },

    casper(g, mood) {
      const sheet = '#efecf8';
      const cape = `<g class="cape">${S('M56 98 C34 140 30 184 36 216 L100 204 L164 216 C170 184 166 140 144 98Z', g('#1f1b26', 'ck'))}
        ${S('M66 102 C50 142 48 180 52 206 L100 198 L148 206 C152 180 150 142 134 102Z', g('#b8283a', 'cr'))}</g>`;
      const collar = `${S('M64 100 L34 64 L80 88Z', '#1f1b26')}${S('M136 100 L166 64 L120 88Z', '#1f1b26')}
        ${S('M66 98 L44 70 L78 90Z', '#b8283a', 1.6)}${S('M134 98 L156 70 L122 90Z', '#b8283a', 1.6)}`;
      const ghost = `<g class="head">
        ${S('M56 100 C56 58 76 30 100 30 C124 30 144 58 144 100 L146 196 C138 206 132 194 124 202 C116 210 110 196 100 204 C90 212 84 196 76 202 C68 208 62 196 54 200 Z', g(sheet, 'gh'))}
        ${gloss(76, 54, 10, 6)}
        ${S("M68 52 C74 37 87 30 100 30 C113 30 126 37 132 52 Q117 44 100 56 Q83 44 68 52Z", g("#2a2433", "hr"), 2)}
        ${face(100, 76, 13, mood, { my: 12, fang: true })}
        ${S('M80 124 Q100 136 120 124 L118 134 Q100 144 82 134Z', '#1f1b26', 2)}
        <circle cx="100" cy="138" r="6" fill="#e9b949" stroke="${INK}" stroke-width="2"/><circle cx="100" cy="138" r="2.4" fill="#b8283a"/></g>`;
      return shadow(34) + `<g class="float">` + cape + collar + `<g class="arm-l">${limb('M60 120 Q46 134 44 150', sheet, 14)}${hand(44, 154, sheet, 9)}</g>`
        + ghost + `<g class="arm-r">${limb('M140 120 Q156 108 158 90', sheet, 14)}${hand(158, 84, sheet, 9)}</g></g>`;
    },

    /* The Ghostly Trio, the house crew. Swirly tails instead of a sheet hem. */
    stretch(g, mood) {
      // the dispatcher: tall ringmaster, top hat and bow tie, pointing out work
      const c = '#cfe6c8';
      const quiet = mood === 'sleep' || mood === 'happy';
      const body = `<g class="head">
        ${S('M74 70 C72 34 86 8 102 8 C120 8 132 34 130 70 C128 104 126 132 122 158 C118 184 130 198 150 192 C140 212 110 214 100 194 C92 178 86 150 82 122 C79 104 76 88 74 70Z', g(c, 'st'))}
        ${hatch('M116 12 C126 30 130 50 130 70 C128 104 126 132 122 158 L114 160 C118 120 122 60 116 12Z')}
        ${gloss(88, 30, 5, 11, -12)}
        ${face(102, 56, 11, mood, { mouth: false, blush: '#93cf8c' })}
        ${quiet ? line('M96 72 Q103 76 110 70', INK, 2.2) : line('M94 72 Q104 74 112 66', INK, 2.4)}
        ${quiet ? '' : line('M84 42 Q91 37 97 42', INK, 2.6) + line('M107 46 L119 42', INK, 2.6)}
        <g class="hat">${S('M80 16 Q103 24 126 14 L128 19 Q103 30 78 21Z', g('#26222e', 'hb'))}
          ${S('M86 18 L88 -22 Q103 -26 118 -22 L120 16 Q103 22 86 18Z', g('#26222e', 'ht'))}
          ${S('M87 8 Q103 14 119 7 L119.5 13 Q103 19 86.5 14Z', '#8e78f2', 1.6)}
          ${gloss(94, -10, 2.5, 8, -4, .25)}</g>
        ${S('M102 98 L88 90 L88 106Z', '#8e78f2', 2)}${S('M102 98 L116 90 L116 106Z', '#8e78f2', 2)}<circle cx="102" cy="98" r="3.4" fill="#5b47c9" stroke="${INK}" stroke-width="1.6"/></g>`;
      return shadow(26) + `<g class="float"><g class="arm-l">${limb('M80 112 Q66 126 64 144', c, 11)}${hand(64, 148, c, 7.5)}</g>`
        + body + `<g class="arm-r">${limb('M126 108 Q148 98 166 92', c, 11)}${hand(170, 90, c, 7.5)}${S('M176 86 L190 80 L178 92Z', c, 2)}</g></g>`;
    },

    fatso(g, mood) {
      // the Library: huge belly, napkin bib, eats every doc
      const c = '#f3dcb8';
      const quiet = mood === 'sleep';
      const body = `<g class="head">
        ${S('M100 26 C128 26 146 46 148 72 C172 92 178 134 164 162 C152 186 128 198 104 196 C94 206 80 214 60 208 C76 204 80 194 74 184 C50 170 38 144 42 114 C44 90 56 74 68 68 C70 44 80 26 100 26Z', g(c, 'ft'))}
        ${hatch('M146 72 C170 92 176 134 162 162 C150 184 130 194 112 196 C140 170 156 120 146 72Z')}
        ${gloss(78, 46, 9, 5)}${gloss(66, 120, 8, 16, -20, .4)}
        ${face(100, 64, 13, mood, { mouth: false, blush: '#f0a07a' })}
        ${quiet ? line('M92 84 Q100 88 108 84', INK, 2.2)
          : S('M84 80 Q100 98 116 80 Q100 86 84 80Z', '#7a2d3a', 2.2) + '<path d="M88 82 L91 87 L94 83 M106 83 L109 87 L112 82" fill="#fffbe8" stroke="#1d1a22" stroke-width="1"/>'}
        ${S('M74 102 Q100 114 126 102 L114 138 Q100 146 86 138Z', '#fffbf2', 2.2)}
        ${line('M80 104 Q100 112 120 104', '#e46a5a', 2)}<circle cx="94" cy="124" r="1.6" fill="#c98a4a"/><circle cx="107" cy="130" r="1.3" fill="#c98a4a"/>
        ${S('M64 96 Q72 94 74 100 Q70 104 64 102Z', '#fffbf2', 1.6)}${S('M136 96 Q128 94 126 100 Q130 104 136 102Z', '#fffbf2', 1.6)}</g>`;
      const doc = `<g class="prop">${S('M24 128 L52 124 L56 160 Q50 156 46 162 Q42 156 38 162 Q34 156 28 160Z', '#fbfaf6', 2)}
        ${line('M30 134 L48 132 M31 141 L49 139 M32 148 L44 147', '#a8a39a', 1.4)}</g>`;
      return shadow(46) + `<g class="float">` + `<g class="arm-l">${limb('M52 124 Q42 134 42 146', c, 14)}</g>` + doc + body
        + `<g class="arm-r">${limb('M156 120 Q172 108 172 92', c, 14)}${hand(172, 86, c, 9)}</g></g>`;
    },

    stinkie(g, mood) {
      // the watchdog: small, hunched, deerstalker, magnifying glass, big nose
      const c = '#d4d6c4';
      const quiet = mood === 'sleep' || mood === 'happy';
      const body = `<g class="head">
        ${S('M66 98 C62 64 80 42 102 42 C126 42 140 64 138 98 C138 126 132 150 124 168 C118 186 132 198 152 194 C142 212 112 214 104 194 C96 182 88 174 80 162 C70 146 67 122 66 98Z', g(c, 'sk'))}
        ${hatch('M128 52 C136 66 138 82 138 98 C138 126 132 150 124 168 L118 166 C128 130 132 80 128 52Z')}
        ${gloss(80, 70, 7, 4)}
        ${face(100, 82, 12, mood, { mouth: false, blush: '#b6c98a' })}
        ${quiet ? '' : line('M83 72 L95 75', INK, 2.4) + line('M106 74 Q113 70 119 73', INK, 2.4)}
        ${S('M93 88 C86 96 90 108 102 108 C114 108 117 96 109 88 C106 84 96 84 93 88Z', g('#bfc3a8', 'nz'), 2.2)}
        ${gloss(97, 94, 3, 2, -20, .7)}
        ${quiet ? line('M94 116 Q102 120 110 116', INK, 2.2) : S('M92 114 Q102 122 112 113', '#4a2b33', 2) + '<path d="M97 116 h4 v4 h-4z M104 116 h4 v5 h-4z" fill="#f4eed0" stroke="#1d1a22" stroke-width="1"/>'}
        <g class="hat">${S('M68 66 C68 40 136 40 136 66 Q102 58 68 66Z', g('#8a6a45', 'dh'))}
          ${line('M80 50 L84 64 M94 45 L96 61 M110 45 L108 61 M124 50 L120 64 M72 58 Q102 50 132 58', '#6b4f31', 1.3)}
          ${S('M68 66 Q60 70 56 78 Q66 76 74 70Z', '#7a5c3a', 1.8)}${S('M136 66 Q144 70 148 78 Q138 76 130 70Z', '#7a5c3a', 1.8)}
          <circle cx="102" cy="42" r="3" fill="#6b4f31" stroke="#1d1a22" stroke-width="1.4"/></g></g>`;
      const stink = `<g class="stink">${[0, 1, 2].map(i => line(`M${40 + i * 9} ${84 - i * 5} q-6 -8 0 -16 q6 -8 0 -16`, '#9cc46a', 2.6)).join('')}</g>`;
      const glass = `<g class="arm-r">${limb('M134 116 Q152 106 158 94', c, 11)}${hand(158, 90, c, 7.5)}
        ${line('M160 86 L168 72', '#6b4f31', 4.5)}<circle cx="174" cy="62" r="12" fill="rgba(200,230,255,.35)" stroke="#1d1a22" stroke-width="3"/>${gloss(170, 57, 3, 5, -30, .8)}</g>`;
      return shadow(30) + `<g class="float"><g class="arm-l">${limb('M70 118 Q58 132 58 146', c, 11)}${hand(58, 150, c, 7.5)}</g>`
        + stink + body + glass + `</g>`;
    },
  };

  /* head crops for small avatars (x, y, w, h) */
  const CROP = { casper: '42 22 116 116', pumpkin: '40 18 120 120', bat: '36 0 128 128', candle: '50 2 100 100', moon: '42 28 116 116', cat: '42 22 116 116', stretch: '44 -30 116 116', fatso: '34 14 132 132', stinkie: '46 30 112 112' };

  /* ---------- shared defs + motion ---------- */
  const defs = () => {
    if (document.getElementById('cast-defs')) return;
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.id = 'cast-defs'; s.setAttribute('width', 0); s.setAttribute('height', 0); s.style.position = 'absolute';
    s.innerHTML = `<defs>
      <filter id="ch-ink" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="1.8"/></filter>
      <filter id="ch-soft" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="2.4"/></filter>
      <filter id="ch-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4"/></filter>
      <pattern id="ch-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="1.3" height="4" fill="#1d1a22"/></pattern>
      <linearGradient id="ch-fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".55" stop-color="#ffb43c"/><stop offset="1" stop-color="#f06a1d"/></linearGradient>
    </defs>`;
    document.body.prepend(s);
    const st = document.createElement('style');
    st.textContent = `
      .ch{overflow:visible;display:block;width:100%;height:100%}
      .ch.crop{overflow:hidden}
      .ch *{transform-box:view-box}
      .ch .bob{transform-origin:100px 224px;animation:ch-bob var(--bo,2.6s) ease-in-out infinite;animation-delay:var(--d)}
      .ch .float{animation:ch-float 3.2s ease-in-out infinite;animation-delay:var(--d)}
      .ch .head{transform-origin:100px 118px;animation:ch-tilt var(--tl,6s) ease-in-out infinite;animation-delay:var(--d)}
      .ch .arm-r{transform-origin:128px 128px;animation:ch-wave var(--wv,4.2s) ease-in-out infinite;animation-delay:var(--d)}
      .ch.k-casper .arm-r{transform-origin:140px 120px}
      .ch.k-candle .arm-r{transform-origin:130px 128px}
      .ch .arm-l{transform-origin:72px 128px;animation:ch-swing 2.6s ease-in-out infinite;animation-delay:var(--d)}
      .ch .prop{transform-origin:60px 170px;animation:ch-swing 2.6s ease-in-out infinite;animation-delay:var(--d)}
      .ch .leg-r{animation:ch-tap var(--tp,5s) ease-in-out infinite;animation-delay:var(--d)}
      .ch .cape{transform-origin:100px 110px;animation:ch-cape 2.2s ease-in-out infinite alternate}
      .ch .tail{transform-origin:126px 182px;animation:ch-tail 1.8s ease-in-out infinite alternate}
      .ch .hat{transform-origin:100px 54px;animation:ch-hat 3s ease-in-out infinite alternate}
      .ch .eye{transform-box:fill-box;transform-origin:center;animation:ch-blink var(--bl,5s) infinite;animation-delay:var(--d)}
      .ch .look{animation:ch-look 8s ease-in-out infinite;animation-delay:var(--d)}
      .ch .flame{transform-box:fill-box;transform-origin:50% 100%;animation:ch-flick .45s ease-in-out infinite alternate}
      .ch .glow{animation:ch-glowp 1.5s ease-in-out infinite alternate}
      .ch .stink{animation:ch-stink 2.4s ease-in-out infinite}
      .ch.still *{animation:none!important}
      @keyframes ch-bob{0%,100%{transform:translateY(0) scale(1,1)}50%{transform:translateY(-3px) scale(1.012,.99)}}
      @keyframes ch-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
      @keyframes ch-tilt{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2.5deg)}}
      @keyframes ch-wave{0%,40%,100%{transform:rotate(0)}48%{transform:rotate(-16deg)}56%{transform:rotate(8deg)}64%{transform:rotate(-16deg)}72%{transform:rotate(8deg)}80%{transform:rotate(0)}}
      @keyframes ch-swing{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(4deg)}}
      @keyframes ch-tap{0%,70%,100%{transform:translateY(0)}78%{transform:translateY(-5px)}86%{transform:translateY(0)}}
      @keyframes ch-cape{0%{transform:skewX(-2.5deg)}100%{transform:skewX(2.5deg)}}
      @keyframes ch-tail{0%{transform:rotate(-6deg)}100%{transform:rotate(8deg)}}
      @keyframes ch-hat{0%{transform:rotate(-3deg)}100%{transform:rotate(4deg)}}
      @keyframes ch-blink{0%,92%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
      @keyframes ch-look{0%,30%{transform:translate(0,0)}36%,52%{transform:translate(-2px,.5px)}58%,74%{transform:translate(2px,0)}80%,100%{transform:translate(0,0)}}
      @keyframes ch-flick{0%{transform:scale(.93,1.05) rotate(-3deg)}100%{transform:scale(1.05,.95) rotate(3deg)}}
      @keyframes ch-stink{0%{transform:translateY(6px);opacity:0}30%{opacity:1}100%{transform:translateY(-10px);opacity:0}}
      @keyframes ch-glowp{0%{opacity:.45}100%{opacity:.85}}
      @media (prefers-reduced-motion:reduce){.ch *{animation:none!important}}`;
    document.head.appendChild(st);
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function svg(kind, { mood = 'calm', crop = 'full', still = false, title } = {}) {
    defs();
    const id = 'ch' + (++n), grads = [];
    const k = DRAW[kind] ? kind : 'casper';
    const art = DRAW[k](shade(id, grads), mood);
    const vb = crop === 'head' ? CROP[k] : k === 'stretch' ? '-10 -34 220 268' : '0 -6 200 240';
    const vars = `--d:${(-(n * 1.37) % 4).toFixed(2)}s;--bo:${(2.4 + (n % 4) * .2).toFixed(1)}s;--wv:${(3.8 + (n % 3) * .7).toFixed(1)}s;--bl:${(4.4 + (n % 5) * .6).toFixed(1)}s;--tl:${(5.5 + (n % 3)).toFixed(1)}s;--tp:${(4.5 + (n % 4) * .6).toFixed(1)}s`;
    return `<svg class="ch k-${k}${crop === "head" ? " crop" : ""}${still ? ' still' : ''}" viewBox="${vb}" style="${vars}" role="img" aria-label="${esc(title || k)}">
      <defs>${grads.join('')}</defs><g filter="url(#ch-ink)"><g class="bob">${art}</g></g></svg>`;
  }
  function mountAll(root = document) {
    root.querySelectorAll('[data-cast]').forEach(el => {
      if (el.dataset.mounted) return;
      el.dataset.mounted = 1;
      el.innerHTML = svg(el.dataset.cast, { mood: el.dataset.mood || 'calm', crop: el.dataset.crop || 'full', still: el.hasAttribute('data-still') });
    });
  }
  return { svg, mountAll };
})();

export default Cast;
