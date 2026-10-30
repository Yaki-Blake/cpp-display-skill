# 各数据结构的画法

模板里已经带了「数组行」和「横排栈」两种。这里补上链表、树、DP 表、以及所有尺寸基线。

## 一、共用基线

| 项目 | 取值 |
|---|---|
| 主字体 | `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif` |
| 等宽字体 | `ui-monospace, "Cascadia Code", Consolas, "SF Mono", monospace` |
| 代码行高 | 21px，字号 12px（行号色 `#c3c0b7`） |
| 单元格 | 40×40 或 44×44，圆角 8px |
| 面板圆角 | 12px，边框 `1px solid #e6e4dd` |
| 页面底色 | `#f4f3ef`，卡片纯白 |

四个语义色，**全页面统一，不要新增第五个**：

| 变量 | 值 | 含义 |
|---|---|---|
| `--amber` | `#c07c14` | 本步正在改 |
| `--blue` | `#2f6fd0` | 已纳入 / 在结构里等待 |
| `--green` | `#17804a` | 已结算 / 完成 |
| `--red` | `#c0392b` | 负值 / 异常 / 被弹出 |

## 二、数组行

用 CSS Grid，第一列放行标签：

```js
g.style.gridTemplateColumns = `44px repeat(${n}, 44px)`;

let h = '<div></div>';                                  // 左上角空格
for (let i = 0; i < n; i++) h += `<div class="aidx">${i}</div>`;   // 下标行
h += '<div class="albl">a</div>';                       // 行标签
for (let i = 0; i < n; i++) h += `<div class="cell${cls(i)}">${s.a[i]}</div>`;
```

**下标行一定要画**。学生数格子最容易数错，标了 0/1/2/3 就不会。

数组值用 `cell`（40px 大字），答案行之类的次要数据用 `mini`（26px 小字），高度差能视觉上分出主次。

## 三、栈：横过来画

**栈底在左，栈顶在右**，不要竖着画。

```html
<div class="stack-row">
  <span class="sedge">栈底</span>
  <div class="scell top"><span class="si">3 号</span><span class="sv">2</span></div>
  <span class="sedge">栈顶</span>
</div>
```

竖着画有两个问题：占竖向空间、而且"栈顶"和"数组上方"容易混。横过来之后，栈的增长方向就是从左往右，跟数组的读入方向一致，观感顺。

格子里**同时写下标和值**（`3 号` / `2`）。栈里存的是下标还是值，是初学者最容易搞混的点，两个都摆出来就不用猜了。

## 四、指针与连线（含链表固定槽位）

链表是唯一需要 SVG 的结构。核心决定：**格子位置永远不动，只让箭头变**。

这一节的五条规则对**任何带指针的结构**都成立 —— 数组双指针、树、图、并查集，画法可以不同，规矩是同一套。速查：

| # | 规则 | 一句话 |
|---|---|---|
| 1 | 位置固定 | 节点永不重排，只改箭头；没人指向就"箭头消失"，不是节点消失 |
| 2 | 分向绕线 | 向右走下弧、向左走上弧，方向一眼可分 |
| 3 | 终点外移 2px | 格子后画，会把箭头尖盖住 |
| 4 | 撞线加弧度 | 重叠就 +26，跨度大的弧天然更深 |
| 5 | 标签单层 | 多个指针靠 `dx` 横向错开，不靠叠高度 |

下面展开。主文件 `SKILL.md` 第五节有精简版，这里是完整实现。

### 为什么不能按 `next` 顺序排

按 `next` 顺序排，节点会在反转过程中左右乱跳。人眼跟不上，而且"有个节点暂时没人指向"的那一刻，它会直接消失，看着像 bug。

固定槽位之后：

- `dummy`、`#1` … `#n` 从左到右排死在原地，就是内存里的槽位
- 想知道 `#2` 的 `next` 是谁，看从 `#2` 底下出来那根箭头落在哪
- 某个格子**上方一根箭头都没有** = 没人指向它 = 悬空。不用把它挪走，位子不变，只是箭头消失

### 尺寸与坐标

```js
const boxW = 74, boxH = 58, gapX = 52;
const spacing = boxW + gapX;
const padX = 36;
const topY = 168, botY = topY + boxH;
const OFF = 24;                       // 箭头出入点离格子中心的横向偏移
const cx = id => padX + id * spacing + boxW / 2;
const W = padX * 2 + n * spacing + boxW;
```

### 绕线规则（重要）

| 方向 | 从哪绕 | 出入点 |
|---|---|---|
| 向右（`to > from`） | 格子**下方** | 源格子右下 → 目标格子左下 |
| 向左（`to < from`） | 格子**上方** | 源格子左上 → 目标格子右上 |

方向一分，看图上就能立刻判断箭头朝哪边。用二次贝塞尔：

```js
// 向下绕
`M ${x1} ${botY} C ${x1} ${botY + d}, ${x2} ${botY + d}, ${x2} ${botY + 2}`
// 向上绕
`M ${x1} ${topY} C ${x1} ${topY - d}, ${x2} ${topY - d}, ${x2} ${topY - 2}`
```

**终点要落在格子外面 2px**，不能写进格子内部——格子是后画的，会把箭头尖整个盖住，只剩一根没头的线。

### 撞线时加大弧度

同方向的两条弧，如果水平区间重叠、弧度又接近，会叠成一条粗线。贪心分配：

```js
function assign(list, base, step, maxD) {
  const used = [];
  list.forEach(e => {
    let d = base, guard = 0;
    while (guard++ < 30) {
      const clash = used.some(u => Math.abs(u.d - d) < 5 && !(e.hi < u.lo || e.lo > u.hi));
      if (!clash) break;
      d += step;
    }
    d = Math.min(d, maxD);
    used.push({ lo: e.lo, hi: e.hi, d });
    e.d = d;
  });
}
assign(ups, 40, 26, topY - 18);
assign(downs, 30, 24, 170);
```

### 指针标签

`prev` / `cur` / `nxt` 这类指针，用彩色药丸标签 + 一根竖线指到格子顶。

**标签只能占一层高度**。原来我做成三层（y=90/112/134）想让它们互不遮挡，结果向上绕的弧线直接横穿三层标签，更乱。改成一层的代价是两个指针指向同一格时横向挤一点，解决方法是给每个指针固定的 `dx` 偏移：

```js
const ptrs = [
  { name: 'prev', dx: -13, color: '#1d5fa8' },
  { name: 'cur',  dx: 0,   color: '#b8392f' },
  { name: 'nxt',  dx: 13,  color: '#2c7a4b' }
];
```

## 五、树 / 图

节点用绝对定位的 `div`，边用一层 SVG 垫在下面。

1. 先算坐标：按层给 `y`，同层按序号给 `x`，节点宽度固定
2. SVG 层 `position:absolute; inset:0; pointer-events:none;`，**放在节点容器之前**，这样边在节点下层，视觉上"连到背后"
3. 边用直线或贝塞尔，节点用 `rect` + `text`（因为要跨浏览器一致，别用 foreignObject）

节点状态（未访问 / 在队列 / 已访问）直接套四个语义色。

## 六、DP 表

二维数组用 `<table>` 或 Grid 都行，但**行列表头必须固定可读**：

```html
<div class="dp-grid" style="grid-template-columns: 44px repeat(${m}, 40px)">
```

格子里的值有变化时，除了琥珀描边，再给个 `scale(1.06)` 的瞬时放大，眼睛更容易抓到。

正在填的那一格用琥珀，**已经确定但还没被用到**的用蓝，答案来源的格子用绿色虚线框——这样"这个值是从哪推出来的"能一眼看出来。

## 七、面板排布

左边代码固定 `minmax(0, 500px)`，右边 `minmax(0, 1fr)`。窄屏（<960px）改成上下两行。

`body { overflow: hidden }` + 面板内部各自滚动。**不要让整页滚动**，否则高亮行滚动时整个页面跟着动，右边数据面板会跑出视野。

变量表固定三列，行数固定。`null` 显示成 `—` 占位，**不要删行**——行数一变，下面的内容会整体跳动。
