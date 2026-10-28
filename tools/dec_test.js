// node tools/dec_test.js … 小数点あり版の 手順を ぜんぶ ためす
const D = require('../src/logic-dec.js');
let fails = 0, n = 0, skip = 0; const why = {};
const bad = m => { if (fails++ < 40) console.log('NG', m); };
// ノートの r行を 数として 読む（けした数字・小数点は のぞく）
function readRow(map, r, filt) {
  const ds = [...map.values()].filter(m => m.r === r && (m.k === 'd' || m.k === 'f') && !m.g && !m.x && (!filt || filt(m))).sort((a, b) => a.c - b.c);
  const pts = [...map.values()].filter(m => m.r === r && m.k === 'pt' && !m.x).map(m => m.c);
  let s = ''; ds.forEach(m => { s += m.t; if (pts.includes(m.c)) s += '.'; });
  return s;
}
function play(prob, S, opt, want) {
  const plan = D.build(prob, S, opt);
  if (!plan.ok) { skip++; why[plan.why] = (why[plan.why] || 0) + 1; return plan; }
  const map = new Map(); plan.base.forEach(m => map.set(m.id, m));
  for (const s of plan.steps) {
    (s.pre || []).forEach(m => map.set(m.id, m)); (s.preDel || []).forEach(id => map.delete(id));
    if (s.type === 'tap' || s.type === 'zero') {
      if (!s.cands.some(([r, c]) => r === s.exp[0] && c === s.exp[1])) bad('exp not in cands ' + JSON.stringify(prob));
      if (s.cands.length < 2 && s.type === 'tap') bad('1 cand ' + JSON.stringify(prob));
    }
    if (s.type === 'in' && s.str && typeof s.exp !== 'string') bad('str');
    (s.add || []).forEach(m => map.set(m.id, m)); (s.del || []).forEach(id => map.delete(id));
  }
  (plan.fin || []).forEach(m => map.set(m.id, m));
  // 重なり
  const occ = {};
  for (const m of map.values()) {
    if (m.k === 'L' || m.k === 'br' || m.k === 'arc' || m.g) continue;
    const key = `${m.r},${m.c},${m.k === 's' ? m.p : m.k === 'pt' ? 'pt' : 'big'}`;
    if (occ[key] && !(m.k === 'pt')) bad(`overlap ${JSON.stringify(prob)} ${JSON.stringify(opt)} ${key} ${occ[key]} ${m.id}`);
    occ[key] = m.id;
  }
  if (prob.op !== '/') { const row = Math.max(...[...map.values()].filter(m => m.ans).map(m => m.r)); const v = readRow(map, row, m => m.ans); if (v !== plan.ans) bad(`notebook ${JSON.stringify(prob)} ${v} ${plan.ans}`); }
  else if (opt.mode !== 'round') { const v = D.norm(readRow(map, 2)); if (v !== plan.ans) bad(`quot ${JSON.stringify(prob)} ${JSON.stringify(opt)} ${v} ${plan.ans}`);
    if (opt.mode === 'rem' && plan.rem && plan.rem !== '0') { const rr = Math.max(...[...map.values()].filter(m => m.k === 'd' && m.r > 3 && !m.g).map(m => m.r)); const v2 = D.norm(readRow(map, rr)); if (v2 !== plan.rem) bad(`rem ${JSON.stringify(prob)} ${JSON.stringify(opt)} ${v2} ${plan.rem}`); } }
  const f = readRow(map, 0);
  if (want && f !== want) bad(`formula ${JSON.stringify(prob)} ${JSON.stringify(opt)} got ${f} want ${want}`);
  n++;
  return plan;
}
// 正しい こたえ（整数で 計算）
const decs = s => (s.includes('.') ? s.split('.')[1].length : 0);
const sc = (s, d) => BigInt(s.replace('.', '') + '0'.repeat(d - decs(s)));
function fmtB(v, d) { let s = v.toString().padStart(d + 1, '0'); if (d) s = s.slice(0, -d) + '.' + s.slice(-d); return D.norm(s); }
const sym = { '+': '＋', '-': '−', '*': '×', '/': '÷' };
function check(a, b, op, S) {
  const p = D.parse(a + op + b); if (!p.ok) return;
  const head = `${p.a}${sym[op]}${p.b}`;
  if (op === '+' || op === '-') { const d = Math.max(decs(p.a), decs(p.b)); const v = op === '+' ? sc(p.a, d) + sc(p.b, d) : sc(p.a, d) - sc(p.b, d); play(p, S, null, head + '＝' + fmtB(v, d)); }
  else if (op === '*') { const d = decs(p.a) + decs(p.b); play(p, S, null, head + '＝' + fmtB(sc(p.a, decs(p.a)) * sc(p.b, decs(p.b)), d)); }
  else {
    const d = Math.max(decs(p.a), decs(p.b)), A = sc(p.a, d), B = sc(p.b, d);
    // end
    let e = null; for (let k = 0; k <= 3; k++) { if ((A * 10n ** BigInt(k)) % B === 0n) { e = fmtB(A * 10n ** BigInt(k) / B, k); break; } }
    const pe = play(p, S, { mode: 'end' }, e ? head + '＝' + e : null);
    if (e && !pe.ok && !/入りきらない/.test(pe.why)) bad('end refused ' + head + pe.why);
    if (!e && pe.ok) bad('end accepted ' + head);
    for (let k = 0; k <= 2; k++) {
      const q = A * 10n ** BigInt(k) / B;
      const r = A * 10n ** BigInt(k) - q * B; // 10^-(d+k) 単位
      let want = head + '＝' + fmtB(q, k) + (r ? 'あまり' + fmtB(r, d + k) : '');
      play(p, S, { mode: 'rem', k }, q > 0n ? want : null);
      const q1 = A * 10n ** BigInt(k + 1) / B, qr = q1 / 10n + (q1 % 10n >= 5n ? 1n : 0n);
      let rs = qr.toString().padStart(k + 1, '0'); if (k) rs = rs.slice(0, -k) + '.' + rs.slice(-k); else rs = rs.replace(/^0+(?=\d)/, '');
      play(p, S, { mode: 'round', k }, q1 > 0n ? head + '≒' + rs : null);
    }
  }
}
const rnd = () => {
  const L = 1 + Math.floor(Math.random() * 4), dp = Math.min(L - 1 < 0 ? 0 : Math.floor(Math.random() * 3), 2);
  let s = ''; for (let i = 0; i < L; i++) s += Math.floor(Math.random() * 10);
  if (dp && dp < L) s = s.slice(0, L - dp) + '.' + s.slice(L - dp); else if (dp) s = '0.' + s.slice(0, dp);
  return s;
};
const S1 = [{ carry: 'up', borrow: 'up' }, { carry: 'down', borrow: 'side' }];
const special = [['12.5', '3.75', '+'], ['2.5', '1.5', '+'], ['0.2', '0.3', '+'], ['5', '2.36', '-'], ['10.5', '9.8', '-'], ['1', '0.01', '-'], ['0.3', '0.2', '*'], ['2.5', '0.4', '*'],
  ['0.03', '0.02', '*'], ['2.5', '40', '*'], ['12.34', '5.6', '*'], ['7.5', '2.5', '/'], ['0.24', '6', '/'], ['1', '8', '/'], ['7', '0.3', '/'], ['0.75', '0.25', '/'], ['5.3', '2', '/'], ['7.25', '3', '/'], ['99.99', '7', '/'], ['12.5', '3', '/'], ['0.5', '2', '/']];
for (const S of S1) {
  special.forEach(([a, b, op]) => check(a, b, op, S));
  for (let t = 0; t < 3000; t++) {
    const op = '+-*/'[t % 4];
    let a = rnd(), b = rnd();
    if (a.replace('.', '').length > 4 || b.replace('.', '').length > D.LIM[op][1]) continue;
    check(a, b, op, S);
  }
}
console.log(why);
console.log(fails ? `NG ${fails}` : 'OK', n, 'もんだい', '（ノートに入らず ことわった', skip, '）');
process.exit(fails ? 1 : 0);
