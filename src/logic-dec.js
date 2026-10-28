// ===== ひっ算おたすけ君 小数点あり版：手順づくり =====
// 整数版（logic.js）の たし・ひき・かけ を つかいまわして、小数点の手順を たす。わり算は ここで つくる。
// 新しい印: {k:'pt', r, c}  … c列の 右下（線の上）の 小数点。x:けした / cl:'bw' うごかした
//          {k:'arc', r, c1, c2} … 小数点を うごかす 矢印
// 新しい手順: type 'tap'  … 小数点の 候補（cands:[[r,c]...] / exp:[r,c]）を タップ
//            type 'zero' … いらない 0（cands:[[r,c]...] / exp:[r,c]）を タップして けす
//            type 'choice' … ボタンで えらぶ（opts:[{t,v}] / exp）
//            type 'in' + str:true … 小数点つきで 入力（式の行の がい数）
(function (G) {
  'use strict';
  const H = typeof module !== 'undefined' ? require('./logic.js') : G.HISSAN;
  const { M, LN, PLF, COLS, ROWS, OPS } = H;
  const LIM = { '+': [4, 4], '-': [4, 4], '*': [4, 3], '/': [4, 3] }; // 数字の けた（小数点は かぞえない）
  const MAXDEC = 2;
  const plD = i => (i >= 0 ? PLF(i) : `1/${10 ** -i}の{位|くらい}`);
  const PT = (id, r, c, o) => Object.assign({ id, r, c, k: 'pt' }, o || {});

  // ---- 数の 文字 ----
  function norm(s) {
    if (s.includes('.')) {
      let [i, f] = s.split('.');
      i = i.replace(/^0+(?=\d)/, '') || '0'; f = (f || '').replace(/0+$/, '');
      return f ? i + '.' + f : i;
    }
    return s.replace(/^0+(?=\d)/, '') || '0';
  }
  const decs = s => (s.includes('.') ? s.split('.')[1].length : 0);
  const digs = s => s.replace('.', '');
  const sc = (s, d) => Number(digs(s) + '0'.repeat(d - decs(s)));
  const fmt = (intStr, d) => { const s = String(intStr).padStart(d + 1, '0'); return norm(d ? s.slice(0, -d) + '.' + s.slice(-d) : s); };
  const fixed = (intStr, d) => { const s = String(intStr).padStart(d + 1, '0'); return d ? s.slice(0, -d) + '.' + s.slice(-d) : s.replace(/^0+(?=\d)/, ''); };

  // ---- 式を読む ----
  function parse(str) {
    const m = /^([\d.]*)([+\-*/]?)([\d.]*)$/.exec(str || '');
    const okNum = x => /^\d*\.?\d*$/.test(x) && /\d/.test(x);
    if (!m || !okNum(m[1])) return { ok: false, msg: 'さいしょに {数|かず}を {入|い}れてね' };
    if (!m[2]) return { ok: false, msg: '＋ − × ÷ の どれかを {入|い}れてね' };
    if (!okNum(m[3])) return { ok: false, msg: 'きごうの あとにも {数|かず}を {入|い}れてね' };
    const a = norm(m[1]), b = norm(m[3]), op = m[2], d = Math.max(decs(a), decs(b));
    if (op === '-' && sc(a, d) < sc(b, d)) return { ok: false, msg: 'ひかれる{数|かず}が {小|ちい}さいよ。{大|おお}きい{数|かず}から ひいてね' };
    if (op === '*' && (+a === 0 || +b === 0)) return { ok: false, msg: '0では ない{数|かず}で やってみよう' };
    if (op === '/' && +b === 0) return { ok: false, msg: '0で わることは できないよ' };
    if (op === '/' && +a === 0) return { ok: false, msg: '0では ない{数|かず}を わってみよう' };
    return { ok: true, a, b, op };
  }

  // ---- 手順を ぜんぶ 当てはめた ノート ----
  function sim(plan) {
    const m = new Map(); plan.base.forEach(x => m.set(x.id, x));
    for (const s of plan.steps) {
      (s.pre || []).forEach(x => m.set(x.id, x)); (s.preDel || []).forEach(id => m.delete(id));
      (s.add || []).forEach(x => m.set(x.id, x)); (s.del || []).forEach(id => m.delete(id));
    }
    return m;
  }

  // 式の行（小数点は マスを つかわない）
  function rowMarks(str, r, c0, pre, o) {
    const out = []; let c = c0 - 1, i = 0;
    for (const ch of str) {
      if (ch === '.') out.push(PT(pre + 'p' + i, r, c, o));
      else { c++; out.push(M(pre + i, r, c, ch, 'f', o)); }
      i++;
    }
    return { marks: out, last: c };
  }
  const cellsOf = s => s.replace(/\./g, '').length;

  // ---- こたえの 小数点・いらない0 ----
  function finishDec(plan, row, R, d, o) {
    if (!d) return;
    const map = sim(plan);
    const ans = [...map.values()].filter(x => x.r === row && x.k === 'd' && x.ans && !x.g).sort((x, y) => x.c - y.c);
    const left = ans[0].c;
    const cands = []; for (let c = Math.max(1, left - 1); c <= R; c++) cands.push([row, c]);
    plan.steps.push(Object.assign({
      type: 'tap', say: o.say, hl: o.hl || [], cands, exp: [row, R - d],
      add: [PT('apt', row, R - d, { u: 1 })], rv: 'ここだよ',
      ok: '小数点が うてたね！', assist: o.assist, ask: true,
    }));
    // いらない 0 を けす（小数の ぶぶんの いちばん右から）
    const byCol = {}; ans.forEach(x => { byCol[x.c] = x; });
    let k = 0;
    while (k < d && byCol[R - k] && byCol[R - k].t === '0') k++;
    for (let i = 0; i < k; i++) {
      const mk = byCol[R - i], all = i === d - 1;
      const st = {
        type: 'zero', hl: [], cands: ans.map(x => [row, x.c]), exp: [row, mk.c],
        say: i === 0 ? '小数の いちばん {右|みぎ}の 0は いらないよ。その 0を タップして けそう' : 'もう1つ、いちばん {右|みぎ}の 0も けそう',
        add: [Object.assign({}, mk, { x: 1, zx: 1 })], rv: 'この 0だよ',
        ok: all ? '小数の ぶぶんが ぜんぶ 0だから、小数点も けすよ' : '0を けしたよ',
        assist: { type: 'zero' },
      };
      if (all) st.add.push(PT('apt', row, R - d, { u: 1, x: 1 }));
      plan.steps.push(st);
    }
  }

  // ---- たし算 ----
  function genAdd(a, b, S) {
    const d = Math.max(decs(a), decs(b));
    const A = digs(a) + ' '.repeat(d - decs(a)), B = digs(b) + ' '.repeat(d - decs(b));
    const P = H.genAdd(A, B, Object.assign({}, S, { pn: k => plD(k - d) }));
    if (decs(a)) P.base.push(PT('pa', 3, P.R - d));
    if (decs(b)) P.base.push(PT('pb', 4, P.R - d));
    finishDec(P, P.AR, P.R, d, {
      say: 'こたえにも 小数点を うとう。{上|うえ}の 小数点の {真下|ました}は どこかな？',
      hl: [[3, P.R - d], [4, P.R - d]], assist: { type: 'align', a, b, d, op: '+' },
    });
    P.ans = fmt(sc(a, d) + sc(b, d), d);
    return P;
  }

  // ---- ひき算 ----
  function genSub(a, b, S) {
    const d = Math.max(decs(a), decs(b)), padA = d - decs(a);
    const A = digs(a) + '0'.repeat(padA), B = digs(b) + ' '.repeat(d - decs(b));
    const P = H.genSub(A, B, Object.assign({}, S, { pn: k => plD(k - d), minLen: d + 1 }));
    const auxIds = new Set(); for (let k = 0; k < padA; k++) auxIds.add('a' + k);
    const setAux = x => { if (auxIds.has(x.id)) x.aux = 1; };
    P.base.forEach(setAux); P.steps.forEach(s => (s.pre || []).forEach(setAux));
    if (decs(b)) P.base.push(PT('pb', 4, P.R - d));
    if (padA) {
      const moved = P.base.filter(x => auxIds.has(x.id));
      P.base = P.base.filter(x => !auxIds.has(x.id));
      const pre = moved.slice();
      if (!decs(a)) pre.push(PT('pa', 3, P.R - d, { cl: 'bw' })); else P.base.push(PT('pa', 3, P.R - d));
      const shown = fixed(sc(a, d), d);
      P.steps.unshift({
        type: 'info', pre, hl: moved.map(x => [3, x.c]),
        say: `ひく{数|かず}と けたを そろえるため、${a}を ${shown}と {考|かんが}えて 0を かいておこう`,
      });
    } else if (decs(a)) P.base.push(PT('pa', 3, P.R - d));
    finishDec(P, P.AR, P.R, d, {
      say: 'こたえにも 小数点を うとう。{上|うえ}の 小数点の {真下|ました}は どこかな？',
      hl: [[3, P.R - d], [4, P.R - d]], assist: { type: 'align', a, b, d, op: '-' },
    });
    P.ans = fmt(sc(a, d) - sc(b, d), d);
    return P;
  }

  // ---- かけ算 ----
  function genMul(a, b, S) {
    const ad = digs(a), bd = digs(b), dA = decs(a), dB = decs(b), d = dA + dB;
    const As = ad.replace(/^0+/, ''), Bs = bd.replace(/^0+/, '');
    const PR = String(Number(As) * Number(Bs)), need = d + 1, ansLen = Math.max(PR.length, need);
    const R = Math.max(As.length + Bs.length + 1, ad.length + 1, bd.length + 2, ansLen + 1);
    const opc = R - Math.max(ad.length, bd.length);
    const P = H.genMul(As, Bs, Object.assign({}, S, { R, opc, pnB: j => plD(j - dB), pnP: k => plD(k - d) }));
    for (let k = As.length; k < ad.length; k++) P.base.push(M('az' + k, 3, R - k, '0', 'd'));
    for (let k = Bs.length; k < bd.length; k++) P.base.push(M('bz' + k, 4, R - k, '0', 'd'));
    if (dA) P.base.push(PT('pa', 3, R - dA));
    if (dB) P.base.push(PT('pb', 4, R - dB));
    const lnId = P.AR === 5 ? 'ln' : 'ln2', ln = P.base.find(x => x.id === lnId);
    if (ln) ln.c1 = Math.min(ln.c1, R - ansLen + 1);
    const hlDec = []; for (let k = 0; k < dA; k++) hlDec.push([3, R - k]); for (let k = 0; k < dB; k++) hlDec.push([4, R - k]);
    for (let k = PR.length; k < ansLen; k++) {
      const first = k === PR.length;
      P.steps.push({
        type: 'in', hl: first ? hlDec : [], box: { r: P.AR, c: R - k, w: 1 }, exp: 0, max: 2,
        say: first ? `小数点より {右|みぎ}の けたは、あわせて ${d}こ。こたえの けたが たりないから、{左|ひだり}に 0を かいて ふやそう`
          : (k === ansLen - 1 ? '{一|いち}の{位|くらい}にも 0を かこう' : 'もう1つ 0を かこう'),
        add: [M('pz' + k, P.AR, R - k, 0, 'd', { u: 1, ans: 1 })],
        assist: { type: 'ptmul', a, b, dA, dB, ans: PR.padStart(ansLen, '0') }, ask: true,
      });
    }
    finishDec(P, P.AR, R, d, {
      say: `小数点より {右|みぎ}の けたは、${a}が ${dA}こ、${b}が ${dB}こ。あわせて ${d}こだね。こたえの 小数点は どこかな？`,
      hl: hlDec, assist: { type: 'ptmul', a, b, dA, dB, ans: PR.padStart(ansLen, '0') },
    });
    P.ans = fmt(PR, d);
    return P;
  }

  // ---- わり算 ----
  // opt: {mode:'end'|'rem'|'round', k:0|1|2}
  function genDiv(a, b, S, opt) {
    const ad = digs(a), dA = decs(a), bd = digs(b), dB = decs(b);
    const bInt = Number(bd), lbd = bd.length, D0 = lbd + 2;
    const origPI = ad.length - dA - 1, PI = origPI + dB;
    const X0 = ad + '0'.repeat(Math.max(0, PI - (ad.length - 1)));
    const mode = opt.mode, kk = opt.k || 0;
    let X, T;
    if (mode === 'end') {
      for (let ext = 0; ext <= 6 && X == null; ext++) {
        const x = X0 + '0'.repeat(ext);
        if (Number(x) % bInt === 0 && x.length - 1 - PI <= 3) X = x;
      }
      if (X == null) return { ok: false, why: 'この{式|しき}は わりきれないよ' };
      T = X.length - 1;
    } else {
      T = PI + kk + (mode === 'round' ? 1 : 0);
      X = X0.padEnd(Math.max(X0.length, T + 1), '0');
    }
    let p0 = -1; for (let p = 0; p < X.length; p++) if (Number(X.slice(0, p + 1)) >= bInt) { p0 = p; break; }
    if (p0 < 0 || p0 > T) return { ok: false, why: '{商|しょう}が 0に なっちゃうよ' };
    const qStart = Math.min(p0, PI);
    const lastIdx = mode === 'rem' ? Math.max(T, X0.length - 1) : T;
    const place = p => plD(PI - p);

    const base = [];
    H.putNum(base, 'dv', bd, 3, lbd + 1);
    for (let i = 0; i < ad.length; i++) base.push(M('a' + i, 3, D0 + i, ad[i], 'd'));
    base.push({ id: 'br', k: 'br', r: 3, c: D0 });
    base.push(LN('ov', 2, D0, D0 + Math.max(X.length, ad.length) - 1));
    if (dB) base.push(PT('bp', 3, lbd + 1 - dB));
    if (dA) base.push(PT('ap', 3, D0 + origPI));
    const dvCells = []; for (let c = 2; c <= lbd + 1; c++) dvCells.push([3, c]);
    const cells = (rr, right, len) => { const o = []; for (let t = 0; t < len; t++) o.push([rr, right - t]); return o; };
    const steps = [];
    steps.push({ type: 'info', say: 'わり{算|ざん}は「たてる → かける → ひく → おろす」を くりかえすよ', hl: [] });

    // わる数を 整数に（小数点を うごかす）
    const shown = new Set(); for (let i = 0; i < ad.length; i++) shown.add(i);
    let ptShown = dA > 0;
    if (dB) {
      const add = [Object.assign(PT('bp', 3, lbd + 1 - dB), { x: 1 }), PT('bp2', 3, lbd + 1, { cl: 'bw', u: 1 }),
        { id: 'barc', k: 'arc', r: 3, c1: lbd + 1 - dB, c2: lbd + 1 }];
      for (let i = 0; i < lbd - String(bInt).length; i++) add.push(M('dv' + (lbd - 1 - i), 3, 2 + i, '0', 'd', { x: 1 }));
      const cands = []; for (let c = 1; c <= lbd + 1; c++) cands.push([3, c]);
      steps.push({
        type: 'tap', say: `わる{数|かず}の ${b}を {整数|せいすう}に しよう。小数点を {右|みぎ}に うごかすと、どこに なるかな？`,
        hl: dvCells, cands, exp: [3, lbd + 1], add, ok: `${bInt}に なったね`, rv: 'ここだよ',
        assist: { type: 'shift', a, b, n: dB, X0, PI }, ask: true,
      });
      const pre = [];
      for (let i = ad.length; i < X0.length; i++) { pre.push(M('a' + i, 3, D0 + i, '0', 'd', { aux: 1 })); shown.add(i); }
      const add2 = [PT('ap2', 3, D0 + PI, { cl: 'bw', u: 1 }), { id: 'aarc', k: 'arc', r: 3, c1: D0 + origPI, c2: D0 + PI }];
      if (dA) add2.unshift(Object.assign(PT('ap', 3, D0 + origPI), { x: 1 }));
      const cands2 = []; for (let c = D0; c <= D0 + X0.length - 1; c++) cands2.push([3, c]);
      steps.push({
        type: 'tap', pre, hl: cells(3, D0 + X0.length - 1, X0.length),
        say: `わられる{数|かず}の 小数点も、おなじ ${dB}こ {右|みぎ}に うごかそう` + (pre.length ? '（けたが たりないので 0を つけたしたよ）' : ''),
        cands: cands2, exp: [3, D0 + PI], add: add2, ok: 'これで わる{数|かず}が {整数|せいすう}に なったね', rv: 'ここだよ',
        assist: { type: 'shift', a, b, n: dB, X0, PI }, ask: true,
      });
      ptShown = true;
    }
    // 0を つけたす（わり進む）
    const showPre = upto => {
      const pre = [];
      for (let i = 0; i <= upto; i++) if (!shown.has(i)) { pre.push(M('a' + i, 3, D0 + i, X[i], 'd', { aux: 1 })); shown.add(i); }
      if (pre.length && !ptShown) { pre.push(PT('ap', 3, D0 + PI, { cl: 'bw' })); ptShown = true; }
      return pre;
    };
    const showInfo = upto => {
      const pre = showPre(upto);
      if (pre.length) steps.push({ type: 'info', pre, hl: pre.filter(x => x.k === 'd').map(x => [3, x.c]), say: 'このままでは たりないので、0を つけたして わり{進|すす}もう' });
    };
    const qptStep = () => {
      const cands = []; for (let c = Math.max(D0, D0 + qStart - 1); c <= D0 + T; c++) cands.push([2, c]);
      steps.push({
        type: 'tap', say: 'ここから 小数の {位|くらい}だよ。わられる{数|かず}の 小数点の {真上|まうえ}に、{商|しょう}の 小数点を うとう',
        hl: [[3, D0 + PI], [3, D0 + PI + 1]], cands, exp: [2, D0 + PI], add: [PT('qp', 2, D0 + PI, { u: 1 })],
        ok: '小数点が うてたね！', rv: 'ここだよ', assist: { type: 'align', up: true, X, PI, D0 }, ask: true,
      });
    };

    let qDigits = '', cur = 0, curRow = 3, row = 4, started = false;
    for (let p = qStart; p <= T; p++) {
      const col = D0 + p;
      if (p === PI + 1) qptStep();
      if (p < p0) {
        showInfo(p);
        steps.push({
          type: 'in', say: `${place(p)}には ${bInt}が たたないから、0を かこう`, hl: cells(3, col, p + 1).concat(dvCells),
          box: { r: 2, c: col, w: 1 }, exp: 0, max: 1, add: [M('q' + p, 2, col, 0, 'd', { u: 1, ans: 1 })],
        });
        qDigits += '0';
        continue;
      }
      if (!started) { showInfo(p); cur = Number(X.slice(0, p + 1)); started = true; }
      const qq = Math.floor(cur / bInt), curLen = String(cur).length;
      const tq = {
        type: 'in', say: `たてる：${cur}÷${bInt}の こたえを、${X[p]}の {上|うえ}に たてよう`,
        hl: cells(curRow, col, curLen).concat(dvCells), box: { r: 2, c: col, w: 1 }, exp: qq, max: 1,
        add: [M('q' + p, 2, col, qq, 'd', { u: 1, ans: mode === 'round' ? 0 : 1 })],
        assist: { type: 'kuku', n: bInt, k: qq, div: cur }, wr: { div: true, cur, b: bInt },
      };
      steps.push(tq); qDigits += qq;
      const more = p < lastIdx;
      if (qq === 0) tq.ok = `${cur}は ${bInt}より {小|ちい}さいから 0を たてるよ`;
      else {
        const prod = qq * bInt, pl2 = String(prod).length, rem = cur - prod;
        const left = Math.min(col - curLen + 1, col - pl2 + 1);
        const kAdd = []; H.putNum(kAdd, `k${p}_`, String(prod), row, col, { u: 1 });
        kAdd.push(LN('kl' + p, row, left, col));
        steps.push({
          type: 'in', say: `かける：たてた ${qq}と、わる{数|かず}の ${bInt}を かけよう`, hl: [[2, col]].concat(dvCells),
          box: { r: row, c: col, w: pl2 }, exp: prod, max: pl2 + 1, add: kAdd, ok: `${qq}×${bInt}＝${prod}`,
          assist: { type: 'kuku', n: bInt, k: qq },
        });
        const hAdd = [];
        if (rem === 0 && more) hAdd.push(M(`h${p}_0`, row + 1, col, 0, 'd', { u: 1, g: 1 }));
        else H.putNum(hAdd, `h${p}_`, String(rem), row + 1, col, { u: 1 });
        const hs = {
          type: 'in', say: `ひく：${cur}−${prod}を しよう`, hl: cells(curRow, col, curLen).concat(cells(row, col, pl2)),
          box: { r: row + 1, c: col, w: String(rem).length }, exp: rem, max: String(rem).length + 1, add: hAdd,
        };
        if (rem === 0 && more) hs.ok = '0だね。0は かかないで、つぎへ すすむよ';
        steps.push(hs);
        cur = rem; curRow = row + 1; row += 2;
      }
      if (p < lastIdx) {
        const d = +X[p + 1], nc = cur * 10 + d, hide = cur === 0 && d === 0;
        const pre = showPre(p + 1), ext = pre.length > 0;
        steps.push({
          type: 'in', pre, say: (ext ? '0を つけたして わり{進|すす}もう。' : '') + (p >= T ? `のこりの ${d}も {下|した}に おろそう` : `おろす：つぎの ${d}を {下|した}に おろそう`),
          hl: [[3, col + 1]], box: { r: curRow, c: col + 1, w: 1 }, exp: d, max: 1,
          add: [M(`o${p + 1}`, curRow, col + 1, d, 'd', hide ? { u: 1, g: 1 } : { u: 1 })],
          fly: { from: [3, col + 1], to: [curRow, col + 1], t: '' + d },
          ok: hide ? '0だけだから、0は かかないよ' : `${nc}に なったね`,
        });
        cur = nc;
      }
    }
    // のこりを おろす（rem で、T のあとに もとの 数字が のこっているとき）
    if (mode === 'rem') {
      for (let p = T + 1; p < lastIdx; p++) {
        const col = D0 + p, d = +X[p + 1], nc = cur * 10 + d, hide = cur === 0 && d === 0;
        steps.push({
          type: 'in', say: `のこりの ${d}も {下|した}に おろそう`, hl: [[3, col + 1]], box: { r: curRow, c: col + 1, w: 1 }, exp: d, max: 1,
          add: [M(`o${p + 1}`, curRow, col + 1, d, 'd', hide ? { u: 1, g: 1 } : { u: 1 })],
          fly: { from: [3, col + 1], to: [curRow, col + 1], t: '' + d }, ok: hide ? '0は かかないよ' : `${nc}に なったね`,
        });
        cur = nc;
      }
    }

    const qVal = fmt(qDigits, Math.max(0, T - PI));
    const plan = { base, steps, ok: true };
    let fa;
    if (mode === 'end') {
      steps.push({ type: 'info', hl: [], say: `わりきれたね！ {商|しょう}は ${qVal}だよ` });
      plan.ans = qVal; fa = '＝' + qVal;
    } else if (mode === 'rem') {
      const rd = Math.max(0, lastIdx - origPI);
      if (cur === 0) {
        steps.push({ type: 'info', hl: [], say: 'あまりは 0。わりきれたね！' });
        plan.rem = '0'; fa = '＝' + qVal;
      } else {
        const rs = String(cur), lastCol = D0 + lastIdx;
        const needLeft = rd > 0 ? D0 + origPI : lastCol - rs.length + 1;
        for (let c = lastCol - rs.length; c >= needLeft; c--) {
          steps.push({
            type: 'in', say: c === D0 + origPI ? 'あまりの {一|いち}の{位|くらい}にも 0を かこう' : 'あまりの けたが たりないから 0を かこう',
            hl: [], box: { r: curRow, c, w: 1 }, exp: 0, max: 1, add: [M('rz' + c, curRow, c, 0, 'd', { u: 1 })],
          });
        }
        if (rd > 0) {
          const cands = []; for (let c = needLeft - 1; c <= lastCol; c++) if (c >= 1) cands.push([curRow, c]);
          steps.push({
            type: 'tap', say: 'あまりの 小数点は、わられる{数|かず}の もとの 小数点に そろえて うとう',
            hl: [[3, D0 + origPI]], cands, exp: [curRow, D0 + origPI], add: [PT('rp', curRow, D0 + origPI, { u: 1 })],
            ok: '小数点が うてたね！', rv: 'ここだよ', assist: { type: 'remPt', a, b, origPI, X, D0 }, ask: true,
          });
        }
        plan.rem = fmt(rs, rd);
        steps.push({ type: 'info', hl: cells(curRow, lastCol, lastCol - needLeft + 1), say: `{商|しょう}は ${qVal}、あまりは ${plan.rem}だよ` });
        fa = '＝' + qVal + 'あまり' + plan.rem;
      }
      plan.ans = qVal;
    } else {
      // 四捨五入
      const dgt = +qDigits[qDigits.length - 1];
      const up = dgt >= 5;
      const Qr = String(Math.floor(Number(qDigits) / 10) + (up ? 1 : 0));
      const rv = fixed(Qr, kk);
      steps.push({
        type: 'choice', say: `${place(T - 1)}までの がい{数|すう}に するよ。その 1つ {下|した}の ${place(T)}の ${dgt}を {四捨五入|ししゃごにゅう}しよう。きりすて？ きりあげ？`,
        hl: [[2, D0 + T]], opts: [{ t: 'きりすて', v: 0 }, { t: 'きりあげ', v: 1 }], exp: up ? 1 : 0,
        add: [M('q' + T, 2, D0 + T, dgt, 'd', { u: 1, x: 1, zx: 1 })],
        ok: up ? `${dgt}は 5いじょうだから きりあげ！` : `${dgt}は 5より {小|ちい}さいから きりすて！`,
        rv: up ? 'きりあげだよ' : 'きりすてだよ', assist: { type: 'round', d: dgt }, ask: true,
      });
      const fs = `${a}${OPS['/']}${b}`, fc = cellsOf(fs);
      const nE = { id: 'fne', r: 0, c: fc + 1, t: '≒', k: 'f' };
      const vm = rowMarks(rv, 0, fc + 2, 'fa', { u: 1 });
      steps.push({
        type: 'in', str: true, pre: [nE], hl: cells(2, D0 + T - 1, T - qStart),
        say: `≒の あとに、${place(T - 1)}までの がい{数|すう}を かこう。小数点も わすれずに`,
        box: { r: 0, c: vm.last, w: cellsOf(rv) }, exp: rv, max: rv.length + 1, add: vm.marks,
        assist: { type: 'round', d: dgt, q: qVal, r: rv }, ok: `${rv}だね！`,
      });
      plan.ans = rv; plan.hana = 'fin'; fa = '≒' + rv;
      plan.finRaw = [nE].concat(vm.marks);
    }
    plan.fa = fa;
    plan.mode = mode;
    return plan;
  }

  // ---- ノートに 入るか しらべる ----
  function fits(plan) {
    const inB = (r, c) => r >= 0 && r < ROWS && c >= 1 && c < COLS;
    const all = plan.base.concat(...plan.steps.map(s => (s.pre || []).concat(s.add || [])), plan.fin || []);
    for (const m of all) {
      if (m.k === 'L' || m.k === 'arc') { if (!inB(m.r, m.c1) || !inB(m.r, m.c2)) return false; continue; }
      if (!inB(m.r, m.c)) return false;
    }
    for (const s of plan.steps) {
      if (s.box) { const w = Math.max(s.box.w, s.str ? cellsOf(String(s.exp)) + 1 : String(s.exp).length + (s.max > String(s.exp).length ? 1 : 0)); if (!inB(s.box.r, s.box.c) || !inB(s.box.r, s.box.c - w + 1)) return false; }
      if (s.cands) for (const [r, c] of s.cands) if (!inB(r, c)) return false;
    }
    return true;
  }

  function build(prob, S, opt) {
    S = S || {};
    let plan;
    if (prob.op === '/') { plan = genDiv(prob.a, prob.b, S, opt || { mode: 'end' }); if (!plan.ok) return plan; }
    else plan = { '+': genAdd, '-': genSub, '*': genMul }[prob.op](prob.a, prob.b, S);
    const fs = `${prob.a}${OPS[prob.op]}${prob.b}`;
    const f = rowMarks(fs, 0, 1, 'f');
    plan.base.unshift(...f.marks);
    if (plan.finRaw) plan.fin = plan.finRaw;
    else {
      const fa = plan.fa || '＝' + plan.ans;
      // 「あまり」は 1文字ずつ
      plan.fin = rowMarks(fa, 0, f.last + 1, 'fa', { fa: 1 }).marks;
    }
    plan.formula = fs;
    plan.ok = true;
    if (!fits(plan)) return { ok: false, why: 'ノートに 入りきらないよ' };
    return plan;
  }

  // わり算の えらびかた（できるか どうか）
  function divOptions(prob, S) {
    const o = { end: build(prob, S, { mode: 'end' }), rem: [], round: [] };
    for (let k = 0; k <= 2; k++) {
      o.rem.push(build(prob, S, { mode: 'rem', k }));
      o.round.push(build(prob, S, { mode: 'round', k }));
    }
    return o;
  }

  const api = { COLS, ROWS, OPS, LIM, MAXDEC, parse, build, divOptions, norm, decs, digs, fmt, fixed, sim, plD, DEC: true };
  if (typeof module !== 'undefined') module.exports = api; else G.HISSAN_DEC = api;
})(typeof window !== 'undefined' ? window : globalThis);
