#!/usr/bin/env python3
"""把四个专题合成一个带标签的单文件网页 all-in-one.html。

各专题页是内容的源头；改了专题页或 assets/ 后运行 python3 tools/inline.py（它会顺带调用本脚本）。
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOPICS = [
    ("propylbenzene-fragmentation", "其一", "丙苯的碎裂"),
    ("formula-from-spectrum", "其二", "从谱到分子式"),
    ("chlorine-isotope-unknown", "其三", "氯留下的记号"),
    ("benzophenone", "其四", "二苯甲酮"),
]


def build():
    css = (ROOT / "assets/ink.css").read_text(encoding="utf-8").strip()
    js = (ROOT / "assets/spectrum.js").read_text(encoding="utf-8").strip()
    tabs, panels, scripts = [], [], []
    for n, (slug, no, short) in enumerate(TOPICS, 1):
        html = (ROOT / "topics" / slug / "index.html").read_text(encoding="utf-8")
        body = re.search(r'<div class="scroll">(.*?)</div>\s*<script', html, re.S).group(1)
        script = re.findall(r"<script>(.*?)</script>", html, re.S)[-1]
        pre = f"t{n}-"
        # 四页的 id 互相重名，逐页加前缀
        body = re.sub(r'\bid="([^"]+)"', rf'id="{pre}\1"', body)
        body = re.sub(r'aria-labelledby="([^"]+)"', rf'aria-labelledby="{pre}\1"', body)
        body = re.sub(r'data-spec="#([^"]+)"', rf'data-spec="#{pre}\1"', body)
        body = re.sub(r'(<button class="node" )(data-sel=)', rf'\1data-spec="#{pre}spec" \2', body)
        body = re.sub(r'<a href="\.\./\.\./index\.html">([^<]*)</a>', r"<span>\1</span>", body)
        script = re.sub(r"'#(\w+)'", rf"'#{pre}\1'", script).replace("InkSpectrum.decorate();", "")
        tabs.append(f'<button type="button" role="tab" id="tab{n}" aria-controls="t{n}" aria-selected="false" data-tab="{n}"><i>{no}</i>{short}</button>')
        panels.append(f'<div class="scroll" id="t{n}" role="tabpanel" aria-labelledby="tab{n}" hidden>{body}</div>')
        scripts.append(script.strip())
    out = f"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="质谱四讲合订本：丙苯的碎裂、从谱到分子式、氯的同位素峰、二苯甲酮。水墨风格，单文件。">
<title>质谱四讲 · 合订本</title>
<style data-inline="ink.css">
{css}
</style>
</head>
<body>
<nav class="tabs" role="tablist" aria-label="专题">
  <span class="brand">质谱四讲</span>
  {chr(10).join('  ' + t for t in tabs).strip()}
</nav>
{chr(10).join(panels)}
<script data-inline="spectrum.js">
{js}
</script>
<script>
{chr(10).join(scripts)}
InkSpectrum.decorate();
(function () {{
  const tabs = [...document.querySelectorAll('.tabs [data-tab]')];
  function show(n, jump) {{
    if (!document.getElementById('t' + n)) n = '1';
    tabs.forEach((b) => {{
      const on = b.dataset.tab === String(n);
      b.setAttribute('aria-selected', String(on));
      document.getElementById('t' + b.dataset.tab).hidden = !on;
    }});
    if (jump) window.scrollTo(0, 0);
  }}
  tabs.forEach((b) => b.addEventListener('click', () => {{
    show(b.dataset.tab, true);
    try {{ history.replaceState(null, '', '#' + b.dataset.tab); }} catch (e) {{}}
  }}));
  show((location.hash || '#1').slice(1), false);
}})();
</script>
</body>
</html>
"""
    (ROOT / "all-in-one.html").write_text(out, encoding="utf-8")
    print("merged all-in-one.html")


if __name__ == "__main__":
    build()
