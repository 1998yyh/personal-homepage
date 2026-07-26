# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 身份定义

- **角色**: Vue 3 前端工程师（暗色玻璃态 UI、工具类 SPA）
- **技术栈**: Vue 3.5（`<script setup lang="ts">`）+ TypeScript 5.9 (strict) + Vite 8 + Pinia 4 + vue-router 5 + @tanstack/vue-query 5 + Tailwind CSS v4 + markdown-it 14 + Axios 1
- **项目描述**: 「Web Tools」个人主页前端 —— 连接独立后端服务「团子后台」(Web Tools API) 的 SPA，提供 AI/股票日报阅读与前端开发小工具
- **语言约定**: UI 文案与代码注释均为中文
- **历史**: 2026-07 由 React 19 版原地重写（`vue-migration` 分支），React 原版可从 `feature-kimi3` 分支对照（`git show feature-kimi3:<path>`）

## 可执行命令

```bash
pnpm install   # 安装依赖（包管理器是 pnpm，pnpm-lock.yaml 已提交）
pnpm dev       # Vite 开发服务器，0.0.0.0:5173（监听所有接口，供局域网访问）
pnpm build     # vue-tsc -b 类型检查 + 生产构建到 dist/ —— 改完代码用它验证
pnpm lint      # ESLint 全仓检查（当前基线 0 errors / 0 warnings）
pnpm preview   # 本地预览生产构建
```

本项目**没有测试套件**，验证手段是 `pnpm build`（类型检查）+ `pnpm lint` + 浏览器手动验证（可用 Playwright MCP）。

## 项目结构

```
src/
├── lib/            # 框架无关层：api.ts（axios 实例+拦截器）、daily-report-api.ts、markdown.ts
├── types/          # 共享 TypeScript 类型
├── stores/         # Pinia：auth.ts（全局唯一 store）
├── composables/    # useTheme.ts（亮/暗主题切换，Navbar 与认证页共用）
├── router/         # vue-router 路由表 + 全局前置守卫（鉴权在这里，不在组件里）
├── components/     # Navbar.vue、AuthShell.vue（登录/注册共用外壳）
└── pages/
    ├── DailyReports/   # AI/股票日报 + components/（ReportList、ReportContent）
    └── DevTools/       # 工具箱：components/ToolLayout.vue + tools/ 下 11 个独立工具 SFC
```

## 后端连接

- 所有请求发往 `import.meta.env.VITE_API_URL`（见 `.env.example`），缺省回退到硬编码生产地址 `http://43.140.214.49:3000/api`（`src/lib/api.ts:3`）。
- 后端端点：`/api/auth/*`（注册/登录/刷新/资料）与 `/api/daily-reports/*`。
- 本地开发需后端 CORS 放行 `http://localhost:5173`（2026-07 迁移验收时后端未放行本地源，联调前需先确认）。

## 核心架构：JWT 认证链路

跨文件的关键链路，改动任一环都要理解全图：

```
登录页提交 → authApi.login() 得 token → auth store login() 存 localStorage 并 fetchProfile()
  → 之后每个请求：api.ts 请求拦截器自动附加 Authorization: Bearer <accessToken>
  → 401 时：响应拦截器用 refreshToken 调 /auth/refresh，换新 token 后重放原请求一次
  → 刷新失败：清空 localStorage + store 静默登出（全站公开，不跳登录页）
路由层：router/index.ts 的 beforeEach 全局守卫 —— 首次导航（store.isLoading）
  先 fetchProfile 恢复登录态；**不强制登录**（2026-07-22 起全站公开，登录仅用于展示用户信息）
```

关键事实：
- Token 存 localStorage：`accessToken`（约 2h）、`refreshToken`（约 7d）。**只有 `api.ts` 的响应拦截器实现了 401 自动刷新**，绕过它新建 axios 实例会丢失该能力。
- ⚠️ **守卫只在导航时触发**。`logout()` 只清状态不跳转——所有退出入口必须 `auth.logout()` 后显式 `router.push('/login')`（参照 `src/components/Navbar.vue` 的 `handleLogout`）。
- 页面均为匿名可访问；未登录时 Navbar 显示「登录」入口，登录后显示用户头像与「退出」。
- vue-query 全局配置 `retry: false`、`refetchOnWindowFocus: false`（`src/main.ts`）。
- `/daily-reports` 重定向到 `/ai-news`；通配路由兜底回 `/`。

## 编码规范

从代码中观察到的实际约定：

- **SFC 一律 `<script setup lang="ts">`**；类型导入必须 `import type`（`verbatimModuleSyntax` 开启，混用会编译失败）。
- **API 层模式**：`src/lib/` 一个资源一个模块，首行 `import api from './api'`，方法内 `const { data } = await api.get<T>(...)` 后直接返回 `data`（参照 `daily-report-api.ts`）。类型放 `src/types/`。
- **新增页面**：在 `src/router/index.ts` 注册路由（所有页面公开访问，无需 meta 标记）；在 `src/components/Navbar.vue` 的 `navItems` 数组加导航项（含 `activePattern` 正则）；带 Navbar 的页面根元素用 `min-h-screen` 即可（背景色在 body 上，无需装饰元素）。
- **服务端状态**用 vue-query（`useQuery`），**跨组件状态**用 Pinia store，组件本地状态用 `ref`；不引入其他状态库。
- **数据到达后的派生选中**用 `watch(source, cb, { immediate: true })`——必须带 `immediate`，否则 vue-query 缓存命中（setup 时 data 已同步填充）且 structural sharing 保留引用时 watch 不触发（参照 `AIReportsPage.vue`）。
- **markdown 渲染**：一律走 `src/lib/markdown.ts` 的 `renderMarkdown()`（markdown-it，`html: false` 防注入，链接自动 `target=_blank`），用 `v-html` 输出到带 `.markdown-content`（+ `theme-ai`/`theme-stock`）class 的容器；标签样式由 `index.css` 的 `.markdown-content` 后代选择器承担，不要在组件里给渲染内容加 class。
- **DevTools 工具**：每个工具是 `pages/DevTools/tools/` 下的独立 SFC；「输入→按钮→输出」型复用 `components/ToolLayout.vue`（`v-model:input` + `buttons` prop），在 `DevToolsPage.vue` 的 `tools` 数组与组件映射中注册。

## 样式规范

设计语言来自 Open Design 设计稿（human-approachable / 钴蓝 accent，亮主题为默认 + 暗色切换），2026-07 已替换原暗色玻璃拟态：

- **设计令牌**的唯一权威来源是 `src/index.css` 顶部的 `:root` 与 `[data-theme="dark"]` 块（oklch 值与设计稿 `site.css` 一致）：`--bg/--surface/--fg/--muted/--border/--accent(--soft/--strong)/--success/--warn/--danger/--domain/--shadow-card/--shadow-lift/--radius`。
- 这些令牌经 `@theme inline` 映射为 Tailwind 工具类（`bg-bg` / `bg-surface` / `text-fg` / `text-muted` / `border-border` / `bg-accent` / `text-accent-strong` / `shadow-card` / `shadow-lift` 等），**亮暗主题随 `<html data-theme>` 自动切换，不要用 `dark:` 变体，也不要在组件里写死 `text-white`、`bg-white/5` 这类暗色假设**。
- **主题切换**：`index.html` 内联脚本初始化（localStorage 键 `zhe-theme`，缺省跟随系统），切换逻辑统一走 `src/composables/useTheme.ts`（Navbar 与认证页共用）。
- 复用 `index.css` 已定义的组件类：`.od-card` / `.od-panel` / `.od-btn`（`-primary`/`-ghost`/`-soft`/`-lg`/`-block`）/ `.od-input` / `.od-label` / `.od-error` / `.od-chip` / `.od-item`（`.active`）/ `.od-nav-link` / `.od-icon-btn` / `.eyebrow` / `.ticker`，不要重写相同样式。
- **图标一律用 `src/components/AppIcon.vue`**（Lucide 风格 SVG），禁止 emoji 充当图标；新工具/板块在组件内的 `icons` 映射中补充。
- **登录/注册页**（2026-07-26 起按设计稿重做）：共用 `AuthShell.vue` 外壳（auth-shell 左右分栏 + 返回首页 + 主题切换），字段级校验态用 `.field-msg` / `.od-input.err|.ok`，动效用 `.anim-rise` / `.anim-shake`；旧暗色玻璃拟态类已全部删除，不得再引入。

## 三层边界模型

### ✅ 必须执行
- 新增后端请求必须走 `src/lib/api.ts` 的共享 axios 实例（才有 token 注入与 401 刷新）。
- 类型用 `import type` 导入；改完代码跑 `pnpm build` 验证类型。
- 退出登录入口必须 `logout()` 后显式 `router.push('/login')`（守卫不拦原地状态变化）。
- 日报类「列表加载后自动选中第一条」场景用带 `immediate: true` 的 watch。

### ⚠️ 需先询问
- 改动 `api.ts` 拦截器逻辑（401 刷新、重定向行为）或 `router/index.ts` 守卫——影响所有请求与所有路由。
- 修改硬编码的生产回退地址 `http://43.140.214.49:3000/api`。
- 升级 vue-router 大版本（当前为 v5，guard 返回值/redirect 行为需回归验证）。
- 在 `eslint.config.js` 中新增规则豁免（现有豁免：`Navbar` 单词组件名）。

### ❌ 禁止操作
- 新建独立的 axios 实例或直接用 `fetch` 调后端（会丢 token 与 401 刷新）。
- 把 token 存到 localStorage 以外的地方，或改动 `accessToken`/`refreshToken` 这两个键名（后端契约）。
- 提交 `.env`（仅 `.env.example` 入库）。
- 内部导航用 `<a href>`（整页刷新丢 SPA 状态）——一律 `<router-link>`。
- 绕过 `renderMarkdown()` 直接 `v-html` 未消毒内容。

## 测试要求

无测试框架。变更的验收标准：
1. `pnpm build` 通过（vue-tsc 严格类型检查，`noUnusedLocals`/`noUnusedParameters` 开启）。
2. `pnpm lint` 无新增错误（当前基线 0/0，保持）。
3. 涉及鉴权/路由的改动，浏览器手动验证：匿名可直接访问所有页面且 Navbar 显示「登录」；登录 → 回 `redirect` 来源页；退出 → 回 `/login` 且 localStorage 双 token 清空；token 过期 → 自动刷新无感继续（Network 面板可见 `/auth/refresh`）；刷新失败 → 静默登出留在当前页（Navbar 变回「登录」）。

---
**版本**: v3.2（登录/注册页按设计稿重做为 auth-shell 布局，旧玻璃拟态类清除；主题切换抽为 useTheme）
**最后更新**: 2026-07-26
