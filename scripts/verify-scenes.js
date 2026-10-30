#!/usr/bin/env node
/**
 * 多场景演示页校验器
 *
 * 用于「一个播放器 + 多个题型 tab」的模板（如 templates/recursion.html）。
 * 比 verify-demo.js 多做了三件事：
 *   1. 逐个场景跑 run()，而不是只跑默认那个
 *   2. 检查快照是否真的深拷贝（"所有历史步都显示最终状态"是这类页面最阴的 bug）
 *   3. 真的调一次 render()，确认渲染函数不抛异常、产出了 <svg>
 *
 * 约定（TRACE 块必须导出）：
 *   allRuns   { [sceneKey]: input => Iterator<Step> }
 *   allCodes  { [sceneKey]: string[] }          // CODE.split('\n')
 *   allScenes { [sceneKey]: { render(s) => string, vars(s) => [[k,v,hi],...] } }
 *   expect    { [sceneKey]: 期望的最终值 }       // 可选，用于断言
 *
 * 用法：
 *   node scripts/verify-scenes.js templates/recursion.html
 *   node scripts/verify-scenes.js templates/recursion.html --shot 0 --shot last
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const file = args.find(a => !a.startsWith('--'));
if (!file) {
  console.error('用法: node scripts/verify-scenes.js <html> [--shot N] [--width W] [--height H]');
  process.exit(2);
}

const html = fs.readFileSync(file, 'utf8');
let fails = 0, warns = 0;
const ok = m => console.log('  \x1b[32m✓\x1b[0m ' + m);
const bad = m => { fails++; console.log('  \x1b[31m✗\x1b[0m ' + m); };
const nte = m => { warns++; console.log('  \x1b[33m!\x1b[0m ' + m); };

console.log(`\n多场景校验 ${path.basename(file)}\n`);

// ---------- 1. 语法 ----------
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
try {
  scripts.forEach(s => new Function(s));
  ok(`脚本语法通过（${scripts.length} 段）`);
} catch (e) {
  bad('脚本语法错误: ' + e.message);
  process.exit(1);
}

// ---------- 2. TRACE 块 ----------
const bI = html.indexOf('/* ==TRACE-BEGIN== */');
const eI = html.indexOf('/* ==TRACE-END== */');
if (bI < 0 || eI < 0 || eI <= bI) {
  bad('找不到 TRACE 标记');
  process.exit(1);
}
const block = html.slice(bI, eI);
if (/\bdocument\b|\bwindow\.|querySelector|getElementById/.test(block)) {
  bad('TRACE 块里出现 DOM 操作 —— 它必须在 node 里独立运行（把 $ 之类的快捷函数挪到块外）');
} else {
  ok('TRACE 块不含 DOM 操作');
}

let mod;
try {
  mod = new Function(block + `
    return { allRuns: typeof allRuns !== 'undefined' ? allRuns : null,
             allCodes: typeof allCodes !== 'undefined' ? allCodes : null,
             allScenes: typeof allScenes !== 'undefined' ? allScenes : null,
             expect: typeof expect !== 'undefined' ? expect : null };
  `)();
  ok('TRACE 块可在 node 中独立运行');
} catch (e) {
  bad('TRACE 块执行失败: ' + e.message);
  process.exit(1);
}

if (!mod.allRuns || !mod.allScenes) {
  bad('没有导出 allRuns / allScenes —— 多场景模板必须导出，见脚本头部约定');
  process.exit(1);
}

const keys = Object.keys(mod.allRuns);
ok(`发现 ${keys.length} 个场景: ${keys.join(', ')}`);

// ---------- 3. 逐场景 ----------
const summary = [];

for (const k of keys) {
  console.log(`\n  ── ${k} ──`);
  const code = mod.allCodes && mod.allCodes[k];
  const scene = mod.allScenes[k];

  if (!Array.isArray(code) || !code.length) { bad(`${k}: 缺少 allCodes[${k}]`); continue; }
  if (!scene || typeof scene.render !== 'function') { bad(`${k}: allScenes[${k}].render 不是函数`); continue; }

  let steps;
  try {
    steps = [...mod.allRuns[k]()];
  } catch (e) {
    bad(`${k}: run() 抛异常 —— ${e.message}`);
    continue;
  }
  if (steps.length < 5) bad(`${k}: 只有 ${steps.length} 步，太粗`);
  else if (steps.length > 400) nte(`${k}: ${steps.length} 步偏多`);
  else ok(`${steps.length} 步`);

  // 行号
  const oob = steps.map((s, i) => (Number.isInteger(s.line) && s.line >= 1 && s.line <= code.length) ? 0 : i + 1).filter(Boolean);
  if (oob.length) bad(`${k}: 行号越界 ${oob.length} 处（合法 1~${code.length}）第 ${oob.slice(0, 6)} 步`);
  else ok(`行号都在 1~${code.length}`);

  // note
  const noNote = steps.map((s, i) => (!s.note || !String(s.note).trim()) ? i + 1 : 0).filter(Boolean);
  if (noNote.length) bad(`${k}: ${noNote.length} 步 note 为空（第 ${noNote.slice(0, 6)} 步）`);
  else ok('每步都有 note');

  // 相邻重复
  let dup = 0;
  for (let i = 1; i < steps.length; i++) {
    if (steps[i].line === steps[i - 1].line && steps[i].note === steps[i - 1].note) dup++;
  }
  if (dup) nte(`${k}: ${dup} 组相邻步骤行号和 note 完全相同`);
  else ok('无完全重复的相邻步');

  // 深拷贝检查：抽一个"应当逐步变化"的数组字段
  const arrField = ['frames', 'path', 'ans', 'memo'].find(f => Array.isArray(steps[0][f])) ||
                   (steps[0].ans && Array.isArray(steps[0].ans) ? 'ans' : null);
  if (arrField) {
    const lens = steps.map(s => (s[arrField] || []).length);
    const uniq = new Set(lens);
    if (uniq.size === 1 && lens.length > 3) {
      bad(`${k}: 字段 ${arrField} 每一步长度都相同（${lens[0]}）—— 大概率没深拷贝，历史步全显示成了最终状态`);
    } else {
      ok(`深拷贝正常（${arrField} 长度变化: ${[...new Set(lens)].sort((a, b) => a - b).join('→')}）`);
    }
  }

  // 渲染
  let svgLen = 0, renderErr = null;
  try {
    const s0 = steps[Math.min(1, steps.length - 1)];
    const out = scene.render(s0);
    if (typeof out !== 'string' || !out.includes('<svg')) renderErr = 'render() 没有返回含 <svg> 的字符串';
    else svgLen = out.length;
  } catch (e) {
    renderErr = 'render() 抛异常: ' + e.message;
  }
  if (renderErr) bad(`${k}: ${renderErr}`);
  else ok(`render() 正常（${(svgLen / 1024).toFixed(1)} KB SVG）`);

  // vars
  try {
    const v = scene.vars(steps[Math.min(1, steps.length - 1)]);
    if (!Array.isArray(v) || !v.length) bad(`${k}: vars() 返回空`);
    else ok(`vars() 返回 ${v.length} 个变量`);
  } catch (e) {
    bad(`${k}: vars() 抛异常: ${e.message}`);
  }

  // 期望值
  if (mod.expect && mod.expect[k] !== undefined) {
    const last = steps[steps.length - 1];
    const want = mod.expect[k];
    let got;
    if (typeof want === 'function') {
      // 自定义断言：返回 true 或错误说明字符串
      let r;
      try { r = want(steps); } catch (e) { r = '断言抛异常: ' + e.message; }
      if (r === true) ok(`${k}: 自定义断言通过`);
      else bad(`${k}: 自定义断言失败 —— ${r}`);
    } else if (typeof want === 'object' && want !== null) {
      // {path, value} 形式
      got = want.path.split('.').reduce((o, p) => (o == null ? o : o[p]), last);
      if (JSON.stringify(got) !== JSON.stringify(want.value)) {
        bad(`${k}: ${want.path} = ${JSON.stringify(got)}，期望 ${JSON.stringify(want.value)}`);
      } else ok(`${k}: ${want.path} = ${JSON.stringify(got)} ✓`);
    } else {
      got = last.ans !== undefined ? last.ans : last;
      if (JSON.stringify(got) !== JSON.stringify(want)) {
        bad(`${k}: 最终 ${JSON.stringify(got)}，期望 ${JSON.stringify(want)}`);
      } else ok(`${k}: 最终结果 ✓`);
    }
  }

  summary.push({ k, steps: steps.length });
}

// ---------- 4. 截图（可选） ----------
const shotArgs = [];
args.forEach((a, i) => { if (a === '--shot') shotArgs.push(args[i + 1]); });
if (shotArgs.length) {
  const width = (args[args.indexOf('--width') + 1] !== '--shot' && args.includes('--width'))
    ? args[args.indexOf('--width') + 1] : '1500';
  const height = args.includes('--height') ? args[args.indexOf('--height') + 1] : '900';
  const cands = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ];
  const chrome = cands.find(p => fs.existsSync(p));
  if (!chrome) {
    nte('找不到 Chrome/Edge，跳过截图');
  } else {
    console.log('\n  ── 截图 ──');
    const dir = path.dirname(path.resolve(file));
    shotArgs.forEach(spec => {
      const [sceneKey, stepPart] = spec.includes(':') ? spec.split(':') : [null, spec];
      const hash = `#scene=${sceneKey || ''}&step=${stepPart}`;
      const out = path.join(dir, `_shot_${(sceneKey || 'x')}_${stepPart}.png`);
      const url = 'file:///' + path.resolve(file).replace(/\\/g, '/') + hash;
      try {
        execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
          `--screenshot=${out.replace(/\//g, '\\')}`,
          `--window-size=${width},${height}`, '--virtual-time-budget=4000', url], { stdio: 'pipe' });
        const kb = (fs.statSync(out).size / 1024).toFixed(0);
        ok(`截图 ${path.basename(out)} (${kb} KB)  ${hash}`);
      } catch (e) {
        bad(`截图失败 ${spec}: ${e.message.split('\n')[0]}`);
      }
    });
  }
}

// ---------- 5. 汇总 ----------
console.log('\n' + '─'.repeat(52));
console.log('场景汇总: ' + summary.map(s => `${s.k}=${s.steps}步`).join('  '));
if (fails) {
  console.log(`\x1b[31m失败 ${fails} 项\x1b[0m${warns ? `，警告 ${warns} 项` : ''}`);
  console.log('数字不对的演示页比没有更害人，别交付。\n');
  process.exit(1);
} else {
  console.log(`\x1b[32m全部通过\x1b[0m${warns ? `（警告 ${warns} 项）` : ''}\n`);
}
