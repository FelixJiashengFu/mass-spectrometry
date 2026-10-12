/* 水墨质谱图：棒图、选峰题跋、丢失弧线、弱峰放大、碳数小算盘。无依赖。 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const registry = {};
  let uid = 0;

  function svg(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // 'C7H7^+' → C<sub>7</sub>H<sub>7</sub><sup>+</sup>；'{13}C' → <sup>13</sup>C
  function f(s) {
    return '<span class="chem">' + String(s)
      .replace(/\{(\d+)\}/g, '<sup>$1</sup>')
      .replace(/([A-Za-z)\]])(\d+)/g, '$1<sub>$2</sub>')
      .replace(/\^(\S+)/g, '<sup>$1</sup>') + '</span>';
  }
  // 正文里的 Unicode 上下标换成真正的 sub / sup，避免中文字体把它们撑宽
  const SUB = '₀₁₂₃₄₅₆₇₈₉', SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻', SUPV = '0123456789+−';
  function uni(s) {
    return String(s)
      .replace(/[₀-₉]+/g, (t) => '<sub>' + [...t].map((c) => SUB.indexOf(c)).join('') + '</sub>')
      .replace(/[⁰¹²³⁴-⁹⁺⁻]+•?/g, (t) => '<sup>' + [...t].map((c) => (c === '•' ? c : SUPV[SUP.indexOf(c)])).join('') + '</sup>')
      .replace(/•(?![^<]*<\/sup>)/g, '<span class="chem">•</span>');
  }
  // SVG 文字里的化学式：字母后的数字降为下标
  function svgChem(t, s) {
    String(s).split(/(?<=[A-Za-z])(\d+)/).forEach((part, i) => {
      if (!part) return;
      const ts = svg('tspan', i % 2 ? { 'font-size': '9.5', dy: 3 } : (i ? { dy: -3 } : {}), t);
      ts.textContent = part;
    });
  }
  const num = (v) => String(v);

  function mount(cfg) {
    const host = document.querySelector(cfg.el);
    const panel = document.querySelector(cfg.panel);
    const chips = cfg.chips ? document.querySelector(cfg.chips) : null;
    const table = cfg.table ? document.querySelector(cfg.table) : null;
    const zoomBtn = cfg.zoom ? document.querySelector(cfg.zoom) : null;
    const id = ++uid;
    const W = 1000, H = cfg.height || 480;
    const m = { l: 58, r: 20, t: 104, b: 46 };
    const [x0, x1] = cfg.range;
    const peaks = cfg.peaks.slice().sort((a, b) => a.mz - b.mz);
    const links = cfg.links || [];
    const byMz = {};
    peaks.forEach((p) => { byMz[p.mz] = p; });
    const base = H - m.b;
    const unit = (W - m.l - m.r) / (x1 - x0);
    const X = (mz) => m.l + (mz - x0) * unit;
    let ymax = 100, current = null;
    let root, arcLayer, haloLayer, hov;

    const Y = (I) => base - (Math.min(I, ymax) / ymax) * (base - m.t);
    const top = (p) => (p.ghost ? Y(ymax * 0.16) : Math.min(Y(p.I), base - 1.5));

    function draw() {
      host.innerHTML = '';
      root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': cfg.title || '质谱图' }, host);
      const defs = svg('defs', {}, root);
      const rough = svg('filter', { id: `rough${id}`, filterUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H }, defs);
      svg('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.04 0.16', numOctaves: 2, seed: 4 + id, result: 'n' }, rough);
      svg('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 3, xChannelSelector: 'R', yChannelSelector: 'G' }, rough);
      const blur = svg('filter', { id: `blur${id}`, filterUnits: 'userSpaceOnUse', x: 0, y: 0, width: W, height: H }, defs);
      svg('feGaussianBlur', { stdDeviation: 7 }, blur);
      ['in', 'out'].forEach((k) => {
        const mk = svg('marker', { id: `mk-${k}${id}`, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
        svg('path', { d: 'M0 1 L9 5 L0 9 Z', class: `mk-${k}` }, mk);
      });

      // 纵轴刻度
      [0.5, 1].forEach((t) => {
        const y = Y(ymax * t);
        svg('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, class: 'grid' }, root);
        svg('text', { x: m.l - 10, y: y + 4, 'text-anchor': 'end' }, root).textContent = num(ymax * t);
      });
      svg('text', { x: m.l - 10, y: base + 4, 'text-anchor': 'end' }, root).textContent = '0';
      const yn = svg('text', { x: 16, y: (base + m.t) / 2, class: 'axis-name', 'text-anchor': 'middle', transform: `rotate(-90 16 ${(base + m.t) / 2})` }, root);
      yn.textContent = ymax === 100 ? '相对强度' : `相对强度 · 放大 ${100 / ymax} 倍`;

      // 墨晕
      const bleed = svg('g', { filter: `url(#blur${id})` }, root);
      peaks.forEach((p) => {
        if (p.ghost || p.I < 20) return;
        svg('ellipse', { cx: X(p.mz), cy: base - 4, rx: 10 + p.I * 0.16, ry: 5 + p.I * 0.1, class: 'bleed' }, bleed);
      });
      haloLayer = svg('g', { filter: `url(#blur${id})` }, root);

      // 横轴
      const step = cfg.tick || 10;
      for (let v = Math.ceil(x0 / step) * step; v <= x1; v += step) {
        svg('line', { x1: X(v), x2: X(v), y1: base, y2: base + 7, class: 'tick' }, root);
        svg('text', { x: X(v), y: base + 24, 'text-anchor': 'middle' }, root).textContent = v;
      }
      if (cfg.minor) {
        for (let v = Math.ceil(x0 / cfg.minor) * cfg.minor; v <= x1; v += cfg.minor) {
          svg('line', { x1: X(v), x2: X(v), y1: base, y2: base + 3.5, class: 'tick' }, root);
        }
      }
      svg('text', { x: W - m.r, y: base + 42, 'text-anchor': 'end', class: 'axis-name' }, root).textContent = 'm/z';

      // 笔触
      const ink = svg('g', { filter: `url(#rough${id})` }, root);
      svg('path', { d: `M${m.l - 6} ${base} L${W - m.r + 6} ${base}`, class: 'axis' }, ink);
      svg('path', { d: `M${m.l} ${base} L${m.l} ${m.t - 14}`, class: 'axis', 'stroke-width': 1.6 }, ink);
      peaks.forEach((p) => {
        const x = X(p.mz), y = top(p);
        if (p.ghost) {
          p.node = svg('line', { x1: x, x2: x, y1: base, y2: y, class: 'ghost' }, root);
          return;
        }
        const w = 1.3 + 3 * Math.sqrt(Math.min(p.I, ymax) / ymax);
        p.node = svg('polygon', {
          points: `${x - w},${base} ${x - w * 0.4},${y} ${x + w * 0.4},${y} ${x + w},${base}`,
          class: 'stick' + (p.I > ymax ? ' clipped' : ''),
        }, ink);
      });

      // 峰标
      peaks.forEach((p) => {
        if (!p.lab) { p.text = null; return; }
        p.text = svg('text', { x: X(p.mz) + (p.dx || 0), y: top(p) - 9 + (p.dy || 0), class: 'lab' }, root);
        p.text.textContent = p.mz;
      });

      arcLayer = svg('g', {}, root);
      hov = svg('text', { class: 'hov', x: 0, y: 0 }, root);

      // 点击区：弱峰压在强峰之上
      const hw = Math.max(unit / 2, 4);
      peaks.slice().sort((a, b) => b.I - a.I).forEach((p) => {
        const r = svg('rect', { x: X(p.mz) - hw, y: m.t - 20, width: hw * 2, height: base - m.t + 20, class: 'hit' }, root);
        r.addEventListener('click', () => select(p.mz));
        r.addEventListener('mouseenter', () => {
          hov.textContent = p.ghost ? `m/z ${p.mz} · 未出现` : `m/z ${p.mz} · ${num(p.I)}`;
          const x = Math.min(Math.max(X(p.mz), m.l + 50), W - m.r - 50);
          hov.setAttribute('x', x);
          hov.setAttribute('y', Math.max(top(p) - 28, 14));
        });
        r.addEventListener('mouseleave', () => { hov.textContent = ''; });
      });
    }

    function arcs(mz) {
      arcLayer.innerHTML = '';
      // 同位素关系（+1、+2）紧挨着，只在题跋里列出，不画弧
      const rel = links.filter((l) => (l.to === mz || l.from === mz) && l.loss.indexOf('+') < 0);
      rel.forEach((l, k) => {
        const a = byMz[l.from], b = byMz[l.to];
        if (!a || !b) return;
        const kind = l.to === mz ? 'in' : 'out';
        const xa = X(a.mz), ya = top(a) - (a.lab ? 26 : 6), xb = X(b.mz), yb = top(b) - (b.lab ? 26 : 6);
        const cy = Math.max(Math.min(ya, yb) - 54 - k * 22, 40 + (k % 3) * 30 - (ya + yb) / 2);
        const cx = (xa + xb) / 2;
        svg('path', { d: `M${xa} ${ya} Q${cx} ${cy} ${xb} ${yb}`, class: `arc ${kind}`, 'marker-end': `url(#mk-${kind}${id})` }, arcLayer);
        const ty = (ya + yb) / 4 + cy / 2 - 6;
        const t = svg('text', { x: Math.min(Math.max(cx, m.l + 60), W - m.r - 60), y: ty, class: `arc-t ${kind}` }, arcLayer);
        svgChem(t, l.loss);
      });
    }

    function renderPanel(p) {
      const origin = links.filter((l) => l.to === p.mz);
      const fate = links.filter((l) => l.from === p.mz);
      const intensity = p.ghost ? '谱图中未出现' : `相对强度 ${num(p.I)}${p.I === 100 ? ' · 基峰' : ''}`;
      const row = (l, other) => `<div><button type="button" data-go="${other}">${l.from} → ${l.to}<em>${f(l.loss)}</em></button>${l.note ? `<small>${uni(l.note)}</small>` : ''}</div>`;
      panel.innerHTML =
        `<div class="p-mz"><b class="num">${p.mz}</b><span>m/z</span><span>${intensity}</span></div>` +
        (p.ion ? `<div class="p-ion">${f(p.ion)}</div>` : '') +
        (p.name ? `<div class="p-name">${uni(p.name)}</div>` : '') +
        (p.note ? `<p>${uni(p.note)}</p>` : '') +
        (origin.length ? `<h4>怎么来的</h4><div class="p-links">${origin.map((l) => row(l, l.from)).join('')}</div>` : '') +
        (fate.length ? `<h4>还会碎成</h4><div class="p-links">${fate.map((l) => row(l, l.to)).join('')}</div>` : '');
      panel.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => select(+b.dataset.go)));
    }

    function select(mz) {
      const p = byMz[mz];
      if (!p) return;
      current = mz;
      const kin = new Set();
      links.forEach((l) => { if (l.to === mz) kin.add(l.from); if (l.from === mz) kin.add(l.to); });
      peaks.forEach((q) => {
        q.node.classList.toggle('on', q.mz === mz);
        if (q.text) q.text.classList.toggle('on', q.mz === mz);
      });
      haloLayer.innerHTML = '';
      svg('circle', { cx: X(mz), cy: top(p), r: 20, class: 'halo' }, haloLayer);
      arcs(mz);
      renderPanel(p);
      if (chips) chips.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.mz === mz)));
    }

    if (chips) {
      peaks.filter((p) => p.lab || p.chip).forEach((p) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.mz = p.mz;
        b.textContent = p.mz;
        b.addEventListener('click', () => select(p.mz));
        chips.appendChild(b);
      });
    }
    if (table) {
      table.innerHTML = '<table><thead><tr><th>m/z</th><th class="r">相对强度</th><th>离子</th></tr></thead><tbody>' +
        peaks.filter((p) => !p.ghost).map((p) => `<tr><td><button type="button" data-mz="${p.mz}">${p.mz}</button></td><td class="r">${num(p.I)}</td><td class="ion">${p.ion ? f(p.ion) : ''}</td></tr>`).join('') +
        '</tbody></table>';
      table.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
        select(+b.dataset.mz);
        host.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }));
    }
    if (zoomBtn) {
      zoomBtn.addEventListener('click', () => {
        ymax = ymax === 100 ? (cfg.zoomTo || 10) : 100;
        zoomBtn.setAttribute('aria-pressed', String(ymax !== 100));
        draw();
        select(current);
      });
    }

    draw();
    select(cfg.start != null ? cfg.start : peaks[0].mz);
    registry[cfg.el] = { select };
    return registry[cfg.el];
  }

  // 由 M+1 / M 估碳数
  function carbonCalc(sel, init) {
    const box = document.querySelector(sel);
    box.classList.add('calc');
    box.innerHTML =
      `<label>M 峰强度<input type="number" step="any" min="0" value="${init.m}"></label>` +
      `<label>M+1 峰强度<input type="number" step="any" min="0" value="${init.m1}"></label>` +
      '<output></output>';
    const [a, b] = box.querySelectorAll('input');
    const out = box.querySelector('output');
    const run = () => {
      const M = +a.value, M1 = +b.value;
      if (!(M > 0) || !(M1 >= 0)) { out.textContent = '填两个正数'; return; }
      const n = (M1 / M) / 0.011;
      out.innerHTML = `碳数 ≈ ${n.toFixed(2)} → 最多 <b>${Math.round(n)}</b> 个碳`;
    };
    a.addEventListener('input', run);
    b.addEventListener('input', run);
    run();
  }

  function decorate() {
    document.querySelectorAll('header.top').forEach((head, i) => {
      const s = svg('svg', { viewBox: '0 0 600 220', class: 'hills', 'aria-hidden': 'true' });
      const d = svg('defs', {}, s);
      const b1 = svg('filter', { id: `hb1-${i}` }, d); svg('feGaussianBlur', { stdDeviation: 4 }, b1);
      const b2 = svg('filter', { id: `hb2-${i}` }, d); svg('feGaussianBlur', { stdDeviation: 1.6 }, b2);
      svg('circle', { cx: 468, cy: 44, r: 15, class: 'sun' }, s);
      svg('path', { d: 'M0 220 L0 160 Q60 126 110 140 T200 92 Q240 60 282 104 T380 84 Q430 52 472 98 T600 124 L600 220Z', class: 'far', filter: `url(#hb1-${i})` }, s);
      svg('path', { d: 'M0 220 L0 196 Q80 158 150 180 T300 156 Q360 128 420 170 T600 176 L600 220Z', class: 'near', filter: `url(#hb2-${i})` }, s);
      head.insertBefore(s, head.firstChild);
    });
    document.querySelectorAll('[data-f]').forEach((e) => { e.innerHTML = f(e.textContent); });
    document.querySelectorAll('[data-sel]').forEach((e) => {
      e.addEventListener('click', () => {
        const inst = registry[e.dataset.spec || '#spec'];
        if (!inst) return;
        inst.select(+e.dataset.sel);
        document.querySelector(e.dataset.spec || '#spec').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  window.InkSpectrum = { mount, carbonCalc, decorate, f };
})();
