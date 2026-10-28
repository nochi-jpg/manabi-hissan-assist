# python3 tools/shots_dec.py OUTDIR [html] … 小数点あり版の スクリーンショット
import sys, os
from playwright.sync_api import sync_playwright
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
src = 'file://' + os.path.abspath(os.path.join(os.path.dirname(__file__), '..', sys.argv[2] if len(sys.argv) > 2 else 'src/shousu.html'))
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1366, 'height': 650})
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto(src); pg.wait_for_timeout(400)
    J = pg.evaluate
    def shot(n, w=400): pg.wait_for_timeout(w); pg.screenshot(path=f'{out}/{n}.png')
    def typ(s):
        for ch in s: J(f"__hissan.key('{ch}')")
    def new(f):
        if pg.is_visible('#bStay'): pg.click('#bStay')
        if pg.is_enabled('#bReset'): pg.click('#bReset'); pg.click('[data-m=yes]')
        typ(f); J("__hissan.key('OK')"); pg.wait_for_timeout(200)
    def until(t):
        for i in range(120):
            s = J("(()=>{const c=__hissan.cur();return __hissan.st.post?'post':(c?c.type:__hissan.st.phase)})()")
            if s == t: return True
            if s == 'done': return False
            J("__hissan.fwd()"); pg.wait_for_timeout(15)
        return False
    def tapwrong(): pg.click('.cand >> nth=0')
    shot('d01_start')
    typ('12.5+3.7'); shot('d02_typed', 100); typ('5'); J("__hissan.key('OK')")
    until('tap'); shot('d03_add_tap', 600)
    tapwrong(); shot('d04_add_tap_wrong', 3500)
    until('done'); shot('d05_add_done', 2800)
    new('2.5+1.5'); until('zero'); shot('d06_zero', 600)
    pg.click('.zc >> nth=0'); shot('d07_zero_wrong', 2500); pg.click('#aClose')
    until('done'); shot('d08_zero_done', 2800)
    new('5-2.36'); shot('d09_sub_aux', 700); until('done'); shot('d10_sub_done', 2800)
    new('0.3*0.2'); until('in'); J("__hissan.fwd()"); pg.wait_for_timeout(1600); shot('d11_mul_pad', 400)
    until('tap'); tapwrong(); shot('d12_mul_assist', 4800); until('done'); shot('d13_mul_done', 2800)
    new('12.34*5.6'); until('done'); shot('d14_mul2_done', 2800)
    new('7.5/2.5'); shot('d15_divmenu', 500); pg.click('[data-d=round]'); shot('d16_divmenu2', 400); pg.click('[data-d=menu]'); pg.click('[data-d=end]')
    until('tap'); shot('d17_shift1', 600); tapwrong(); shot('d18_shift_assist', 3500); until('done'); shot('d19_div_shift_done', 2800)
    new('0.24/6'); pg.click('[data-d=end]'); until('tap'); shot('d20_qpt', 600); until('done'); shot('d21_div024', 2800)
    new('12.5/3'); pg.click('[data-d=round]'); pg.click('[data-d="round:1"]'); until('choice'); shot('d22_round_choice', 600)
    J("document.querySelector('[data-act=ch][data-v=\"0\"]').click()"); shot('d23_round_wrong', 2000); pg.click('#aClose')
    until('in'); pg.wait_for_timeout(1700); until('in'); typ('4.2'); shot('d24_round_typed', 300); J("__hissan.key('OK')"); shot('d25_round_done', 3200)
    new('7.25/3'); pg.click('[data-d=rem]'); pg.click('[data-d="rem:1"]'); until('done'); shot('d26_rem', 2800)
    new('7/0.3'); pg.click('[data-d=rem]'); pg.click('[data-d="rem:0"]'); until('done'); shot('d27_rem2', 2800)
    new('1/8'); pg.click('[data-d=end]'); until('done'); shot('d28_1div8', 2800)
    b.close()
print('errors:', errs)
