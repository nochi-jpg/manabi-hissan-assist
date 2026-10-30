# python3 tools/build.py  → 整数版・小数点あり版の GitHub版（index.html / shousu.html）と Canva版（dist/）
import base64, os, re
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
src = lambda p: open(os.path.join(R, 'src', p), encoding='utf-8').read()
def data(p):
    ext = p.rsplit('.', 1)[1]
    mime = {'png': 'image/png', 'mp3': 'audio/mpeg'}[ext]
    return f'data:{mime};base64,' + base64.b64encode(open(os.path.join(R, 'src', p), 'rb').read()).decode()
def build(page, outs):
    html = src(page)
    html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + src('style.css') + '</style>')
    for js in ['logic.js', 'logic-dec.js', 'app.js']:
        html = html.replace(f'<script src="{js}"></script>', '<script>\n' + src(js) + '</script>')
    html = re.sub(r"assets/[\w/]+\.(?:png|mp3)", lambda m: data(m.group(0)), html)
    for out in outs:
        out = os.path.join(R, out)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        h = html
        # Canva版は 作者名を K.nom に（GitHub版は そのまま）
        if out.endswith('-canva.html'): h = h.replace('K.nom', 'K.nom')
        open(out, 'w', encoding='utf-8').write(h)
        print(os.path.relpath(out, R), f'{os.path.getsize(out)/1024:.0f}KB')

# GitHub Pages 版（リポジトリの いちばん上）と Canva 版（dist/）。中身は 同じ 1ファイル
build('index.html', ['index.html', 'dist/hissan-otasuke-canva.html'])
build('shousu.html', ['shousu.html', 'dist/hissan-otasuke-shousu-canva.html'])
