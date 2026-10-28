# python3 tools/shots.py OUTDIR [html]  … 画面の スクリーンショット（Edge 11.6型 くらいの 大きさ）
import sys, os
from playwright.sync_api import sync_playwright
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
src = 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', sys.argv[2] if len(sys.argv) > 2 else 'src/index.html'))
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1366, 'height': 650})
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto(src); pg.wait_for_timeout(400)
    def shot(n, w=300): pg.wait_for_timeout(w); pg.screenshot(path=f'{out}/{n}.png')
    def typ(s):
        for ch in s: pg.evaluate(f"__hissan.key('{ch}')")
    def reset():
        if pg.is_enabled('#bReset'):
            pg.click('#bReset'); pg.click('[data-m=yes]')
    def run_to(stop):  # stop: 関数で とめる
        for i in range(80):
            if stop(): return
            pg.evaluate("__hissan.fwd()"); pg.wait_for_timeout(20); pg.evaluate("__hissan.fwd()")
    phase = lambda: pg.evaluate("__hissan.st.phase")
    shot('01_start')
    typ('52+89'); pg.evaluate("__hissan.key('OK')"); shot('02_add', 700)
    typ('1'); pg.evaluate("__hissan.key('OK')"); shot('03_wrong_assist', 4500)
    pg.click('#aClose'); typ('11'); pg.evaluate("__hissan.key('OK')"); shot('04_fly', 350); pg.wait_for_timeout(1800)
    typ('14'); pg.evaluate("__hissan.key('OK')"); shot('05_done', 3000)
    pg.click('#bNew')
    typ('1000-1'); pg.evaluate("__hissan.key('OK')"); shot('06_sub', 800)
    reset(); typ('512-389'); pg.evaluate("__hissan.key('OK')"); run_to(lambda: pg.evaluate("__hissan.st.idx")>=1 and not pg.evaluate("__hissan.st.post")); shot('07_sub2', 900)
    run_to(lambda: phase()=='done'); shot('08_sub_done', 2800)
    pg.click('#bStay'); pg.click('#bReset'); shot('09_reset_modal'); pg.click('[data-m=yes]')
    typ('9999*999'); pg.evaluate("__hissan.key('OK')")
    run_to(lambda: pg.evaluate("__hissan.st.idx")>=9 and not pg.evaluate("__hissan.st.post")); shot('10_mul_row3', 700)
    pg.evaluate("__hissan.key('1')"); pg.evaluate("__hissan.key('OK')"); shot('11_mul_kuku', 900)
    run_to(lambda: phase()=='done'); shot('12_mul_done', 2800)
    pg.click('#bNew'); typ('9999/7'); pg.evaluate("__hissan.key('OK')")
    run_to(lambda: pg.evaluate("__hissan.st.idx")>=6 and not pg.evaluate("__hissan.st.post")); shot('13_div_mid', 700)
    run_to(lambda: phase()=='done'); shot('14_div_done', 2800)
    pg.click('#bStay'); reset(); typ('6012/3'); pg.evaluate("__hissan.key('OK')"); run_to(lambda: phase()=='done'); shot('15_div0', 2800)
    pg.click('#bStay'); reset(); typ('9876/54'); pg.evaluate("__hissan.key('OK')"); run_to(lambda: phase()=='done'); shot('16_div2', 2800)
    pg.click('#bStay'); pg.click('#bSet'); pg.click('[data-o="carry:down"]'); pg.click('[data-o="borrow:side"]'); shot('17_settings')
    pg.click('[data-m=close]'); reset(); typ('4302-1785'); pg.evaluate("__hissan.key('OK')"); run_to(lambda: phase()=='done'); shot('18_sub_side', 2800)
    pg.click('#bStay'); reset(); typ('768*49'); pg.evaluate("__hissan.key('OK')"); run_to(lambda: phase()=='done'); shot('19_mul_down', 2800)
    pg.click('#bStay'); reset(); typ('57'); typ('-'); typ('68'); pg.evaluate("__hissan.key('OK')"); shot('20_err', 500)
    b.close()
print('errors:', errs)
