# cpp-display-skill

把一段代码变成能按帧播放的单页 HTML：左边源码高亮，右边数据同步变。

## 它解决什么

看代码想不出执行过程。这个页面里每走一步，代码停在哪一行，画面就变到那一步的样子。

静态截图只能看结果，这个能拖回去重看：播放、暂停、单步、重置、调速，还能用 `#step=12` 直接跳到某一帧。

## 安装

放进宿主的 skills 目录：

| 宿主 | 路径 |
|---|---|
| WorkBuddy | `~/.workbuddy/skills/cpp-display-skill` |
| DeepSeek Harness | `~/.dsh/skills/cpp-display-skill` |
| Codex | `~/.codex/skills/cpp-display-skill` |
| Trae CN | `~/.trae-cn/skills/cpp-display-skill` |

目录名必须与 `SKILL.md` 里的 `name:` 一致，否则部分宿主注册不上。

## 怎么用

说一句要什么就行，比如「把这题做成演示页」「一步步看这段代码怎么跑」。

模板按题型挑，画法查 `references/`。

## 目录

| 位置 | 内容 |
|---|---|
| `SKILL.md` | 主文档，先读这个 |
| `references/` | 画法、渲染细节、常见坑 |
| `templates/` | 三个可运行模板，复制改名就能用 |
| `scripts/` | 校验脚本 |
