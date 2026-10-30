# cpp-display-skill

把一段代码变成能按帧播放的单页 HTML：左边源码高亮，右边数据同步变。

**简体中文** ｜ [English](#english)

> **需要 Node.js 才能满血运行。** 生成演示页本身不依赖 Node，用浏览器打开就能看；但 `scripts/` 里的自动校验、对拍和截图，要装了 Node.js 18+ 才能跑起来。

## 它解决什么

看代码想不出执行过程。这个页面里每走一步，代码停在哪一行，画面就变到那一步的样子。

静态截图只能看结果，这个能拖回去重看：播放、暂停、单步、重置、调速，还能用 `#step=12` 直接跳到某一帧。

## 环境要求

| 要做的事 | 需要什么 | 不装会怎样 |
|---|---|---|
| 生成、打开、播放演示页 | 任意现代浏览器 | —— |
| 跑校验脚本 `scripts/verify-*.js` | **Node.js 18 或更高**（LTS 版即可） | 脚本跑不起来，只能靠人眼逐帧看 |
| 自动截图 `--shot` | 本机装有 Chrome 或 Edge | 只提示「没找到 Chrome / Edge，跳过截图」，其余检查照常进行 |

脚本**零第三方依赖**，只用 Node 内置的 `fs` / `path` / `child_process`，**不需要 `npm install`**，也不需要 `package.json`。

确认 Node 是否就绪：

```bash
node -v      # 期望 v18.0.0 及以上
```

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
| `scripts/` | 校验脚本（**需要 Node.js**） |

---

## English

[简体中文](#cpp-display-skill) ｜ **English**

Turn a piece of code into a frame-by-frame playable single-page HTML: highlighted source on the left, live data on the right.

> **Node.js is required for the full experience.** Building a demo page needs no Node at all — just open it in a browser. But the automated checks, cross-validation and screenshots in `scripts/` need Node.js 18+.

### What it solves

Reading code, you often cannot picture how it actually runs. In a generated page, every step stops at a specific line, and the picture on the right changes with it.

A static screenshot only shows the final result. This one can be scrubbed back and forth: play, pause, step, reset, change speed, and jump straight to a frame with `#step=12`.

### Requirements

| Task | What you need | Without it |
|---|---|---|
| Generate, open and play a demo page | Any modern browser | — |
| Run the check scripts `scripts/verify-*.js` | **Node.js 18 or newer** (LTS is fine) | Scripts cannot run; every frame has to be inspected by eye |
| Auto screenshots `--shot` | Chrome or Edge installed locally | It prints "Chrome / Edge not found, skipping screenshots"; all other checks still run |

The scripts have **zero third-party dependencies** — only Node's built-in `fs`, `path` and `child_process`. **No `npm install`** and no `package.json` required.

Check that Node is ready:

```bash
node -v      # expect v18.0.0 or above
```

### Installation

Drop the folder into your host's skills directory:

| Host | Path |
|---|---|
| WorkBuddy | `~/.workbuddy/skills/cpp-display-skill` |
| DeepSeek Harness | `~/.dsh/skills/cpp-display-skill` |
| Codex | `~/.codex/skills/cpp-display-skill` |
| Trae CN | `~/.trae-cn/skills/cpp-display-skill` |

The folder name must match the `name:` field in `SKILL.md`, otherwise some hosts will not register it.

### Usage

Just describe what you want, for example "turn this problem into a demo page" or "walk me through how this code runs, step by step".

Pick a template by problem type, and look up drawing conventions in `references/`.

### Layout

| Path | Contents |
|---|---|
| `SKILL.md` | Main document — read this first |
| `references/` | Drawing conventions, rendering details, common pitfalls |
| `templates/` | Three runnable templates — copy, rename, use |
| `scripts/` | Check scripts (**Node.js required**) |
