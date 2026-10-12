# Mass Spectrometry

质谱可视化专题库。每个专题讲一张谱：一幅可以点的水墨风格棒图，旁边是选中峰的离子归属和来历，下面是推断步骤。页面按电脑宽屏排版（最宽 1480px，窄屏自动退成单栏）。

结构与 [statistical-mechanics](https://github.com/Uugyfgyb/statistical-mechanics)、[pde-visualization](https://github.com/Uugyfgyb/pde-visualization) 相同：根目录的 [专题目录](index.html) 负责分类和导航，每个专题放在 `topics/<slug>/` 下。

## 专题

| 分类 | 专题 | 内容 | 入口 |
| --- | --- | --- | --- |
| 碎裂 | 丙苯是怎么碎的 | 苄基断裂与 m/z 91 基峰、92 的两个来源、芳香烃指纹系列 | [打开](topics/propylbenzene-fragmentation/index.html) · [说明](topics/propylbenzene-fragmentation/README.md) |
| 同位素峰 | 反过来：从谱到分子式 | M+1 估碳数，氟甲烷与甲醛，自化学电离 | [打开](topics/formula-from-spectrum/index.html) · [说明](topics/formula-from-spectrum/README.md) |
| 同位素峰 | 未知物九：氯留下的记号 | 氯的 3 : 1 峰对、全卤代的质量间距、缺席的分子离子 | [打开](topics/chlorine-isotope-unknown/index.html) · [说明](topics/chlorine-isotope-unknown/README.md) |
| 碎裂 | 二苯甲酮：四根峰，一条链 | α-断裂链、碎片碳数核对、双电荷离子 | [打开](topics/benzophenone/index.html) · [说明](topics/benzophenone/README.md) |

目前收录 4 个专题。

**只想要一个文件**：下载 [all-in-one.html](all-in-one.html)。四个专题合在一起，顶部标签切换，双击即可打开。

## 仓库结构

```text
mass-spectrometry/
├── index.html            # 全部专题的分类入口
├── all-in-one.html       # 合订本：四个专题合成的单文件（由 tools/merge.py 生成）
├── assets/
│   ├── ink.css           # 水墨样式源文件（纸色、朱印、宽屏栅格，跟随系统深浅色）
│   └── spectrum.js       # 棒图、选峰题跋、丢失弧线、弱峰放大、碳数小算盘；无依赖
├── tools/
│   ├── inline.py         # 把 assets/ 内嵌进各页，并重建合订本
│   └── merge.py          # 由四个专题页生成 all-in-one.html
└── topics/
    └── <slug>/
        ├── index.html    # 专题页：单文件，样式和脚本已内嵌
        └── README.md     # 数据来源、哪些是推断
```

每个专题页都是可以独立打开的单文件网页：`assets/` 里的样式和脚本已经内嵌进各页，单独下载一个 `index.html` 双击即可，不需要服务器。字体从 Google Fonts 加载，断网时退回系统字体。

`assets/` 是样式和脚本的源文件。改动之后运行 `python3 tools/inline.py`，把新内容重新嵌进所有页面，并重建合订本。专题页是内容的源头，`all-in-one.html` 是生成物，不要直接改它。

## 新增专题

1. 在 `topics/` 下建一个全小写的目录，复制任一专题的 `index.html` 作模板（内嵌的样式和脚本不用动）。
2. 把峰表写进 `InkSpectrum.mount({ peaks, links })`：`peaks` 里每项是 `{ mz, I, ion, name, note, lab }`，`links` 里每项是 `{ from, to, loss, note }`。化学式写成 `'[C7H7]^+'`，脚本会排上下标。
3. 在专题 `README.md` 写明数据来源，分清哪些是原始数据、哪些是推断。
4. 在根目录 `index.html` 和上面的表里加上入口，更新数量。
