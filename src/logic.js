// ===== ひっ算おたすけ君：筆算の手順づくり（画面にはさわらない） =====
// ノートは 18列 × 13行。0行目＝式。1マスに1文字。
// 印（マーク）: {id, r, c, t, k}  k: 'f'式の文字 / 'd'数字 / 'o'きごう / 's'小さい数字 / 'L'線 / 'br'わり算のカッコ
//   p: 小さい数字の場所（'b'マスの下より / 'tl'左上 / 'tr'右上）, cl: 色（'cy'くりあがり / 'bw'くりさがり）
//   x: ななめ線で消す, g: 書いたあと消える（いちばん左の0など）, u: 子どもが書いた数字, ans: こたえ
(function (G) {
  'use strict';
  const COLS = 18, ROWS = 13;
  const PL = [['一', 'いち'], ['十', 'じゅう'], ['百', 'ひゃく'], ['千', 'せん'], ['一万', 'いちまん'], ['十万', 'じゅうまん'], ['百万', 'ひゃくまん'], ['千万', 'せんまん']];
  const PLF = k => `{${PL[k][0]}|${PL[k][1]}}の{位|くらい}`;
  const pl = PLF;
  const OPS = { '+': '＋', '-': '−', '*': '×', '/': '÷' };
  // [さいしょの数のけた, あとの数のけた]
  const LIM = { '+': [4, 4], '-': [4, 4], '*': [4, 3], '/': [4, 2] };

  const M = (id, r, c, t, k, o) => Object.assign({ id, r, c, t: String(t), k }, o || {});
  const LN = (id, r, c1, c2, o) => Object.assign({ id, r, c1, c2, k: 'L' }, o || {}); // r行の下の線
  // ' ' は 「数字なし」（小数で けたが たりないところ）
  const dig = (S, k) => { const ch = S[S.length - 1 - k]; return ch === undefined || ch === ' ' ? null : +ch; };
  function putNum(arr, pre, S, r, R, o) {
    for (let k = 0; k < S.length; k++) { const ch = S[S.length - 1 - k]; if (ch !== ' ') arr.push(M(pre + k, r, R - k, ch, 'd', o)); }
  }

  // ---- 式を読む ----
  function parse(str) {
    const m = /^(\d*)([+\-*/]?)(\d*)$/.exec(str || '');
    if (!m || !m[1]) return { ok: false, msg: 'さいしょに {数|かず}を {入|い}れてね' };
    if (!m[2]) return { ok: false, msg: '＋ − × ÷ の どれかを {入|い}れてね' };
    if (!m[3]) return { ok: false, msg: 'きごうの あとにも {数|かず}を {入|い}れてね' };
    const a = +m[1], b = +m[3], op = m[2];
    if (op === '-' && a < b) return { ok: false, msg: 'ひかれる{数|かず}が {小|ちい}さいよ。{大|おお}きい{数|かず}から ひいてね' };
    if (op === '*' && (a === 0 || b === 0)) return { ok: false, msg: '0では ない{数|かず}で やってみよう' };
    if (op === '/' && b === 0) return { ok: false, msg: '0で わることは できないよ' };
    if (op === '/' && a < b) return { ok: false, msg: 'わられる{数|かず}を、わる{数|かず}より {大|おお}きくしてね' };
    return { ok: true, a, b, op };
  }

  // ---- たし算 ----
  function genAdd(a, b, S) {
    const A = '' + a, B = '' + b, L = Math.max(A.length, B.length), R = L + 2, opc = R - L, AR = 5, pl = S.pn || PLF;
    const base = [], out = [];
    putNum(base, 'a', A, 3, R); putNum(base, 'b', B, 4, R);
    base.push(M('op', 4, opc, '＋', 'o')); base.push(LN('ln', 4, opc, R));
    const cpos = k => (S.carry === 'down' ? { r: AR, c: R - k, p: 'tl' } : { r: 2, c: R - k, p: 'b' });
    const steps = []; let cin = 0;
    for (let k = 0; k < L; k++) {
      const col = R - k, da = dig(A, k), db = dig(B, k), c0 = cin, v = (da || 0) + (db || 0) + c0, last = k === L - 1;
      const hl = [];
      if (da != null) hl.push([3, col]);
      if (db != null) hl.push([4, col]);
      if (c0) { const p = cpos(k); hl.push([p.r, p.c]); }
      const nums = [da, db].filter(x => x != null);
      let say = k === 0 ? `${pl(0)}から たしていこう。` : `つぎは ${pl(k)}。`;
      if (c0) say += `${nums.join('と')}と、くりあがりの ${c0}を たそう`;
      else if (nums.length === 2) say += `${da}＋${db}を しよう`;
      else say += `${nums[0]}を そのまま {下|した}に おろそう`;
      const add = [];
      const st = { type: 'in', say, hl, box: { r: AR, c: col, w: 1 }, exp: v, max: 2, add };
      if (v >= 10 && !last) {
        add.push(M('ans' + k, AR, col, v % 10, 'd', { u: 1, ans: 1 }));
        const p = cpos(k + 1);
        add.push(M('c' + (k + 1), p.r, p.c, 1, 's', { p: p.p, cl: 'cy' }));
        st.fly = { to: [p.r, p.c], t: '1' };
        st.ok = `${v}だね！ ${v % 10}を かいて、1を ${pl(k + 1)}に くりあげるよ`;
        cin = 1; out[k] = v % 10;
      } else if (v >= 10) {
        add.push(M('ans' + k, AR, col, v % 10, 'd', { u: 1, ans: 1 }));
        add.push(M('ans' + (k + 1), AR, col - 1, 1, 'd', { u: 1, ans: 1 }));
        st.ok = `${v}！ さいごの {位|くらい}だから、そのまま かくよ`;
        cin = 0; out[k] = v % 10; out[k + 1] = 1;
      } else {
        add.push(M('ans' + k, AR, col, v, 'd', { u: 1, ans: 1 }));
        cin = 0; out[k] = v;
      }
      if (da != null && db != null && v >= 10) { st.assist = { type: 'add', x: da, y: db, c: c0 }; st.ask = true; }
      steps.push(st);
    }
    return { base, steps, ans: out.slice().reverse().join(''), R, AR };
  }

  // ---- ひき算 ----
  function genSub(a, b, S) {
    const A = '' + a, B = '' + b, L = A.length, R = L + 2, opc = R - L, AR = 5, pl = S.pn || PLF;
    const RL = Math.max(('' + (Number(A) - Number(B.replace(/ /g, '0')))).length, S.minLen || 0);
    const base = [];
    putNum(base, 'a', A, 3, R); putNum(base, 'b', B, 4, R);
    base.push(M('op', 4, opc, '−', 'o')); base.push(LN('ln', 4, opc, R));
    const bpos = k => (S.borrow === 'side' ? { r: 3, c: R - k, p: 'tr' } : { r: 2, c: R - k, p: 'b' });
    const cur = []; for (let k = 0; k < L; k++) cur.push(dig(A, k));
    const lent = new Set();
    const steps = [];
    for (let k = 0; k < L; k++) {
      const col = R - k, db = dig(B, k), y = db || 0, orig = cur[k];
      const pre = [], preDel = [], hl = [[3, col]];
      if (db != null) hl.push([4, col]);
      let say = k === 0 ? `${pl(0)}から ひいていこう。` : `つぎは ${pl(k)}。`;
      let borrowed = false;
      if (cur[k] < y) {
        borrowed = true;
        if (k === 0) say = '';
        let j = k + 1; while (cur[j] === 0) j++;
        for (let m = j; m > k; m--) {
          cur[m] = m === j ? cur[m] - 1 : 9;
          lent.add(m);
          pre.push(M('a' + m, 3, R - m, A[L - 1 - m], 'd', { x: 1, cl: 'bw' }));
          const p = bpos(m);
          if (m === L - 1 && cur[m] === 0) preDel.push('bw' + m);
          else pre.push(M('bw' + m, p.r, p.c, cur[m], 's', { p: p.p, cl: 'bw' }));
          hl.push([p.r, p.c]);
        }
        cur[k] += 10;
        pre.push(M('a' + k, 3, col, A[L - 1 - k], 'd', { x: 1, cl: 'bw' }));
        const p = bpos(k);
        pre.push(M('bw' + k, p.r, p.c, cur[k], 's', { p: p.p, cl: 'bw' }));
        hl.push([p.r, p.c]);
        if (j === k + 1) say += `${orig}−${y}は できないね。${pl(k + 1)}から 1 かりて、${cur[k]}−${y}を しよう`;
        else say += `${orig}−${y}は できないね。${pl(k + 1)}が 0だから、${pl(j)}から かりてくるよ。${cur[k]}−${y}を しよう`;
      } else if (lent.has(k)) {
        const p = bpos(k); hl.push([p.r, p.c]);
      }
      const v = cur[k] - y, leading = k >= RL;
      const kashita = !borrowed && lent.has(k) ? `1 かしたから ${cur[k]}に なっているよ。` : '';
      const st = { type: 'in', hl, pre, preDel, box: { r: AR, c: col, w: 1 }, exp: v, max: 2, add: [] };
      if (borrowed) {
        if (db != null) { st.assist = { type: 'sub', t: cur[k], y }; st.ask = true; }
      } else if (db != null) {
        say += kashita + `${cur[k]}−${y}を しよう`;
      } else if (leading) {
        st.type = 'info';
        say += kashita + `0に なったから、なにも かかないよ`;
      } else {
        say += kashita + `ひく{数|かず}が ないから、${cur[k]}を そのまま おろそう`;
      }
      st.say = say;
      if (st.type === 'in') {
        if (leading) {
          st.add.push(M('ans' + k, AR, col, v, 'd', { u: 1, g: 1 }));
          st.ok = `0だね。でも いちばん {左|ひだり}の 0は かかないよ`;
        } else st.add.push(M('ans' + k, AR, col, v, 'd', { u: 1, ans: 1 }));
      } else { delete st.box; }
      steps.push(st);
    }
    const dv = '' + (Number(A) - Number(B.replace(/ /g, '0')));
    return { base, steps, ans: dv.padStart(RL, '0'), R, AR };
  }

  // ---- かけ算 ----
  function genMul(a, b, S) {
    const A = '' + a, B = '' + b, la = A.length, lb = B.length, R = S.R || la + lb + 1, opc = S.opc || R - Math.max(la, lb);
    const pl = S.pnB || PLF, plP = S.pnP || PLF;
    const PR = '' + a * b, P = PR.length;
    const base = [];
    putNum(base, 'a', A, 3, R); putNum(base, 'b', B, 4, R);
    base.push(M('op', 4, opc, '×', 'o')); base.push(LN('ln', 4, opc, R));
    const J = []; for (let j = 0; j < lb; j++) if (dig(B, j) !== 0) J.push(j);
    const n = J.length, multi = n > 1, sumRow = 5 + n;
    if (multi) base.push(LN('ln2', 4 + n, Math.min(opc, R - P + 1), R));
    const steps = [];
    if (!multi && J[0] > 0) {
      for (let t = 0; t < J[0]; t++) {
        steps.push({
          type: 'in', say: `かける{数|かず}の ${pl(t)}が 0だから、こたえの ${plP(t)}に 0を かこう`,
          hl: [[4, R - t]], box: { r: 5, c: R - t, w: 1 }, exp: 0, max: 2,
          add: [M('z' + t, 5, R - t, 0, 'd', { u: 1, ans: 1 })],
        });
      }
    }
    let prevC = [];
    const colDigits = {};
    J.forEach((j, ri) => {
      const bj = dig(B, j), r = 5 + ri;
      const cpos = i => (S.carry === 'down' ? { r, c: R - i - j, p: 'tl' } : { r: 2, c: R - i, p: 'b' });
      let cin = 0; const cIds = [];
      for (let i = 0; i < la; i++) {
        const col = R - i - j, ai = dig(A, i), c0 = cin, v = ai * bj + c0, last = i === la - 1;
        let say = '';
        if (i === 0) {
          if (ri === 0) say = `かける{数|かず}の ${pl(j)}の ${bj}を かけていこう。`;
          else say = `つぎは かける{数|かず}の ${pl(j)}の ${bj}を かけるよ。こたえは ${pl(j)}から かこう。`;
        }
        say += `${ai}×${bj}` + (c0 ? `に、くりあがりの ${c0}を たそう` : `を しよう`);
        const hl = [[3, R - i], [4, R - j]];
        if (c0) { const p = cpos(i); hl.push([p.r, p.c]); }
        const add = [], o = { u: 1 }; if (!multi) o.ans = 1;
        const st = { type: 'in', say, hl, box: { r, c: col, w: 1 }, exp: v, max: 2, add,
          assist: { type: 'kuku', n: bj, k: ai, c: c0 } };
        if (i === 0 && prevC.length) st.preDel = prevC.slice();
        if (v >= 10 && !last) {
          add.push(M(`p${ri}_${i}`, r, col, v % 10, 'd', o));
          const p = cpos(i + 1), cv = Math.floor(v / 10), id = `m${ri}c${i + 1}`;
          add.push(M(id, p.r, p.c, cv, 's', { p: p.p, cl: 'cy' })); cIds.push(id);
          st.fly = { to: [p.r, p.c], t: '' + cv };
          st.ok = `${v}だね！ ${v % 10}を かいて、${cv}を くりあげるよ`;
          cin = cv;
        } else if (v >= 10) {
          add.push(M(`p${ri}_${i}`, r, col, v % 10, 'd', o));
          add.push(M(`p${ri}_${i}b`, r, col - 1, Math.floor(v / 10), 'd', o));
          st.ok = `${v}！ さいごだから、そのまま かくよ`;
          cin = 0;
        } else { add.push(M(`p${ri}_${i}`, r, col, v, 'd', o)); cin = 0; }
        steps.push(st);
      }
      prevC = cIds;
      const pp = '' + a * bj;
      for (let t = 0; t < pp.length; t++) (colDigits[R - j - t] = colDigits[R - j - t] || []).push([r, +pp[pp.length - 1 - t]]);
    });
    if (multi) {
      let cin = 0;
      for (let k = 0; k < P; k++) {
        const col = R - k, ds = colDigits[col] || [], c0 = cin, v = ds.reduce((s, d) => s + d[1], 0) + c0, last = k === P - 1;
        const hl = ds.map(d => [d[0], col]);
        if (c0) hl.push([sumRow, col]);
        let say = k === 0 ? `さいごに {下|した}の だんを たし{算|ざん}しよう。` : `つぎは ${plP(k)}。`;
        const cnt = ds.length + (c0 ? 1 : 0);
        if (cnt === 0) say += `なにも ないから 0を かこう`;
        else if (cnt === 1) say += `${ds.length ? ds[0][1] : c0}を そのまま おろそう`;
        else say += ds.map(d => d[1]).join('＋') + (c0 ? `、くりあがりの ${c0}も たそう` : `を しよう`);
        const add = [];
        const st = { type: 'in', say, hl, box: { r: sumRow, c: col, w: 1 }, exp: v, max: 2, add };
        if (v >= 10 && !last) {
          add.push(M('s' + k, sumRow, col, v % 10, 'd', { u: 1, ans: 1 }));
          const cv = Math.floor(v / 10);
          add.push(M('sc' + (k + 1), sumRow, col - 1, cv, 's', { p: 'tl', cl: 'cy' }));
          st.fly = { to: [sumRow, col - 1], t: '' + cv };
          st.ok = `${v}だね！ ${v % 10}を かいて、${cv}を くりあげるよ`;
          cin = cv;
        } else if (v >= 10) {
          add.push(M('s' + k, sumRow, col, v % 10, 'd', { u: 1, ans: 1 }));
          add.push(M('s' + k + 'b', sumRow, col - 1, Math.floor(v / 10), 'd', { u: 1, ans: 1 }));
          cin = 0;
        } else { add.push(M('s' + k, sumRow, col, v, 'd', { u: 1, ans: 1 })); cin = 0; }
        if (ds.length === 2 && v >= 10) { st.assist = { type: 'add', x: ds[0][1], y: ds[1][1], c: c0 }; st.ask = true; }
        steps.push(st);
      }
    }
    return { base, steps, ans: PR, R, AR: multi ? sumRow : 5 };
  }

  // ---- わり算 ----
  function genDiv(a, b, S) {
    const A = '' + a, B = '' + b, la = A.length, lb = B.length, D0 = lb + 2;
    const q = Math.floor(a / b), r = a % b;
    const base = [];
    putNum(base, 'dv', B, 3, lb + 1);
    for (let i = 0; i < la; i++) base.push(M('a' + i, 3, D0 + i, A[i], 'd'));
    base.push({ id: 'br', k: 'br', r: 3, c: D0 });
    base.push(LN('ov', 2, D0, D0 + la - 1));
    const dvCells = []; for (let c = 2; c <= lb + 1; c++) dvCells.push([3, c]);
    const steps = [];
    steps.push({ type: 'info', say: 'わり{算|ざん}は「たてる → かける → ひく → おろす」を くりかえすよ', hl: [] });
    let p = 0; while (+A.slice(0, p + 1) < b) p++;
    let cur = +A.slice(0, p + 1), curRow = 3, row = 4;
    const cells = (rr, right, len) => { const o = []; for (let t = 0; t < len; t++) o.push([rr, right - t]); return o; };
    if (p > 0) {
      steps.push({ type: 'info', say: `${A.slice(0, p)}の {中|なか}に ${b}は はいらないね。${cur}で かんがえよう`, hl: cells(3, D0 + p, p + 1) });
    }
    for (; p < la; p++) {
      const qq = Math.floor(cur / b), col = D0 + p, curLen = ('' + cur).length;
      const tq = {
        type: 'in', say: `たてる：${cur}÷${b}の こたえを、${A[p]}の {上|うえ}に たてよう`,
        hl: cells(curRow, col, curLen).concat(dvCells), box: { r: 2, c: col, w: 1 }, exp: qq, max: 1,
        add: [M('q' + p, 2, col, qq, 'd', { u: 1, ans: 1 })], assist: { type: 'kuku', n: b, k: qq, div: cur },
        wr: { div: true, cur, b },
      };
      steps.push(tq);
      if (qq === 0) {
        tq.ok = `${cur}は ${b}より {小|ちい}さいから 0を たてるよ`;
      } else {
        const prod = qq * b, pl2 = ('' + prod).length, rem = cur - prod;
        const left = Math.min(col - curLen + 1, col - pl2 + 1);
        const kAdd = []; putNum(kAdd, `k${p}_`, '' + prod, row, col, { u: 1 });
        kAdd.push(LN('kl' + p, row, left, col));
        steps.push({
          type: 'in', say: `かける：たてた ${qq}と、わる{数|かず}の ${b}を かけよう`,
          hl: [[2, col]].concat(dvCells), box: { r: row, c: col, w: pl2 }, exp: prod, max: pl2 + 1, add: kAdd,
          ok: `${qq}×${b}＝${prod}`, assist: { type: 'kuku', n: b, k: qq },
        });
        const more = p < la - 1;
        const hAdd = [];
        if (rem === 0 && more) hAdd.push(M(`h${p}_0`, row + 1, col, 0, 'd', { u: 1, g: 1 }));
        else putNum(hAdd, `h${p}_`, '' + rem, row + 1, col, { u: 1 });
        const hs = { type: 'in', say: `ひく：${cur}−${prod}を しよう`, hl: cells(curRow, col, curLen).concat(cells(row, col, pl2)),
          box: { r: row + 1, c: col, w: ('' + rem).length }, exp: rem, max: ('' + rem).length + 1, add: hAdd };
        if (rem === 0 && more) hs.ok = '0だね。0は かかないで、つぎへ すすむよ';
        steps.push(hs);
        cur = rem; curRow = row + 1; row += 2;
      }
      if (p < la - 1) {
        const d = +A[p + 1];
        const nc = cur * 10 + d;
        steps.push({
          type: 'in', say: `おろす：つぎの ${d}を {下|した}に おろそう`, hl: [[3, col + 1]],
          box: { r: curRow, c: col + 1, w: 1 }, exp: d, max: 1,
          add: [M(`o${p + 1}`, curRow, col + 1, d, 'd', cur === 0 && d === 0 ? { u: 1, g: 1 } : { u: 1 })], fly: { from: [3, col + 1], to: [curRow, col + 1], t: '' + d },
          ok: cur === 0 && d === 0 ? '0だけだから、0は かかないよ' : `${nc}に なったね`,
        });
        cur = nc;
      }
    }
    steps.push({ type: 'info', hl: cells(curRow, D0 + la - 1, ('' + cur).length),
      say: r > 0 ? `${b}より {小|ちい}さく なったから おわり。あまりは ${r}だよ` : 'あまりは 0。わりきれたね！' });
    return { base, steps, ans: '' + q, rem: r };
  }

  function build(prob, S) {
    S = S || {};
    const g = { '+': genAdd, '-': genSub, '*': genMul, '/': genDiv }[prob.op];
    const plan = g(prob.a, prob.b, S);
    const fs = `${prob.a}${OPS[prob.op]}${prob.b}`;
    plan.base.unshift(...[...fs].map((ch, i) => M('f' + i, 0, i + 1, ch, 'f')));
    let fa = '＝' + plan.ans; if (prob.op === '/' && plan.rem > 0) fa += 'あまり' + plan.rem;
    plan.fin = [...fa].map((ch, i) => M('fa' + i, 0, fs.length + 1 + i, ch, 'f', { fa: 1 }));
    plan.formula = fs;
    return plan;
  }

  const api = { COLS, ROWS, OPS, LIM, parse, build, PL, PLF, M, LN, dig, putNum, genAdd, genSub, genMul, genDiv };
  if (typeof module !== 'undefined') module.exports = api; else G.HISSAN = api;
})(typeof window !== 'undefined' ? window : globalThis);
