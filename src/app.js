// ===== ひっ算おたすけ君：画面 =====
(function () {
  'use strict';
  const H = window.HISSAN, C = 56, VER = '1.0.0';
  const $ = id => document.getElementById(id);
  const rb = s => String(s).replace(/(\d+(?:[＋−×÷＝]\d+)+)/g, '<span class="nb">$1</span>').replace(/\{([^|}]+)\|([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
  const pick = a => a[Math.floor(Math.random() * a.length)];

  // ---- 効果音（ファイルを差しかえるときは ここの名前を そのままに） ----
  const SE_SRC = { ok: 'assets/se/ok.mp3', ng: 'assets/se/ng.mp3', btn: 'assets/se/btn.mp3', pop: 'assets/se/pop.mp3',
    tap: 'assets/se/tap.mp3', cheer: 'assets/se/cheer.mp3', clear: 'assets/se/clear.mp3' };
  const VOL = { ok: .6, ng: .55, btn: .5, pop: .55, tap: .45, cheer: .55, clear: .65 };
  const SE = {};
  for (const k in SE_SRC) { try { SE[k] = new Audio(SE_SRC[k]); SE[k].preload = 'auto'; } catch (e) { } }
  function se(k) {
    if (!S.sound || !SE[k]) return;
    try { const a = SE[k].cloneNode(); a.volume = VOL[k]; const p = a.play(); if (p) p.catch(() => { }); } catch (e) { }
  }

  // ---- せってい・じょうたい ----
  const S = { carry: 'up', borrow: 'up', sound: true };
  const st = { phase: 'formula', f: '', fmsg: null, prob: null, plan: null, idx: 0, inp: '', post: false, msg: null, timer: null };
  const cur = () => (st.plan && st.idx < st.plan.steps.length ? st.plan.steps[st.idx] : null);
  const SYM = { '+': '＋', '-': '−', '*': '×', '/': '÷' };
  const NAME = { '+': 'たし{算|ざん}', '-': 'ひき{算|ざん}', '*': 'かけ{算|ざん}', '/': 'わり{算|ざん}' };

  // ---- ステージを 画面に あわせる ----
  function fit() {
    const s = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
    $('stage').style.transform = `translate(-50%,-50%) scale(${s})`;
  }
  window.addEventListener('resize', fit);

  // ---- 5mm方眼ノート ----
  function drawGrid() {
    const W = H.COLS * C, Hh = H.ROWS * C, h = C / 2;
    let s = `<rect x="0" y="0" width="${W}" height="${Hh}" fill="#fff"/>`;
    for (let x = h; x < W; x += C) s += `<line x1="${x}" y1="0" x2="${x}" y2="${Hh}" stroke="#9fd3ea" stroke-width="1" stroke-dasharray="2 3"/>`;
    for (let y = h; y < Hh; y += C) s += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#9fd3ea" stroke-width="1" stroke-dasharray="2 3"/>`;
    for (let x = C; x < W; x += C) s += `<line x1="${x}" y1="0" x2="${x}" y2="${Hh}" stroke="#4aaad6" stroke-width="1.6"/>`;
    for (let y = C; y < Hh; y += C) s += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#4aaad6" stroke-width="1.6"/>`;
    s += `<line x1="${C}" y1="0" x2="${C}" y2="${C}" stroke="#2b8fc4" stroke-width="2.4"/>`;
    s += `<rect x="0" y="0" width="${W}" height="${Hh}" fill="none" stroke="#2b8fc4" stroke-width="3.5"/>`;
    const t = (x, y, v, a) => `<text x="${x}" y="${y}" font-size="13" fill="#2b8fc4" text-anchor="${a || 'middle'}" font-family="sans-serif">${v}</text>`;
    for (let u = 5; u * h < W; u += 5) { s += t(u * h, -5, u); s += t(u * h, Hh + 16, u); }
    for (let u = 5; u * h < Hh; u += 5) { s += t(-9, u * h + 4, u); s += t(W + 9, u * h + 4, u); }
    s += t(W, Hh + 34, '(5mm方眼)', 'end');
    $('grid').innerHTML = s;
  }

  // ---- 印の じょうたいを つくる ----
  function ap(m, add, del) { (add || []).forEach(x => m.set(x.id, x)); (del || []).forEach(id => m.delete(id)); }
  function marksAt(idx, withPre) {
    const m = new Map(), P = st.plan, ss = P.steps;
    ap(m, P.base);
    for (let k = 0; k < idx && k < ss.length; k++) { ap(m, ss[k].pre, ss[k].preDel); ap(m, ss[k].add, ss[k].del); }
    if (withPre && idx < ss.length) ap(m, ss[idx].pre, ss[idx].preDel);
    if (idx >= ss.length) ap(m, P.fin);
    return m;
  }
  function formulaMarks() {
    const m = new Map();
    [...st.f].forEach((ch, i) => m.set('f' + i, { id: 'f' + i, r: 0, c: i + 1, t: SYM[ch] || ch, k: 'f' }));
    return m;
  }

  // ---- かく ----
  function render(o) {
    o = o || {};
    const nw = o.nw || new Set(), late = o.late || new Set();
    let marks;
    if (st.phase === 'formula') marks = formulaMarks();
    else marks = marksAt(st.idx, !st.post);
    // 数字
    let h = '', lines = '';
    for (const m of marks.values()) {
      if (m.k === 'L') {
        const y = (m.r + 1) * C, cls = nw.has(m.id) ? ' class="dr"' : '';
        lines += `<line${cls} x1="${m.c1 * C + 4}" y1="${y}" x2="${(m.c2 + 1) * C - 4}" y2="${y}" stroke="#1c2233" stroke-width="3.2" stroke-linecap="round"/>`;
        continue;
      }
      if (m.k === 'br') {
        const x = m.c * C, y = m.r * C;
        lines += `<path d="M${x - 2} ${y - 1} Q${x + 18} ${y + C / 2} ${x - 2} ${y + C + 1}" fill="none" stroke="#1c2233" stroke-width="3.2" stroke-linecap="round"/>`;
        continue;
      }
      let cls = 'mk ' + m.k, x = m.c * C, y = m.r * C;
      if (m.k === 's') {
        if (m.p === 'b') { x += 14; y += 27; } else if (m.p === 'tr') { x += 34; y -= 6; cls += ' sm'; } else { x += 1; y += 1; }
      }
      if (m.u) cls += ' u';
      if (m.cl) cls += ' ' + m.cl;
      if (m.x) cls += ' x';
      if (m.g) cls += ' g';
      if (nw.has(m.id)) cls += ' nw';
      if (late.has(m.id)) cls += ' late';
      h += `<div class="${cls}" style="left:${x}px;top:${y}px">${m.t}</div>`;
    }
    $('markL').innerHTML = h;
    $('lineL').innerHTML = lines;
    // 蛍光ペン
    let hh = '';
    const s = cur();
    if (st.phase === 'solve' && s && !st.post) {
      const cells = (s.hl || []).filter(([r, c]) => r > 0 && (r !== 2 || [...marks.values()].some(m => m.r === 2 && m.c === c) || st.prob.op === '/')).slice().sort((p, q) => p[1] - q[1] || p[0] - q[0]);
      const runs = [];
      cells.forEach(([r, c]) => {
        const last = runs[runs.length - 1];
        if (last && last.c === c && last.r2 === r - 1) last.r2 = r; else runs.push({ c, r1: r, r2: r });
      });
      runs.forEach((u, i) => {
        hh += `<div class="hl" style="left:${u.c * C + 5}px;top:${u.r1 * C + 3}px;width:${C - 10}px;height:${(u.r2 - u.r1 + 1) * C - 6}px;animation-delay:${i * 0.08}s"></div>`;
      });
    }
    $('hlL').innerHTML = hh;
    renderBox();
    renderSay();
    renderBtns();
  }

  function boxInfo() {
    if (st.phase === 'formula') return { r: 0, c: 9, w: 9, f: true };
    const s = cur();
    if (st.phase !== 'solve' || !s || st.post || s.type !== 'in') return null;
    return { r: s.box.r, c: s.box.c, w: Math.max(s.box.w, st.inp.length) };
  }
  function renderBox(shake) {
    const b = boxInfo(), L = $('boxL');
    if (!b) { L.innerHTML = ''; return; }
    const left = (b.c - b.w + 1) * C, top = b.r * C;
    let inner = '';
    if (b.f) {
      [...st.f].forEach((ch, i) => { inner += `<div class="bd f" style="left:${i * C}px">${SYM[ch] || ch}</div>`; });
      if (st.f.length < 9) inner += `<div class="caret" style="left:${st.f.length * C + 12}px"></div>`;
    } else {
      const t = st.inp;
      [...t].forEach((ch, i) => { inner += `<div class="bd" style="left:${(b.w - t.length + i) * C}px">${ch}</div>`; });
      if (!t) inner += `<div class="caret" style="left:${(b.w - 1) * C + 12}px"></div>`;
    }
    L.innerHTML = `<div class="box${shake ? ' shake' : ''}" id="theBox" style="left:${left - 4}px;top:${top - 4}px;width:${b.w * C + 8}px;height:${C + 8}px">${inner}</div>`;
    // 中の数字は ノートのマスに ぴったり
    L.querySelectorAll('.bd').forEach(d => { d.style.top = '0px'; });
  }

  // ---- ふきだし ----
  function renderSay() {
    const el = $('say'), bt = $('sayBtns');
    let html = '', btns = '';
    const s = cur();
    if (st.phase === 'formula') {
      html = st.fmsg ? `<div class="ng">${rb(st.fmsg)}</div>` : rb('まず {赤|あか}い わくに {式|しき}を {入|い}れよう');
      if (!st.fmsg && st.f) html = rb('{入|い}れたら<br>「けってい」を おそう');
    } else if (st.phase === 'done') {
      html = `<div class="ok">${st.msg || ''}</div>`;
    } else if (st.post) {
      html = `<div class="ok">${rb(st.msg || 'せいかい！')}</div>`;
    } else if (s) {
      html = st.msg ? `<div class="ng">${rb(st.msg)}</div><div class="sub">${rb(s.say)}</div>` : rb(s.say);
      if (s.type === 'info') btns += `<button class="gb g-green sm" data-act="next">つぎへ<svg viewBox="0 0 32 32"><path d="M13 7l9 9-9 9"/></svg></button>`;
      else if (s.assist && (s.ask || st.msg)) btns += `<button class="gb g-pink sm" data-act="assist">アシストを みる？</button>`;
    }
    bt.innerHTML = btns;
    el.classList.toggle('btns', !!btns);
    el.innerHTML = `<div>${html}</div>`;
    // はみ出さないように 文字を 小さく
    let fs = 40; el.style.fontSize = fs + 'px';
    while ((el.scrollHeight > el.clientHeight + 1) && fs > 20) { fs -= 2; el.style.fontSize = fs + 'px'; }
  }
  $('sayBtns').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.act === 'next') { nextInfo(); }
    if (b.dataset.act === 'assist') { const s = cur(); if (s && s.assist) openAssist(s.assist); }
  });

  function renderBtns() {
    $('bBack').disabled = st.phase === 'formula';
    $('bFwd').disabled = st.phase === 'done' || (st.phase === 'formula' && !st.f);
    $('bReset').disabled = st.phase === 'formula' && !st.f;
    const s = cur();
    const opOn = st.phase === 'formula';
    const numOn = st.phase === 'formula' || (st.phase === 'solve' && !st.post && s && s.type === 'in');
    document.querySelectorAll('#pad .gb').forEach(b => {
      const k = b.dataset.k;
      if ('+-*/'.includes(k)) b.disabled = !opOn;
      else if (k === 'OK') b.disabled = !(opOn || (st.phase === 'solve' && !st.post && s));
      else b.disabled = !numOn;
    });
  }

  // ---- テンキー ----
  function buildPad() {
    const K = [['7'], ['8'], ['9'], ['+', '＋', 'op g-orange'], ['4'], ['5'], ['6'], ['-', '−', 'op g-orange'],
      ['1'], ['2'], ['3'], ['*', '×', 'op g-orange'], ['0', '0', 'w2'], ['BS', '⌫', 'g-gray'], ['/', '÷', 'op g-orange'], ['OK', 'けってい', 'w4 g-green']];
    $('pad').innerHTML = K.map(([k, t, c]) => `<button class="gb ${c && c.includes('g-') ? '' : 'g-pearl'} ${c || ''}" data-k="${k}">${t || k}</button>`).join('');
    $('pad').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) key(b.dataset.k, true); });
  }

  // ---- 入力 ----
  function key(k, fromPad) {
    if (!$('modal').hidden) return;
    if (st.phase === 'formula') {
      if (/^\d$/.test(k) || '+-*/'.includes(k)) addF(k);
      else if (k === 'BS') { st.f = st.f.slice(0, -1); st.fmsg = null; se('tap'); render(); }
      else if (k === 'OK') confirmFormula();
      return;
    }
    if (st.phase !== 'solve' || st.post) return;
    const s = cur(); if (!s) return;
    if (s.type === 'info') { if (k === 'OK') nextInfo(); return; }
    if (/^\d$/.test(k)) {
      if (st.inp.length >= s.max) { renderBox(true); return; }
      st.inp += k; se('tap'); renderBox();
    } else if (k === 'BS') { st.inp = st.inp.slice(0, -1); se('tap'); renderBox(); }
    else if (k === 'OK') check();
  }
  function addF(k) {
    const m = /^(\d*)([+\-*/]?)(\d*)$/.exec(st.f);
    let [, a, op, b] = m;
    st.fmsg = null;
    if ('+-*/'.includes(k)) {
      if (!a) { st.fmsg = 'さきに {数|かず}を {入|い}れてね'; return fail(); }
      if (op && b) { st.fmsg = 'きごうは 1つだけだよ'; return fail(); }
      op = k;
    } else if (!op) {
      if (a.length >= 4) { st.fmsg = '{数|かず}は 4けたまでだよ'; return fail(); }
      a = a === '0' ? k : a + k;
    } else {
      const lim = H.LIM[op][1];
      if (b.length >= lim) { st.fmsg = `${NAME[op]}の うしろの {数|かず}は ${lim}けたまでだよ`; return fail(); }
      b = b === '0' ? k : b + k;
    }
    st.f = a + op + b; se('tap'); render();
  }
  function fail() { se('ng'); render(); renderBox(true); shakeChara(); }

  function confirmFormula() {
    const p = H.parse(st.f);
    if (!p.ok) { st.fmsg = p.msg; return fail(); }
    st.prob = p; st.plan = H.build(p, S); st.phase = 'solve'; st.idx = 0; st.inp = ''; st.msg = null; st.post = false; st.fmsg = null;
    st.f = '';
    se('pop');
    const nw = new Set(st.plan.base.filter(m => m.r > 0).map(m => m.id));
    ap2(nw, cur());
    render({ nw });
  }
  function ap2(set, s) { if (s) (s.pre || []).forEach(m => set.add(m.id)); }

  function check() {
    const s = cur();
    if (!s || s.type !== 'in' || st.post || st.inp === '') { if (s && st.inp === '') renderBox(true); return; }
    if (+st.inp === s.exp) correct(s, false); else wrong(s, +st.inp);
  }
  function correct(s, revealed) {
    se('ok'); hopChara(); closeAssist();
    const typed = st.inp || String(s.exp);
    const box = boxInfo();
    st.post = true;
    st.msg = revealed ? `こたえは ${s.exp}だよ` : (s.ok || pick(['せいかい！', 'いいね！', 'そのとおり！', 'ばっちり！']));
    st.idx++; st.inp = '';
    const nw = new Set((s.add || []).map(m => m.id)), late = new Set();
    if (s.fly) { (s.add || []).forEach(m => { if (m.r === s.fly.to[0] && m.c === s.fly.to[1] && (m.k === 's' || s.fly.from)) late.add(m.id); }); }
    render({ nw, late });
    if (s.fly) {
      const from = s.fly.from || [box.r, box.c - 1];
      const tgt = (s.add || []).find(m => late.has(m.id));
      fly(from, s.fly.to, s.fly.t, tgt && tgt.k === 's' ? tgt.p : null, !!s.fly.from);
    }
    const wait = s.fly ? 1900 : (s.ok || revealed ? 1500 : 850);
    st.timer = setTimeout(afterCorrect, wait);
  }
  function afterCorrect() {
    clearTimeout(st.timer); st.timer = null;
    if (!st.post) return;
    st.post = false; st.msg = null;
    if (st.idx >= st.plan.steps.length) return finish();
    const nw = new Set(); ap2(nw, cur());
    render({ nw });
  }
  function wrong(s, v) {
    se('ng'); shakeChara();
    let m = 'もういちど {考|かんが}えて みよう';
    if (s.wr) {
      const { cur: c, b } = s.wr;
      if (v * b > c) m = `${v}×${b}＝${v * b}で、${c}より {大|おお}きいよ`;
      else if (c - v * b >= b) m = `${c}の {中|なか}に ${b}が まだ はいるよ`;
    }
    st.msg = m; st.inp = '';
    render(); renderBox(true);
    if (s.assist) setTimeout(() => { if (cur() === s && !st.post) openAssist(s.assist); }, 450);
  }
  function nextInfo() {
    const s = cur(); if (!s || s.type !== 'info') return;
    se('btn'); st.idx++; st.msg = null;
    if (st.idx >= st.plan.steps.length) return finish();
    const nw = new Set(); ap2(nw, cur());
    render({ nw });
  }
  function finish() {
    st.phase = 'done'; st.post = false; st.idx = st.plan.steps.length;
    st.msg = pick(['せいかい！<br>よく できたね！', 'やったね！<br>ばっちりだよ！', 'すごい！<br>さいごまで できたね！']);
    se('clear'); setTimeout(() => se('cheer'), 500);
    render({ nw: new Set(st.plan.fin.map(m => m.id)) });
    hanamaru(); confetti(); jumpChara();
    st.timer = setTimeout(() => { $('endCard').hidden = false; $('pad').hidden = true; }, 1600);
  }

  // ---- ボタン ----
  function back() {
    se('btn'); clearTimeout(st.timer); st.timer = null; closeAssist(); hideEnd(); $('fxL').innerHTML = ''; $('flyL').innerHTML = '';
    if (st.phase === 'formula') return;
    if (st.phase === 'done') { st.phase = 'solve'; st.idx = st.plan.steps.length - 1; }
    else if (st.post) { st.post = false; st.idx--; }
    else if (st.idx === 0) { st.phase = 'formula'; st.f = st.plan.formula.replace(/[＋−×÷]/g, c => ({ '＋': '+', '−': '-', '×': '*', '÷': '/' })[c]); st.plan = null; }
    else st.idx--;
    st.inp = ''; st.msg = null; render();
  }
  function fwd() {
    if (st.phase === 'formula') return confirmFormula();
    if (st.phase !== 'solve') return;
    if (st.post) return afterCorrect();
    const s = cur(); if (!s) return;
    if (s.type === 'info') return nextInfo();
    st.inp = String(s.exp); correct(s, true);
  }
  function resetAll() {
    clearTimeout(st.timer); st.timer = null; closeAssist(); hideEnd(); $('fxL').innerHTML = ''; $('flyL').innerHTML = '';
    Object.assign(st, { phase: 'formula', f: '', fmsg: null, prob: null, plan: null, idx: 0, inp: '', post: false, msg: null });
    render();
  }
  function hideEnd() { $('endCard').hidden = true; $('pad').hidden = false; }

  $('bBack').onclick = back;
  $('bFwd').onclick = () => { se('btn'); fwd(); };
  $('bReset').onclick = () => {
    se('pop');
    modal(`<h2>リセットする？</h2><p>いまの けいさんは きえるよ</p>
      <div class="row"><button class="gb g-orange" data-m="yes">リセットする</button><button class="gb g-gray" data-m="no">やめる</button></div>`,
      a => { if (a === 'yes') resetAll(); });
  };
  $('bSet').onclick = () => { se('pop'); openSettings(); };
  $('bNew').onclick = () => { se('btn'); resetAll(); };
  $('bStay').onclick = () => { se('btn'); hideEnd(); };
  $('boxL').addEventListener('click', e => { if (e.target.closest('.box')) { se('tap'); renderBox(); } });

  // ---- モーダル ----
  let mCb = null;
  function modal(html, cb) { $('mCard').innerHTML = html; $('modal').hidden = false; mCb = cb; }
  function closeModal() { $('modal').hidden = true; mCb = null; }
  $('modal').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) { if (e.target.id === 'modal') { se('btn'); closeModal(); } return; }
    if (b.dataset.m) { se('btn'); const cb = mCb; closeModal(); if (cb) cb(b.dataset.m); }
    if (b.dataset.o) {
      se('tap'); const [k, v] = b.dataset.o.split(':'); S[k] = v === 'true' ? true : v === 'false' ? false : v;
      if (st.plan) { st.plan = H.build(st.prob, S); if (st.phase === 'done') render({}); else render(); }
      openSettings();
    }
  });
  function openSettings() {
    const seg = (k, opts) => `<div class="seg">${opts.map(([v, t]) => `<button class="gb g-cyan ${String(S[k]) === String(v) ? 'on' : ''}" data-o="${k}:${v}">${t}</button>`).join('')}</div>`;
    modal(`<h2>せってい</h2>
      <div class="opt"><div class="lbl">くりあがりを かく<ruby>場所<rt>ばしょ</rt></ruby></div>${seg('carry', [['up', 'うえの だん'], ['down', 'こたえの マス']])}</div>
      <div class="opt"><div class="lbl">くりさがりを かく<ruby>場所<rt>ばしょ</rt></ruby></div>${seg('borrow', [['up', 'うえの だん'], ['side', '数の みぎうえ']])}</div>
      <div class="opt"><div class="lbl">こうかおん</div>${seg('sound', [[true, 'あり'], [false, 'なし']])}</div>
      <div class="row" style="margin-top:28px"><button class="gb g-green" data-m="close">とじる</button></div>
      <div class="credit">ひっ算おたすけ君 ver ${VER}　つくった人：のち（まなび堂）</div>`, null);
  }

  // ---- アシスト ----
  let lastAssist = null;
  function openAssist(a) {
    lastAssist = a; se('pop');
    const b = boxInfo(), el = $('assist');
    el.style.top = (b && b.r >= 6 ? 120 : 524) + 'px';
    const r = assistView(a);
    $('aTitle').innerHTML = rb(r.title);
    $('aBody').innerHTML = r.body;
    $('aAgain').style.display = r.anim ? '' : 'none';
    el.hidden = false;
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  }
  function closeAssist() { $('assist').hidden = true; }
  $('aClose').onclick = () => { se('btn'); closeAssist(); };
  $('aAgain').onclick = () => { if (lastAssist) openAssist(lastAssist); };

  function assistView(a) {
    if (a.type === 'kuku') return kukuView(a);
    const T = (x, y, s, o) => `<text x="${x}" y="${y}" font-size="${(o && o.fs) || 40}" text-anchor="${(o && o.a) || 'start'}" fill="${(o && o.c) || '#1c2233'}">${s}</text>`;
    const g = (d, inner) => `<g class="st" style="animation-delay:${d}s">${inner}</g>`;
    const R = '#e03131', GR = '#2b8a3e';
    const circ = (cx, cy, v, col, d) => g(d, `<circle cx="${cx}" cy="${cy}" r="36" fill="${col === GR ? '#d3f9d8' : '#ffe3e3'}" stroke="${col}" stroke-width="4"/>` + T(cx, cy + 14, v, { a: 'middle', c: col, fs: 40 }));
    const line = (x1, y1, x2, y2, col, d) => `<line class="dr" style="animation-delay:${d}s" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="5" stroke-linecap="round"/>`;
    const tx = 470, ly = [56, 108, 160, 210];
    let s = '';
    if (a.type === 'add') {
      const { x, y, c } = a;
      if (x + y < 10) {
        s += T(60, 100, `${x}＋${y}＋${c}`, { fs: 72 });
        s += g(.3, T(tx, ly[0], `${x}＋${y}＝${x + y}`)) + g(1.3, T(tx, ly[1], `${x + y}＋${c}＝<tspan fill="${GR}">${x + y + c}</tspan>`));
        return { title: 'たし{算|ざん}の アシスト', body: svg(s), anim: true };
      }
      const right = y <= x, big = right ? x : y, small = right ? y : x, need = 10 - big, rest = small - need;
      const X = [90, 190, 290], sx = right ? X[2] : X[0];
      s += T(X[0], 98, x, { fs: 76, a: 'middle', c: right ? '#1c2233' : '#1c2233' }) + T(X[1], 98, '＋', { fs: 70, a: 'middle' }) + T(X[2], 98, y, { fs: 76, a: 'middle' });
      const cN = right ? sx - 54 : sx + 54, cR = right ? sx + 54 : sx - 54;
      s += line(sx, 110, cN, 162, '#2f9e44', .3) + line(sx, 110, cR, 162, '#2f9e44', .3);
      s += circ(cN, 190, need, R, .7) + circ(cR, 190, rest, R, .7);
      const bx = right ? X[0] : X[2];
      s += g(1.8, `<ellipse cx="${bx}" cy="72" rx="44" ry="46" fill="none" stroke="${GR}" stroke-width="4"/>`) + circ(cN, 190, need, GR, 1.8);
      s += g(.7, T(tx, ly[0], `${small}を <tspan fill="${R}">${need}</tspan>と <tspan fill="${R}">${rest}</tspan>に わける`));
      s += g(1.8, T(tx, ly[1], `${big}＋<tspan fill="${GR}">${need}</tspan>＝<tspan fill="${GR}">10</tspan>`));
      s += g(2.9, T(tx, ly[2], `<tspan fill="${GR}">10</tspan>＋<tspan fill="${R}">${rest}</tspan>＝${10 + rest}`));
      if (c) s += g(3.9, T(tx, ly[3], `くりあがりの ${c}も わすれずに！`, { c: '#e8590c', fs: 34 }));
      return { title: 'さくらんぼ けいさん（10を つくろう）', body: svg(s), anim: true };
    }
    // ひき算（10から ひく）
    const { t, y } = a, u = t - 10, w = 10 - y;
    s += T(110, 98, t, { fs: 76, a: 'middle' }) + T(230, 98, '−', { fs: 70, a: 'middle' }) + T(320, 98, y, { fs: 76, a: 'middle' });
    s += line(110, 110, 60, 162, R, .3) + line(110, 110, 160, 162, R, .3);
    s += circ(60, 190, 10, R, .7) + circ(160, 190, u, R, .7);
    s += `<defs><marker id="ah" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#1c2233"/></marker></defs>`;
    s += `<path class="dr" style="animation-delay:1.8s" d="M318 112 Q300 190 104 186" fill="none" stroke="#1c2233" stroke-width="5" marker-end="url(#ah)"/>`;
    s += g(.7, T(tx, ly[0], `${t}を <tspan fill="${R}">10</tspan>と <tspan fill="${R}">${u}</tspan>に わける`));
    s += g(1.8, T(tx, ly[1], `<tspan fill="${R}">10</tspan>−${y}＝<tspan fill="${R}">${w}</tspan>`));
    s += g(2.9, T(tx, ly[2], `<tspan fill="${R}">${w}</tspan>＋<tspan fill="${R}">${u}</tspan>＝${t - y}`));
    return { title: 'さくらんぼ けいさん（10から ひこう）', body: svg(s), anim: true };
  }
  const svg = s => `<svg class="asv" viewBox="0 0 1000 236">${s}</svg>`;
  function kukuView(a) {
    const n = a.n;
    let h = `<div class="kuku${a.c || a.div != null ? ' n' : ''}">`;
    for (let i = 1; i <= 9; i++) h += `<div class="${i === a.k && a.div == null ? 'on' : ''}">${n}×${i}＝${n * i}</div>`;
    h += '</div>';
    let note = '';
    if (a.div != null) note = `${n}×□が ${a.div}を こえない、いちばん {大|おお}きい □を さがそう`;
    else if (a.k === 0) note = '0に なにを かけても 0だよ';
    else if (a.c) note = (a.k !== n && n <= 9 ? `${a.k}×${n}は ${n}×${a.k}と おなじ。` : '') + `そこに くりあがりの ${a.c}を たそう`;
    else if (a.k !== n && a.k != null && n <= 9) note = `${a.k}×${n}は ${n}×${a.k}と おなじ こたえだよ`;
    if (note) h += `<div class="knote">${rb(note)}</div>`;
    return { title: n <= 9 ? `${n}の だん（{九九|くく}）` : `${n}の だん（かけ{算|ざん}の ひょう）`, body: h, anim: false };
  }

  // ---- うごき ----
  function fly(from, to, t, p, down) {
    const el = document.createElement('div');
    el.className = 'fly' + (down ? ' dn' : '');
    el.textContent = t;
    el.style.left = from[1] * C + 'px'; el.style.top = from[0] * C + 'px';
    $('flyL').appendChild(el);
    let dx = (to[1] - from[1]) * C, dy = (to[0] - from[0]) * C, sc = 1;
    if (p) { sc = .55; if (p === 'b') { dy += 14; } else if (p === 'tr') { dx += 15; dy -= 13; } else { dx -= 13; dy -= 13; } }
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transform = `translate(${dx}px,${dy}px) scale(${sc})`; }));
    setTimeout(() => el.remove(), 700);
  }
  function anim(cls, ms) {
    const el = $('charaW'); el.classList.remove('hop', 'shake', 'jump'); void el.offsetWidth; el.classList.add(cls);
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove(cls), ms);
  }
  const hopChara = () => anim('hop', 600), shakeChara = () => anim('shake', 550), jumpChara = () => anim('jump', 1200);

  function hanamaru() {
    const m = [...marksAt(st.idx, false).values()].filter(x => x.ans && !x.g);
    if (!m.length) return;
    const c1 = Math.min(...m.map(x => x.c)), c2 = Math.max(...m.map(x => x.c)), r = m[0].r;
    const cx = (c1 + c2 + 1) / 2 * C, cy = (r + .5) * C;
    const rx = (c2 - c1 + 1) * C / 2 + 18, ry = C / 2 + 8;
    // うずまき＋花びら
    let d = '', N = 220;
    for (let i = 0; i <= N; i++) {
      const tt = i / N, a = -Math.PI / 2 + tt * Math.PI * 2 * 2.15, k = .55 + .45 * tt;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rx * k).toFixed(1) + ' ' + (cy + Math.sin(a) * ry * k).toFixed(1);
    }
    let f = '', P = 12, M2 = 360;
    for (let i = 0; i <= M2; i++) {
      const a = -Math.PI / 2 + i / M2 * Math.PI * 2, bump = Math.abs(Math.sin(a * P / 2));
      const kx = rx + 8 + 14 * bump, ky = ry + 6 + 12 * bump;
      f += (i ? 'L' : 'M') + (cx + Math.cos(a) * kx).toFixed(1) + ' ' + (cy + Math.sin(a) * ky).toFixed(1);
    }
    $('fxL').innerHTML = `<path class="hana" id="h1" d="${d}"/><path class="hana" id="h2" d="${f}"/>`;
    [['h1', 0, .9], ['h2', .8, 1.1]].forEach(([id, dl, du]) => {
      const p = $(id), L = p.getTotalLength();
      p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
      p.style.transition = `stroke-dashoffset ${du}s ease-in-out ${dl}s`;
      requestAnimationFrame(() => requestAnimationFrame(() => { p.style.strokeDashoffset = 0; }));
    });
  }
  function confetti() {
    const L = $('confL'), cols = ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#da77f2', '#ff922b'];
    for (let i = 0; i < 46; i++) {
      const d = document.createElement('div');
      d.className = 'cf';
      d.style.left = Math.random() * 1600 + 'px';
      d.style.background = pick(cols);
      d.style.animationDelay = Math.random() * .7 + 's';
      d.style.animationDuration = 1.6 + Math.random() * 1.2 + 's';
      L.appendChild(d);
      setTimeout(() => d.remove(), 3600);
    }
  }

  // ---- キーボード ----
  document.addEventListener('keydown', e => {
    if (!$('modal').hidden) { if (e.key === 'Escape') closeModal(); return; }
    if (e.key === 'Escape') { closeAssist(); return; }
    let k = null;
    if (/^[0-9]$/.test(e.key)) k = e.key;
    else if (e.key === '+') k = '+';
    else if (e.key === '-') k = '-';
    else if (e.key === '*' || e.key === 'x' || e.key === 'X') k = '*';
    else if (e.key === '/') k = '/';
    else if (e.key === 'Backspace' || e.key === 'Delete') k = 'BS';
    else if (e.key === 'Enter' || e.key === '=') k = 'OK';
    if (k) { e.preventDefault(); key(k); }
  });

  // ---- はじめ ----
  window.__hissan = { st, S, key, fwd, back, cur };
  drawGrid(); buildPad(); fit(); render();
  const v = document.createElement('div'); v.className = 'ver'; v.textContent = 'ver ' + VER; $('stage').appendChild(v);
})();
