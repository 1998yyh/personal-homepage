# Web Tools · 设计规范（brand spec）

> 来源：`src/index.css` 设计令牌（Open Design / human-approachable，钴蓝 accent）。设计稿与代码共用同一份令牌。

## 一句话系统

明亮纸面底色 + 白色浮层卡片 + 钴蓝单点缀的「趁手工具台」：圆润（16px 卡片 / 12px 控件）、柔和投影、中文排版亲和，暗色为同构反演而非重新设计。

## 颜色令牌（OKLch）

| 令牌 | 亮主题（默认） | 暗主题 |
|---|---|---|
| `--bg` | `oklch(98% 0.004 240)` | `oklch(17% 0.012 240)` |
| `--surface` | `oklch(100% 0 0)` | `oklch(21% 0.014 240)` |
| `--fg` | `oklch(20% 0.02 240)` | `oklch(94% 0.005 240)` |
| `--muted` | `oklch(50% 0.018 240)` | `oklch(68% 0.015 240)` |
| `--border` | `oklch(90% 0.006 240)` | `oklch(100% 0 0 / 0.09)` |
| `--accent` | `oklch(52% 0.16 258)` | `oklch(70% 0.14 258)` |

派生：`--accent-soft`（accent 12–16% 混入 surface）、`--accent-strong`（亮 42% / 暗 76% 亮度）、`--success oklch(62% 0.14 155)`、`--warn oklch(70% 0.14 75)`、`--danger oklch(58% 0.18 25)`、`--domain oklch(60% 0.10 215)`（股票板块专属点缀）。

阴影：`--shadow-card`（1px 2px 5% + 8px 24px -12px 12%）、`--shadow-lift`（hover 浮起）。圆角：`--radius: 16px`（卡片），控件 10–12px。

## 字体栈

- **Display**：`'Söhne', 'Avenir Next', -apple-system, system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif` — 页面标题、Logo、大数字
- **Body**：`-apple-system, 'SF Pro Text', system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif`
- **Mono/数字**：`tabular-nums` 用于日期与数值

## 姿态规则（从代码观察）

1. **单点缀纪律**：每屏 accent 出现 ≤2 次（eyebrow + 主 CTA）；股票板块用 `--domain` 青蓝替代，形成领域区分。
2. **卡片即容器**：内容一律落在 `.od-card`（surface + 1px border + shadow-card）上，背景保持干净 `--bg`；hover 时 `-translate-y-1` + `--shadow-lift`。
3. **eyebrow 开篇**：每个页面以 12px 大写加粗 eyebrow（accent-strong）+ Display 大标题 + muted 一行说明开场。
4. **双栏工作区**：日报与工具箱均为「左侧 224px 列表卡 + 右侧弹性内容卡」，高度 `calc(100vh - 320px)`，卡片内滚动。
5. **唯一装饰 flourish**：首页跑马灯（ticker）与 Hero 标题下的手绘 accent 下划线；其余页面零装饰。
