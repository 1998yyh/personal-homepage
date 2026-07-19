# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 身份定义

- **角色**: React 前端工程师（暗色玻璃态 UI、工具类 SPA）
- **技术栈**: React 19.2 + TypeScript 5.9 (strict) + Vite 8 + Tailwind CSS v4 + React Query 5 + React Router 7 + Axios 1
- **项目描述**: 「Web Tools」个人主页前端 —— 连接独立后端服务「团子后台」(Web Tools API) 的 SPA，提供 AI/股票日报阅读与前端开发小工具
- **语言约定**: UI 文案与代码注释均为中文

## 可执行命令

```bash
pnpm install   # 安装依赖（包管理器是 pnpm，pnpm-lock.yaml 已提交）
pnpm dev       # Vite 开发服务器，0.0.0.0:5173（监听所有接口，供局域网访问）
pnpm build     # tsc -b 类型检查 + 生产构建到 dist/ —— 改完代码用它验证
pnpm lint      # ESLint 全仓检查
pnpm preview   # 本地预览生产构建
```

本项目**没有测试套件**，验证手段是 `pnpm build`（类型检查）+ `pnpm lint` + 手动页面验证。

## 项目结构

```
src/
├── lib/            # API 层：每个后端资源一个模块，全部复用 api.ts 的 axios 实例
├── types/          # 共享 TypeScript 类型（与 lib/ 模块一一对应）
├── context/        # AuthContext（全局唯一 React Context）
├── components/     # Navbar、ProtectedRoute
└── pages/
    ├── DailyReports/   # AI/股票日报（列表 + markdown 渲染），含 index.ts 桶导出
    └── DevTools/       # 前端小工具集合（纯前端，不调后端）
```

## 后端连接

- 所有请求发往 `import.meta.env.VITE_API_URL`（见 `.env.example`），缺省回退到硬编码生产地址 `http://43.140.214.49:3000/api`（`src/lib/api.ts:3`）。
- 后端端点：`/api/auth/*`（注册/登录/刷新/资料）与 `/api/daily-reports/*`。
- 本地开发需后端 CORS 放行 `http://localhost:5173`。

## 核心架构：JWT 认证链路

跨文件的关键链路，改动任一环都要理解全图：

```
登录页提交 → authApi.login() 存 token 到 localStorage
  → AuthContext.login() 立即 fetchProfile() 拉用户
  → 之后每个请求：api.ts 请求拦截器自动附加 Authorization: Bearer <accessToken>
  → 401 时：响应拦截器用 refreshToken 调 /auth/refresh，换新 token 后重放原请求一次
  → 刷新失败：清空 localStorage，window.location.href = '/login'
路由层：ProtectedRoute 包裹除 /login、/register 外的所有路由（见 App.tsx）
```

关键事实：
- Token 存 localStorage：`accessToken`（约 2h）、`refreshToken`（约 7d）。**只有 `api.ts` 的响应拦截器实现了 401 自动刷新**，绕过它新建 axios 实例会丢失该能力。
- React Query 全局配置 `retry: false`、`refetchOnWindowFocus: false`（`src/App.tsx`）。
- `/daily-reports` 旧路径 301 到 `/ai-news`（`App.tsx` 中的 `<Navigate>`）。

## 编码规范

从代码中观察到的实际约定：

- **类型导入必须 `import type`**：`tsconfig.app.json` 开启 `verbatimModuleSyntax`，类型与值混用导入会编译失败。
- **API 层模式**：`src/lib/` 一个资源一个模块，首行 `import api from './api'`，方法内 `const { data } = await api.get<T>(...)` 后直接返回 `data`（参照 `daily-report-api.ts`）。类型放 `src/types/`。
- **新增页面**：在 `src/App.tsx` 注册路由并包 `<ProtectedRoute>`；在 `src/components/Navbar.tsx` 的 `navItems` 数组加导航项（含 `activePattern` 正则）；带 Navbar 的页面用 `min-h-screen bg-mesh` + `orb orb-1/2/3` 背景装饰。
- **服务端状态**一律用 React Query（`useQuery`），本地 UI 状态用 `useState`，不要引入其他状态库。
- **markdown 渲染**：`react-markdown` + `remark-gfm`，容器套 `.markdown-content` class（暗色样式已在 `index.css` 定义）。

## 样式规范

- **Tailwind v4**，主题 token（`primary-*`/`dark-*` 颜色、`font-display`/`font-body`、`animate-float`/`animate-pulse-slow`）的唯一权威来源是 `src/index.css` 的 `@theme` 块。
- ⚠️ 根目录存在**遗留的 `tailwind.config.js`**，内容与 `@theme` 重复。改 token 时**两个文件都要改**，但以 `index.css` 为准。
- 复用 `index.css` 已定义的组件类：`.glass` / `.glass-dark` / `.input-glass` / `.btn-primary` / `.error-message` / `.bg-mesh` / `.orb*`，不要重写相同样式。
- 设计语言：暗色玻璃拟态（backdrop-blur 卡片 + 渐变背景），新 UI 保持该风格。

## 三层边界模型

### ✅ 必须执行
- 新增后端请求必须走 `src/lib/api.ts` 的共享 axios 实例（才有 token 注入与 401 刷新）。
- 类型用 `import type` 导入；改完代码跑 `pnpm build` 验证类型。
- 新路由（除登录/注册类公开页）必须包 `<ProtectedRoute>`。
- 新增/修改主题 token 时同步更新 `src/index.css` 与 `tailwind.config.js`。

### ⚠️ 需先询问
- 改动 `api.ts` 拦截器逻辑（401 刷新、重定向行为）——影响所有请求。
- 修改硬编码的生产回退地址 `http://43.140.214.49:3000/api`。
- 升级 React Query / Router 大版本配置（`App.tsx` 中的全局默认值）。
- 删除 `tailwind.config.js`（遗留文件，先确认 Tailwind v4 下确实不被读取）。

### ❌ 禁止操作
- 新建独立的 axios 实例或直接用 `fetch` 调后端（会丢 token 与 401 刷新；已删除的 `novelsApi.ts` 曾因此踩坑）。
- 把 token 存到 localStorage 以外的地方，或改动 `accessToken`/`refreshToken` 这两个键名（后端契约）。
- 提交 `.env`（仅 `.env.example` 入库）。
- 在内部导航用 `<a href>`（会整页刷新丢 SPA 状态）——用 `react-router-dom` 的 `<Link>`。注意 `HomePage.tsx` 现存的 `<a href>` 是历史遗留，不要效仿。

## 测试要求

无测试框架。变更的验收标准：
1. `pnpm build` 通过（含 `tsc -b` 严格类型检查，`noUnusedLocals`/`noUnusedParameters` 开启）。
2. `pnpm lint` 无新增错误。
3. 涉及页面跳转/鉴权的改动，手动验证：未登录访问受保护路由 → 跳 `/login`；token 过期 → 自动刷新不中断操作。

---
**版本**: v2.0（deepinit 全新生成，小说阅读模块已移除后重写）
**最后更新**: 2026-07-19
