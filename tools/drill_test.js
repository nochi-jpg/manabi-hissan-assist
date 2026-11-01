// node tools/drill_test.js … 練習問題が 単元どおりに 作れるか・かぶらないか
const D = require('../src/drill.js'), HI = require('../src/logic.js'), HD = require('../src/logic-dec.js');
let fails = 0; const bad = m => { if (fails++ < 30) console.log('NG', m); };
const chk = {
  a2n: (a, b) => a % 10 + b % 10 < 10 && a + b < 100 && b >= 10, a2y: (a, b) => a % 10 + b % 10 >= 10 && a + b < 100,
  s2n: (a, b) => a % 10 >= b % 10 && b >= 10 && a > b, s2y: (a, b) => a % 10 < b % 10 && a > b && b >= 10,
  a3: (a, b) => a + b >= 100 && a < 100 && b < 100, s3: (a, b) => a >= 100 && a - b < 100,
};
for (const [H, U] of [[HI, D.INT], [HD, D.DEC]]) {
  for (const g in U) for (const u of U[g]) {
    const keys = new Set(); let total = 0;
    for (let r = 0; r < 30; r++) {
      for (const n of [3, 5, 10]) {
        const ps = D.make(H, u, n, {});
        if (ps.length !== n) bad(`${u.id} n=${n} got ${ps.length}`);
        const ks = new Set(ps.map(p => p.key));
        if (ks.size !== ps.length) bad(`${u.id} dup in set`);
        ps.forEach(p => { keys.add(p.key); total++;
          if (chk[u.id] && !chk[u.id](p.p.a, p.p.b)) bad(`${u.id} rule ${p.f}`);
          const plan = H.build(p.p, {}, p.opt); if (plan.ok === false) bad(`${u.id} plan ${p.f}`);
        });
      }
    }
    console.log(`${g}年 ${u.id}`.padEnd(10), 'しゅるい', keys.size, '/', total, 'れい', D.make(H, u, 3, {}).map(p => p.f + (p.opt ? JSON.stringify(p.opt) : '')).join('  '));
  }
}
console.log(fails ? 'NG ' + fails : 'OK');
process.exit(fails ? 1 : 0);
