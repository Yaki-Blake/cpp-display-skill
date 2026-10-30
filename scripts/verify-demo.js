#!/usr/bin/env node
/**
 * 代码逐行演示页 · 校验脚本
 *
 * 用法:
 *   node verify-demo.js <demo.html>
 *   node verify-demo.js <demo.html> --shot 0 --shot 8 --shot last
 *   node verify-demo.js <demo.html> --shot=12 --width 1500 --height 900
 *
 * 检查:
 *   1. <script> 语法
 *   2. TRACE 块能否在 node 里跑起来
 *   3. 步数是否合理
 *   4. 每步 line 是否落在 [1, CODE.length]
 *   5. 每步 note 是否为空
 *   6. 是否有完全重复的相邻步
 *   7. 有 brute() 就自动跟最后一步的 ans / result 对拍
 *   8. 可选截图
 *
 * 退出码: 0 通过 / 1 有错 / 2 用法错误
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ---------- 参数 ----------
const argv = process.argv.slice(2);
const file = argv.find(a => !a.startsWith('--'));
if (!file) {
  console.error('用法: node verify-demo.js <demo.html> [--shot 0|last|N] [--width W] [--height H]');
  process.exit(2);
}

const shots = [];
let W = 1560, H = 1000;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  let m;
  if (a === '--shot' && argv[i + 1]) shots.push(argv[i + 1]);
  else if ((m = a.match(/^--shot=(.+)$/))) shots.push(m[1]);
  else if (a === '--width' && argv[i + 1]) W = Number(argv[i + 1]);
  else if ((m = a.match(/^--width=(\d+)$/))) W = Number(m[1]);
  else if (a === '--height' && argv[i + 1]) H = Number(argv[i + 1]);
  else if ((m = a.match(/^--height=(\d+)$/))) H = Number(m[1]);
}

const abs = path.resolve(file);
if (!fs.existsSync(abs)) {
  console.error('文件不存在: ' + abs);
  process.exit(2);
}
const html = fs.readFileSync(abs, 'utf8');
const dir = path.dirname(abs);

// ---------- 计数 ----------
let fail = 0, warn = 0;
const ok = m => console.log('  \x1b[32m✓\x1b[0m ' + m);
const bad = m => { console.log('  \x1b[31m✗\x1b[0m ' + m); fail++; };
const nte = m => { console.log('  \x1b[33m!\x1b[0m ' + m); warn++; };

console.log('\n\x1b[1m校验 ' + path.basename(abs) + '\x1b[0m\n');

// ---------- 1. 脚本语法 ----------
let steps = null, mod = null;
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
if (scripts.length === 0) {
  bad('页面里没有 <script>');
} else {
  let synOk = true;
  scripts.forEach((src, i) => {
    try { new Function(src); }
    catch (e) { bad(`第 ${i + 1} 段脚本语法错误: ${e.message}`); synOk = false; }
  });
  if (synOk) ok(`脚本语法通过（${scripts.length} 段）`);
}

// ---------- 2. TRACE 块 ----------
const bI = html.indexOf('/* ==TRACE-BEGIN== */');
const eI = html.indexOf('/* ==TRACE-END== */');
if (bI < 0 || eI < 0 || eI <= bI) {
  bad('找不到 TRACE 标记 —— 模板里的 /* ==TRACE-BEGIN== */ 与 /* ==TRACE-END== */ 必须保留');
} else {
  const block = html.slice(bI, eI);
  if (/\bdocument\b|\bwindow\.|querySelector|getElementById/.test(block)) {
    bad('TRACE 块里出现了 DOM 操作 —— 它必须能在 node 里独立运行');
  }
  try {
    mod = new Function(block + `
      return { INPUT, CODE, run,
               brute: typeof brute === 'function' ? brute : null };
    `)();
    ok('TRACE 块可在 node 中独立运行');
  } catch (e) {
    bad('TRACE 块执行失败: ' + e.message);
  }

  if (mod) {
    if (!Array.isArray(mod.CODE) || mod.CODE.length === 0) bad('CODE 不是非空数组（记得 .split("\\n")）');
    else ok(`CODE 共 ${mod.CODE.length} 行`);

    if (mod.INPUT === undefined) bad('TRACE 块里没有 INPUT');

    try {
      steps = [...mod.run(mod.INPUT)];
      ok(`生成 ${steps.length} 步`);
    } catch (e) {
      bad('run() 执行出错: ' + e.message);
    }
  }
}

// ---------- 3~6. 快照检查 ----------
if (steps && steps.length) {
  const maxLine = mod.CODE ? mod.CODE.length : Infinity;

  if (steps.length > 400) nte(`步数 ${steps.length} 偏多，考虑合并预处理阶段或缩小输入`);
  if (steps.length < 5) nte(`只有 ${steps.length} 步，演示可能过于粗略`);

  const oob = [];
  steps.forEach((s, i) => {
    if (!Number.isInteger(s.line) || s.line < 1 || s.line > maxLine) oob.push(i + 1);
  });
  if (oob.length) bad(`行号越界 ${oob.length} 处（第 ${oob.slice(0, 8).join(',')}${oob.length > 8 ? '…' : ''} 步），合法范围 1~${maxLine}`);
  else ok(`所有行号都在 1~${maxLine} 之间`);

  const noNote = steps.map((s, i) => (!s.note || !String(s.note).trim()) ? i + 1 : 0).filter(Boolean);
  if (noNote.length) bad(`${noNote.length} 步的 note 为空（第 ${noNote.slice(0, 8).join(',')} 步）`);
  else ok('每步都有 note');

  let dup = 0;
  for (let i = 1; i < steps.length; i++) {
    if (steps[i].line === steps[i - 1].line && steps[i].note === steps[i - 1].note) dup++;
  }
  if (dup) nte(`${dup} 步与前一步完全相同（line + note 都一样），可能多写了 yield`);
  else ok('没有完全重复的相邻步');

  const hitLines = [...new Set(steps.map(s => s.line))].sort((a, b) => a - b);
  ok(`命中行号: ${hitLines.join(',')}`);

  // ---------- 7. 对拍 ----------
  const last = steps[steps.length - 1];
  const got = last.ans !== undefined ? last.ans : last.result;

  if (mod.brute) {
    let want;
    try {
      want = mod.brute(mod.INPUT);
    } catch (e) {
      bad('brute() 执行出错: ' + e.message);
    }
    if (want !== undefined) {
      if (got === undefined) {
        bad('最后一步快照里没有 ans 或 result，没法跟 brute() 比对');
      } else if (JSON.stringify(got) === JSON.stringify(want)) {
        ok(`对拍通过  got = ${JSON.stringify(got)}`);
      } else {
        bad(`对拍失败\n      演示 = ${JSON.stringify(got)}\n      暴力 = ${JSON.stringify(want)}`);
      }
    }
  } else if (got !== undefined) {
    nte('TRACE 块里没有 brute()，这次没做对拍 —— 强烈建议补一个暴力解法');
  }
}

// ---------- 8. 截图 ----------
function findChrome() {
  const cands = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ];
  for (const c of cands) if (fs.existsSync(c)) return c;
  return null;
}

if (shots.length) {
  const chrome = findChrome();
  if (!chrome) {
    nte('没找到 Chrome / Edge，跳过截图');
  } else if (!steps) {
    nte('steps 没生成，跳过截图');
  } else {
    const urlBase = 'file:///' + abs.replace(/\\/g, '/');
    shots.forEach(sp => {
      const n = sp === 'last' ? steps.length - 1 : Number(sp);
      if (!Number.isInteger(n) || n < 0 || n >= steps.length) {
        nte(`--shot ${sp} 超出范围 0~${steps.length - 1}，跳过`);
        return;
      }
      const out = path.join(dir, `_shot_${n}.png`);
      const url = `${urlBase}#step=${n}`;
      try {
        execFileSync(chrome, [
          '--headless=new', '--disable-gpu', '--hide-scrollbars',
          `--screenshot=${out}`,
          `--window-size=${W},${H}`,
          '--virtual-time-budget=4000',
          url
        ], { stdio: 'ignore', timeout: 45000 });
        if (fs.existsSync(out)) {
          const kb = (fs.statSync(out).size / 1024).toFixed(0);
          ok(`第 ${n} 步截图 → ${path.basename(out)} (${kb} KB)`);
        } else {
          bad(`第 ${n} 步截图没生成`);
        }
      } catch (e) {
        bad(`第 ${n} 步截图失败: ${e.message.split('\n')[0]}`);
      }
    });
    console.log('  \x1b[2m看截图重点：连线有没有被格子盖住、标签有没有叠在一起、有没有裁切\x1b[0m');
  }
} else if (steps) {
  console.log('  \x1b[2m提示：加 --shot 0 --shot last 可以截图检查布局\x1b[0m');
}

// ---------- 汇总 ----------
console.log('');
if (fail) {
  console.log(`\x1b[31m\x1b[1m失败 ${fail} 项\x1b[0m` + (warn ? `，${warn} 条提醒` : ''));
  console.log('\x1b[2m数字不对的演示页比没有更害人，别交付。\x1b[0m\n');
  process.exit(1);
}
console.log('\x1b[32m\x1b[1m全部通过\x1b[0m' + (warn ? `（${warn} 条提醒）` : '') + '\n');
process.exit(0);
