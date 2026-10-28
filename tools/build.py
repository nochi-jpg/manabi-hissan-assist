# python3 tools/build.py  → dist/hissan-otasuke.html（画像・音を 中に入れた 1ファイル版。Canva にも そのまま のせられる）
import base64, os, re
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
src = lambda p: open(os.path.join(R, 'src', p), encoding='utf-8').read()
def data(p):
    ext = p.rsplit('.', 1)[1]
    mime = {'png': 'image/png', 'mp3': 'audio/mpeg'}[ext]
    return f'data:{mime};base64,' + base64.b64encode(open(os.path.join(R, 'src', p), 'rb').read()).decode()
html = src('index.html')
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + src('style.css') + '</style>')
for js in ['logic.js', 'app.js']:
    html = html.replace(f'<script src="{js}"></script>', '<script>\n' + src(js) + '</script>')
html = re.sub(r"assets/[\w/]+\.(?:png|mp3)", lambda m: data(m.group(0)), html)
# GitHub Pages 版（リポジトリの いちばん上の index.html）と Canva 版（dist/）。中身は 同じ 1ファイル
os.makedirs(os.path.join(R, 'dist'), exist_ok=True)
for out in [os.path.join(R, 'index.html'), os.path.join(R, 'dist', 'hissan-otasuke-canva.html')]:
    open(out, 'w', encoding='utf-8').write(html)
    print(os.path.relpath(out, R), f'{os.path.getsize(out)/1024:.0f}KB')
