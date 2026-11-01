// ===== ひっ算おたすけ君：練習問題（学年・単元・問題づくり） =====
// 単元は 学習指導要領（算数）の 筆算の あつかいに あわせる。
// 1問 = { f: '52+89'（式）, opt: わり算の えらびかた（小数版）, note: さいしょに 言うこと }
(function (G) {
  'use strict';
  const R = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const nd = n => R(10 ** (n - 1), 10 ** n - 1); // n けたの 数
  // 小数を つくる（整数の けた ip、小数の けた dp。いちばん下の けたは 0に しない）
  const dec = (ip, dp) => {
    let i = ip === 0 ? '0' : String(nd(ip));
    if (!dp) return i;
    let f = ''; for (let k = 0; k < dp; k++) f += R(k === dp - 1 ? 1 : 0, 9);
    return i + '.' + f;
  };
  const digs = s => s.replace('.', '').replace(/^0+/, '').length;
  const PLC = ['{一|いち}の{位|くらい}', '1/10の{位|くらい}', '1/100の{位|くらい}'];

  // ---- 整数版 ----
  const INT = {
    2: [
      { id: 'a2n', t: 'たし{算|ざん}（くり{上|あ}がりなし）', ex: '32＋45', c: 'g-green', gen: () => {
        const ta = R(1, 8), oa = R(0, 9), tb = R(1, 9 - ta), ob = R(0, 9 - oa);
        return `${ta * 10 + oa}+${tb * 10 + ob}`; } },
      { id: 'a2y', t: 'たし{算|ざん}（くり{上|あ}がりあり）', ex: '38＋27', c: 'g-green', gen: () => {
        const ta = R(1, 7), tb = R(1, 8 - ta), oa = R(1, 9), ob = R(10 - oa, 9);
        return `${ta * 10 + oa}+${tb * 10 + ob}`; } },
      { id: 's2n', t: 'ひき{算|ざん}（くり{下|さ}がりなし）', ex: '68−25', c: 'g-cyan', gen: () => {
        const ta = R(2, 9), oa = R(0, 9), tb = R(1, ta - 1), ob = R(0, oa);
        return `${ta * 10 + oa}-${tb * 10 + ob}`; } },
      { id: 's2y', t: 'ひき{算|ざん}（くり{下|さ}がりあり）', ex: '52−27', c: 'g-cyan', gen: () => {
        const ta = R(2, 9), oa = R(0, 8), tb = R(1, ta - 1), ob = R(oa + 1, 9);
        return `${ta * 10 + oa}-${tb * 10 + ob}`; } },
      { id: 'a3', t: '{答|こた}えが 3けたの たし{算|ざん}', ex: '67＋58', c: 'g-orange', gen: () => {
        let a, b; do { a = nd(2); b = nd(2); } while (a + b < 100);
        return `${a}+${b}`; } },
      { id: 's3', t: '3けた−2けたの ひき{算|ざん}', ex: '134−58', c: 'g-orange', gen: () => {
        let a, b; do { a = R(100, 199); b = nd(2); } while (a - b >= 100 || a - b < 1);
        return `${a}-${b}`; } },
    ],
    3: [
      { id: 'a34', t: '3けた・4けたの たし{算|ざん}', ex: '468＋357', c: 'g-green', gen: () => `${nd(R(3, 4))}+${nd(R(3, 4))}` },
      { id: 's34', t: '3けた・4けたの ひき{算|ざん}', ex: '703−258', c: 'g-cyan', gen: () => {
        let a, b; do { a = nd(R(3, 4)); b = nd(3); } while (b >= a);
        return `${a}-${b}`; } },
      { id: 'm21', t: 'かけ{算|ざん}（2けた×1けた）', ex: '37×4', c: 'g-orange', gen: () => `${nd(2)}*${R(2, 9)}` },
      { id: 'm31', t: 'かけ{算|ざん}（3けた×1けた）', ex: '268×3', c: 'g-orange', gen: () => `${nd(3)}*${R(2, 9)}` },
      { id: 'm22', t: 'かけ{算|ざん}（2けた×2けた）', ex: '46×23', c: 'g-pink', gen: () => `${nd(2)}*${R(11, 99)}` },
      { id: 'm32', t: 'かけ{算|ざん}（3けた×2けた）', ex: '324×56', c: 'g-pink', gen: () => `${nd(3)}*${R(11, 99)}` },
    ],
    4: [
      { id: 'd21', t: 'わり{算|ざん}（2けた÷1けた）', ex: '78÷3', c: 'g-green', gen: () => `${nd(2)}/${R(2, 9)}` },
      { id: 'd31', t: 'わり{算|ざん}（3けた÷1けた）', ex: '745÷6', c: 'g-cyan', gen: () => `${nd(3)}/${R(2, 9)}` },
      { id: 'd22', t: 'わり{算|ざん}（2けた÷2けた）', ex: '84÷21', c: 'g-orange', gen: () => {
        let a, b; do { a = nd(2); b = R(11, 99); } while (a < b);
        return `${a}/${b}`; } },
      { id: 'd32', t: 'わり{算|ざん}（3けた÷2けた）', ex: '864÷32', c: 'g-pink', gen: () => `${nd(3)}/${R(11, 99)}` },
    ],
  };

  // ---- 小数点あり版 ----
  const remNote = k => `この もんだいは、{商|しょう}を ${PLC[k]}まで もとめて、あまりも 出そう`;
  const rndNote = k => `この もんだいは、{商|しょう}を {四捨五入|ししゃごにゅう}して、${PLC[k]}までの がい{数|すう}に しよう`;
  // わりきれる わり算：わる数 × 商 で わられる数を つくる
  function exactDiv(bGen, qGen) {
    for (let t = 0; t < 50; t++) {
      const b = bGen(), q = qGen();
      const db = (b.split('.')[1] || '').length, dq = (q.split('.')[1] || '').length;
      const v = Math.round(Number(b) * Number(q) * 10 ** (db + dq));
      let s = String(v).padStart(db + dq + 1, '0');
      const d = db + dq; if (d) s = s.slice(0, -d) + '.' + s.slice(-d);
      s = s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
      s = s.replace(/^0+(?=\d)/, '');
      if ((s.split('.')[1] || '').length <= 2 && digs(s) <= 4 && s.replace('.', '').length <= 4) return `${s}/${b}`;
    }
    return null;
  }
  const DEC = {
    4: [
      { id: 'da', t: '{小数|しょうすう}の たし{算|ざん}', ex: '2.45＋1.8', c: 'g-green', gen: () => `${dec(R(0, 2), R(1, 2))}+${dec(R(0, 2), R(1, 2))}` },
      { id: 'ds', t: '{小数|しょうすう}の ひき{算|ざん}', ex: '5.2−1.75', c: 'g-cyan', gen: () => {
        let a, b; do { a = dec(R(1, 2), R(0, 2)); b = dec(R(0, 1), R(1, 2)); } while (Number(b) >= Number(a));
        return `${a}-${b}`; } },
      { id: 'dmi', t: '{小数|しょうすう}×{整数|せいすう}', ex: '2.4×6', c: 'g-orange', gen: () => `${dec(R(0, 2), R(1, 2))}*${R(2, 3) === 2 ? R(2, 9) : R(11, 49)}` },
      { id: 'ddi', t: '÷{整数|せいすう}（わりきれるまで）', ex: '7.2÷3', c: 'g-pink', opt: { mode: 'end' },
        gen: () => exactDiv(() => String(R(2, 9)), () => (R(0, 3) ? dec(R(0, 1), R(1, 2)) : dec(1, 0))) },
      { id: 'dri', t: '÷{整数|せいすう}（あまりを {出|だ}す）', ex: '8.5÷3', c: 'g-navy', optGen: () => ({ mode: 'rem', k: R(0, 1) }),
        gen: () => `${dec(R(1, 2), 1)}/${R(2, 9)}` },
      { id: 'dni', t: '÷{整数|せいすう}（がい{数|すう}で {出|だ}す）', ex: '5.3÷7', c: 'g-gray', optGen: () => ({ mode: 'round', k: R(0, 1) }),
        gen: () => `${dec(R(1, 2), R(0, 1))}/${R(3, 9)}` },
    ],
    5: [
      { id: 'dmd', t: '×{小数|しょうすう}', ex: '2.3×1.6', c: 'g-orange', gen: () => { const b = dec(R(0, 1), R(1, 2)); return /^0\.0?1$/.test(b) ? null : `${R(0, 2) ? dec(R(0, 2), R(1, 2)) : String(nd(R(1, 2)))}*${b}`; } },
      { id: 'ddd', t: '÷{小数|しょうすう}（わりきれるまで）', ex: '7.8÷2.6', c: 'g-pink', opt: { mode: 'end' },
        gen: () => exactDiv(() => dec(R(0, 1), 1), () => (R(0, 1) ? dec(1, R(0, 1)) : String(R(2, 30)))) },
      { id: 'drd', t: '÷{小数|しょうすう}（あまりを {出|だ}す）', ex: '5.4÷0.8', c: 'g-navy', optGen: () => ({ mode: 'rem', k: 0 }),
        gen: () => { const b = dec(R(0, 1), 1); return b === '0.1' ? null : `${dec(R(1, 2), 1)}/${b}`; } },
      { id: 'dnd', t: '÷{小数|しょうすう}（がい{数|すう}で {出|だ}す）', ex: '3.7÷2.3', c: 'g-gray', optGen: () => ({ mode: 'round', k: R(0, 1) }),
        gen: () => { const b = dec(R(0, 1), 1); return b === '0.1' ? null : `${dec(R(1, 2), 1)}/${b}`; } },
    ],
  };

  // ---- 問題を n問 つくる（なるべく かぶらない） ----
  // H: ロジック（HISSAN か HISSAN_DEC）, unit: 単元, S: せってい
  function make(H, unit, n, S) {
    const out = [], seen = new Set();
    for (let i = 0; i < n; i++) {
      let got = null;
      for (let t = 0; t < 400 && !got; t++) {
        const f = unit.gen(); if (!f) continue;
        const opt = unit.optGen ? unit.optGen() : unit.opt || null;
        const key = f + JSON.stringify(opt);
        if (seen.has(key) && t < 300) continue;
        const p = H.parse(f); if (!p.ok) continue;
        const plan = H.build(p, S || {}, opt);
        if (plan.ok === false) continue;
        got = { f, p, opt, key, note: opt && opt.mode === 'rem' ? remNote(opt.k) : opt && opt.mode === 'round' ? rndNote(opt.k) : '' };
      }
      if (got) { seen.add(got.key); out.push(got); }
    }
    return out;
  }

  const api = { INT, DEC, make };
  if (typeof module !== 'undefined') module.exports = api; else G.DRILL = api;
})(typeof window !== 'undefined' ? window : globalThis);
