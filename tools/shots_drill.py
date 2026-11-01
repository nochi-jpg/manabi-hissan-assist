# python3 tools/shots_drill.py OUTDIR … タイトル・練習問題モード・けっかの スクショと はみ出しチェック
import sys, os
from playwright.sync_api import sync_playwright
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CHECK = """() => {
  const st = document.getElementById('stage').getBoundingClientRect(), sc = st.width / 1600, bad = [];
  const vis = e => { for (let x = e; x; x = x.parentElement) { if (x.hidden || getComputedStyle(x).display === 'none') return false; } return true; };
  document.querySelectorAll('#stage button, #stage .mt, #stage small, .hQ, .hTtl, .rsInfo span, #say, .etxt, .card h2, .card p, .score').forEach(e => {
    if (!vis(e)) return;
    const r = e.getBoundingClientRect(); if (!r.width) return;
    const name = (e.id || e.className || e.tagName) + ':' + e.textContent.trim().slice(0, 14);
    if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible') bad.push('はみだし(よこ) ' + name);
    // 文字そのものの はば（ボタンの ふちから 10px 内側に おさまるか）
    const btn = e.closest('button');
    if (btn && e !== btn) { const rg = document.createRange(); rg.selectNodeContents(e); const q = rg.getBoundingClientRect(), br = btn.getBoundingClientRect(), pad = 10 * sc;
      if (q.width && (q.left < br.left + pad || q.right > br.right - pad)) bad.push('文字が ボタンの ふちに ちかい/はみだし ' + name); }
    if (e.tagName === 'BUTTON') { [...e.children].forEach(c => { const q = c.getBoundingClientRect(); if (q.width && (q.left < r.left - 1 || q.right > r.right + 1 || q.top < r.top - 1 || q.bottom > r.bottom + 1)) bad.push('ボタンから はみだし ' + name); }); }
    if (r.left < st.left - 1 || r.right > st.right + 1 || r.top < st.top - 1 || r.bottom > st.bottom + 1) bad.push('画面の外 ' + name);
  });
  // ボタンどうしの かぶり
  const bs = [...document.querySelectorAll('#stage button')].filter(vis).map(e => [e, e.getBoundingClientRect()]).filter(x => x[1].width);
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
    const a = bs[i][1], b = bs[j][1];
    if (a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2) {
      const ma = document.getElementById('modal'); if (!ma.hidden && (!ma.contains(bs[i][0]) || !ma.contains(bs[j][0]))) continue;
      const ho = document.getElementById('home'); if (!ho.hidden && (ho.contains(bs[i][0]) !== ho.contains(bs[j][0]))) continue;
      bad.push('かぶり ' + bs[i][0].textContent.trim().slice(0, 8) + ' / ' + bs[j][0].textContent.trim().slice(0, 8));
    }
  }
  const ch = document.querySelector('.hChara'), hb = document.getElementById('hBtns');
  if (vis(ch)) { const a = ch.getBoundingClientRect(); [...hb.children].forEach(e => { const b = e.getBoundingClientRect(); if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) bad.push('キャラと かぶり ' + e.textContent.trim().slice(0, 8)); }); }
  return bad;
}"""
SOLVE = """() => { const h = __hissan, s = h.cur(); if (!s || h.st.post || h.st.phase !== 'solve') return h.st.phase;
  if (s.type === 'info') h.key('OK');
  else if (s.type === 'in') { for (const ch of String(s.exp)) h.key(ch); h.key('OK'); }
  else if (s.type === 'choice') document.querySelector(`[data-act=ch][data-v="${s.exp}"]`).click();
  else document.querySelector(`#boxL [data-r="${s.exp[0]}"][data-c="${s.exp[1]}"]`).click();
  return 'step'; }"""
allbad = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for app, grades in [('index.html', ['2', '3', '4']), ('shousu.html', ['4', '5'])]:
        pg = b.new_page(viewport={'width': 1366, 'height': 650}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('file://' + R + '/' + app); pg.wait_for_timeout(400)
        tag = app.split('.')[0]
        def shot(n, w=350):
            pg.wait_for_timeout(w); pg.screenshot(path=f'{out}/{tag}_{n}.png')
            bad = pg.evaluate(CHECK)
            if bad: allbad.append((tag, n, bad))
        def finish_q(miss=False):
            for i in range(200):
                if pg.evaluate("__hissan.st.phase") == 'done': break
                if pg.evaluate("__hissan.st.post"): pg.evaluate("__hissan.fwd()"); continue
                if miss and i == 2: pg.evaluate("(()=>{const s=__hissan.cur(); if(s&&s.type==='in'){__hissan.key('9');__hissan.key('9');__hissan.key('OK');}})()")
                pg.evaluate(SOLVE); pg.wait_for_timeout(10)
            pg.wait_for_timeout(1800)
        shot('01_title')
        pg.click('[data-h=drill]'); shot('02_grade')
        for g in grades:
            pg.click(f'[data-h="g:{g}"]'); shot(f'03_unit{g}'); pg.click('#hBack')
        pg.click(f'[data-h="g:{grades[0]}"]'); pg.click('[data-h="u:1"]'); shot('04_assist')
        pg.click('[data-h="a:miss"]'); shot('05_count')
        pg.click('[data-h="n:3"]'); shot('06_q1_quiet', 700)
        # 1問目：とちゅうで まちがえる
        pg.evaluate("(()=>{for(let i=0;i<3;i++){const s=__hissan.cur(); if(s&&s.type==='info')__hissan.key('OK');}})()")
        pg.evaluate("(()=>{const s=__hissan.cur(); if(s&&s.type==='in'){__hissan.key('9');__hissan.key('9');__hissan.key('OK');}})()"); shot('07_after_miss', 900)
        finish_q(); shot('08_end1', 200)
        pg.click('#bNew'); finish_q(); pg.click('#bNew'); finish_q(); shot('09_end3', 200)
        pg.click('#bNew'); shot('10_result', 900)
        pg.click('[data-m=unit]'); shot('11_back_unit')
        pg.click('#hBack'); pg.click('#hBack'); pg.click('[data-h=help]'); shot('12_help_mode')
        # 練習中の 画面（10問・さいしょから）
        pg.click('#bSet'); pg.click('[data-m=title]'); pg.click('[data-m=yes]'); shot('13_title_again')
        pg.click('[data-h=drill]'); pg.click(f'[data-h="g:{grades[-1]}"]'); pg.click('[data-h="u:3"]'); pg.click('[data-h="a:always"]'); pg.click('[data-h="n:10"]'); shot('14_q_always', 900)
        print(tag, 'errors:', errs)
        pg.close()
    b.close()
for t in allbad: print('NG', t)
print('はみだし・かぶり:', 'なし' if not allbad else len(allbad))
