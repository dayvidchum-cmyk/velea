#!/usr/bin/env python3
"""Build the velealor.com review deck from the real marketing pages.

Fidelity rules:
  - the pages are used verbatim; nothing is redrawn
  - shared assets (fonts, art) are inlined ONCE and shared by every page
  - only two deliberate changes: scripts stripped (a static deck runs no forms),
    and scroll-reveal frozen to its finished state
"""
import re, json, base64, pathlib

ROOT = pathlib.Path('/Users/davidchum/projects/Velea/client/public')
OUT = pathlib.Path('/private/tmp/claude-501/-Users-davidchum/1a8dff93-c737-4739-9180-b4f063249d9f/scratchpad')

PAGES = [
    ('/',          'landing.html',            'Home'),
    ('/velea',     'marketing/velea.html',    'About'),
    ('/why',       'marketing/why.html',      'Why This Exists'),
    ('/system',    'marketing/system.html',   'The System'),
    ('/gate',      'marketing/gate.html',     'The Time Gate'),
    ('/access',    'marketing/access.html',   'Request Access'),
    ('/confirmed', 'marketing/confirmed.html','Confirmed'),
]

FREEZE = """
<style id="deck-freeze">
  *, *::before, *::after { animation-play-state: paused !important; transition: none !important; }
  .reveal, .reveal * { opacity: 1 !important; transform: none !important; visibility: visible !important; }
  html { scroll-behavior: auto !important; }
  ::-webkit-scrollbar { width: 0; height: 0; }
  html { scrollbar-width: none; }
</style>
</head>"""

MIME = {'.woff2':'font/woff2', '.ttf':'font/ttf', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
        '.png':'image/png', '.mp4':'video/mp4', '.webp':'image/webp'}

def prep(src, is_landing):
    src, _ = re.subn(r'<script\b[^>]*>.*?</script>', '', src, flags=re.S|re.I)
    if is_landing:
        # Mobile art variants are referenced ONLY inside @media (max-width:700px);
        # the deck always renders at 1440, so they can never apply. Verified before cutting.
        before = len(src)
        src = re.sub(r'\s*--hero-home-m:\s*url\("data:[^"]*"\);', '\n    --hero-home-m: none;', src)
        src = re.sub(r'\s*--sky-night-m:\s*url\("data:[^"]*"\);', '\n    --sky-night-m: none;', src)
        assert len(src) < before, 'mobile variants not found'
    assert '</head>' in src, 'no head'
    src = src.replace('</head>', FREEZE, 1)
    assert '</script>' not in src.lower()
    return src

# ── collect pages + the assets they reference ──
raw_pages, refs = [], set()
for route, rel, title in PAGES:
    s = (ROOT/rel).read_text(encoding='utf-8')
    s = prep(s, rel == 'landing.html')
    refs |= set(re.findall(r'["\(](/marketing/[^"\')]+)["\)]', s))
    raw_pages.append({'route': route, 'title': title, 'src': s})

assets = {}
for r in sorted(refs):
    f = ROOT / r.lstrip('/')
    assert f.exists(), f'missing asset {r}'
    assets[r] = {'m': MIME[f.suffix.lower()], 'b': base64.b64encode(f.read_bytes()).decode()}

# ── ASCII-proofing: the sources are read back as text, so they must survive any charset.
# Numeric entities are charset-proof in markup; CSS does not decode entities, but every
# non-ASCII char inside <style> here is in a comment, so those get ASCII equivalents. ──
CSSMAP = {'·': '.', '—': '--', '→': '->', '–': '-',
          '‘': "'", '’': "'", '“': '"', '”': '"', '…': '...'}

def ascii_source(t):
    out, last = [], 0
    for m in re.finditer(r'<style\b[^>]*>.*?</style>', t, re.S|re.I):
        out.append(''.join(c if ord(c) < 128 else '&#%d;' % ord(c) for c in t[last:m.start()]))
        block = m.group(0)
        for k, v in CSSMAP.items():
            block = block.replace(k, v)
        block = ''.join(c if ord(c) < 128 else '?' for c in block)
        out.append(block)
        last = m.end()
    out.append(''.join(c if ord(c) < 128 else '&#%d;' % ord(c) for c in t[last:]))
    return ''.join(out)

for p in raw_pages:
    p['src'] = ascii_source(p['src'])
    assert all(ord(c) < 128 for c in p['src']), p['route']

shell = (OUT/'_deck-shell.html').read_text(encoding='utf-8')
logic = (OUT/'_deck-logic.js').read_text(encoding='utf-8')
ascii_html = lambda t: ''.join(c if ord(c) < 128 else '&#%d;' % ord(c) for c in t)
ascii_js   = lambda t: ''.join(c if ord(c) < 128 else '\\u%04x' % ord(c) for c in t)

blocks = [ascii_html(shell)]
blocks.append('\n<script type="application/json" id="deck-index">' +
              json.dumps([{'route': p['route'], 'title': p['title']} for p in raw_pages]) + '</script>')
blocks.append('\n<script type="application/json" id="deck-assets">' + json.dumps(assets) + '</script>')
for i, p in enumerate(raw_pages):
    blocks.append(f'\n<script type="text/plain" id="src-{i}">' + p['src'] + '</script>')
blocks.append('\n<script>\n' + ascii_js(logic) + '\n</script>\n')

out = ''.join(blocks)
assert all(ord(c) < 128 for c in out)
(OUT/'velealor-deck.html').write_text(out, encoding='ascii')

print(f"pages: {len(raw_pages)}  assets: {len(assets)}")
for p in raw_pages:
    print(f"   {p['route']:12} {p['title']:18} {len(p['src']):>10,} chars")
print(f"deck: {len(out.encode()):,} bytes")
