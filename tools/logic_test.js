// node tools/logic_test.js  … 手順の答え・はみ出し・重なりを ぜんぶ しらべる
const H = require('../src/logic.js');
let fails = 0, n = 0;
const bad = (m) => { if (fails++ < 30) console.log('NG', m); };

function play(prob, S) {
  const plan = H.build(prob, S);
  const map = new Map(); plan.base.forEach(m => map.set(m.id, m));
  const ids = new Set();
  const inB = (r, c, w) => r >= 0 && r < H.ROWS && c - (w || 1) + 1 >= 1 && c < H.COLS;
  for (const s of plan.steps) {
    (s.pre || []).forEach(m => map.set(m.id, m)); (s.preDel || []).forEach(id => map.delete(id));
    if (s.type === 'in') {
      if (!s.box || !inB(s.box.r, s.box.c, Math.max(s.box.w, ('' + s.exp).length, s.max))) bad(`box out ${JSON.stringify(prob)} ${JSON.stringify(s.box)} max${s.max}`);
      if (('' + s.exp).length > s.max) bad('max too small ' + JSON.stringify(prob));
    }
    (s.add || []).forEach(m => map.set(m.id, m)); (s.del || []).forEach(id => map.delete(id));
  }
  plan.fin.forEach(m => map.set(m.id, m));
  const occ = {};
  for (const m of map.values()) {
    if (m.k === 'L') { if (!(m.c1 >= 1 && m.c2 < H.COLS && m.r < H.ROWS)) bad('line out ' + JSON.stringify(prob)); continue; }
    if (!inB(m.r, m.c)) bad(`mark out ${JSON.stringify(prob)} ${JSON.stringify(m)}`);
    if (m.k === 'br' || m.g) continue;
    const key = `${m.r},${m.c},${m.k === 's' ? m.p : 'big'}`;
    if (occ[key]) bad(`overlap ${JSON.stringify(prob)} ${key} ${occ[key]} ${m.id}`);
    occ[key] = m.id;
  }
  // こたえを ノートから 読む
  const ans = [...map.values()].filter(m => m.ans && !m.g).sort((x, y) => x.c - y.c);
  const rows = new Set(ans.map(m => m.r));
  if (rows.size !== 1) bad('ans rows ' + JSON.stringify(prob) + [...rows]);
  const txt = ans.map(m => m.t).join('');
  if (txt !== plan.ans) bad(`ans ${JSON.stringify(prob)} got ${txt} want ${plan.ans}`);
  // 式の行
  const fin = [...map.values()].filter(m => m.r === 0).sort((x, y) => x.c - y.c).map(m => m.t).join('');
  const sym = { '+': '＋', '-': '−', '*': '×', '/': '÷' }[prob.op];
  let want = `${prob.a}${sym}${prob.b}＝${plan.ans}`; if (plan.rem) want += 'あまり' + plan.rem;
  if (fin !== want) bad(`formula ${fin} ${want}`);
  n++;
}
const rnd = d => { const lo = d === 1 ? 0 : 10 ** (d - 1); return lo + Math.floor(Math.random() * (10 ** d - lo)); };
const SS = [{ carry: 'up', borrow: 'up' }, { carry: 'down', borrow: 'side' }];
const special = [[9999, 9999, '+'], [1000, 1, '-'], [1000, 999, '-'], [100, 100, '-'], [5, 3, '-'], [9999, 999, '*'], [23, 10, '*'], [23, 105, '*'], [23, 100, '*'], [905, 909, '*'],
  [9999, 1, '/'], [9999, 99, '/'], [615, 3, '/'], [1000, 7, '/'], [84, 4, '/'], [100, 10, '/'], [12, 12, '/'], [9990, 10, '/'], [6012, 3, '/'], [0, 0, '+'], [52, 89, '+']];
for (const S of SS) {
  special.forEach(([a, b, op]) => play({ a, b, op }, S));
  for (let t = 0; t < 4000; t++) {
    const op = '+-*/'[t % 4];
    const [la, lb] = H.LIM[op];
    let a = rnd(1 + Math.floor(Math.random() * la)), b = rnd(1 + Math.floor(Math.random() * lb));
    const p = H.parse(`${a}${op}${b}`); if (!p.ok) continue;
    play(p, S);
  }
}
console.log(fails ? `NG ${fails}` : 'OK', n, 'もんだい');
process.exit(fails ? 1 : 0);
