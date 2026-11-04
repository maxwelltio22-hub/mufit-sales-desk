"""Bangun site/index.html dari src/app.html + penghubung Supabase. Jalankan: python3 build.py"""
import pathlib,re
R=pathlib.Path(__file__).parent
app=(R/'src/app.html').read_text()
css=(R/'src/shim.css').read_text()
shim=(R/'src/shim.js').read_text()
head='''<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<script>document.documentElement.classList.add('locked')</script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>
<script src="config.js"></script>
</head><body>
'''
i=app.index('<script>\n')
out=head+app[:i]+'<style>'+css+'</style>\n<div id="loginGate"></div>\n<script>'+shim+'</script>\n'+app[i:]+'\n</body></html>\n'
(R/'site').mkdir(exist_ok=True)
(R/'site/index.html').write_text(out)
print('site/index.html',len(out))
