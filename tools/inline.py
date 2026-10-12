#!/usr/bin/env python3
"""把 assets/ink.css 和 assets/spectrum.js 内嵌进每个页面，使单个 HTML 可独立打开。

改了 assets/ 里的文件后运行：python3 tools/inline.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSS = (ROOT / "assets/ink.css").read_text(encoding="utf-8").strip()
JS = (ROOT / "assets/spectrum.js").read_text(encoding="utf-8").strip()

LINK = re.compile(r'<link rel="stylesheet" href="[./]*assets/ink\.css">|<style data-inline="ink\.css">.*?</style>', re.S)
SCRIPT = re.compile(r'<script src="[./]*assets/spectrum\.js"></script>|<script data-inline="spectrum\.js">.*?</script>', re.S)

for page in [ROOT / "index.html", *sorted(ROOT.glob("topics/*/index.html"))]:
    html = page.read_text(encoding="utf-8")
    html, a = LINK.subn(lambda _: f'<style data-inline="ink.css">\n{CSS}\n</style>', html)
    html, b = SCRIPT.subn(lambda _: f'<script data-inline="spectrum.js">\n{JS}\n</script>', html)
    assert a == 1 and b == 1, f"{page}: 找不到内嵌位置 (css={a}, js={b})"
    page.write_text(html, encoding="utf-8")
    print("inlined", page.relative_to(ROOT))

import merge  # noqa: E402  合订本跟着一起更新

merge.build()
