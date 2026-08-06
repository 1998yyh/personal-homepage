# Vue 3 迁移设计

**日期**: 2026-07-19
**状态**: 已获用户批准
**分支**: 同仓库新建 `vue-migration` 分支，原地重写（React 代码从 git 历史可追溯）

## 目标

将「Web Tools」个人主页前端从 React 19 完整迁移到 Vue 3，功能 1:1 对齐，并顺手修复两个已知问题。迁移完成后重新生成 CLAUDE.md。

## 已确认的关键决策

| 决策点 | 结论 |
|---|---|
| 迁移方式 | 同仓库新分支 `vue-migration` 原地重写 |
| 状态/数据层 | @tanstack/vue-query + Pinia |
| 保真度 | 功能 1:1 + 顺手修已知问题（不做无关重构） |

## 技术栈映射

| React 版 | Vue 3 版 | 说明 |
|---|---|---|
| React 19.2 | Vue 3.5（`<script setup lang="ts">` SFC） | 组合式 API |
| react-router-dom 7 | vue-router 4 | 路由表结构照搬，含 `/daily-reports` → `/ai-news` 重定向 |
| @tanstack/react-query 5 | @tanstack/vue-query | 全局 `retry: false`、`refetchOnWindowFocus: false` 照搬 |
| AuthContext | Pinia `useAuthStore` | user/isLoading/login/logout 一一对应 |
| axios 实例 + 拦截器 | 原样保留 `src/lib/api.ts` | 框架无关，401 刷新逻辑零改动 |
| react-markdown + remark-gfm | markdown-it | 渲染后 `v-html` 注入 `.markdown-content` 容器 |
| Tailwind v4 + PostCSS | 不变 | `index.css`（`@theme` + `.glass` 等组件类）原样复用 |
| tsc -b | vue-tsc -b | 保持 strict、`verbatimModuleSyntax` 等 tsconfig 约束 |
| eslint + react 插件 | eslint + eslint-plugin-vue | 同等强度 |

包管理器保持 pnpm；`pnpm dev` 仍为 `0.0.0.0:5173`。

## 目录结构

```
src/
├── main.ts             # 入口：createApp + pinia + router + VueQueryPlugin
├── App.vue             # <router-view> 壳
├── index.css           # 原样保留（Tailwind v4 @theme 权威源）
├── lib/                # api.ts（原样）、daily-report-api.ts（仅类型导入调整）
├── types/              # 原样保留
├── stores/auth.ts      # Pinia auth store（替代 context/AuthContext）
├── router/index.ts     # 路由表 + 全局前置守卫（替代 ProtectedRoute）
├── components/         # Navbar.vue
└── pages/              # HomePage / Login / Register / DailyReports/* / DevTools/*
```

**路由守卫设计**：从组件级（`<ProtectedRoute>` 包裹）改为 vue-router 全局前置守卫 `router.beforeEach`——读取 auth store，未登录跳 `/login` 并带 `redirect` query。登录/注册页为公开路由，其余全部受保护。

## 核心链路迁移细节

### ① 请求层（改动最小）

`src/lib/api.ts` 是纯 axios 逻辑，与 React 零耦合——原样保留：
- 请求拦截器：`Authorization: Bearer <accessToken>` 注入（token 来自 localStorage）
- 响应拦截器：401 → 用 refreshToken 调 `/auth/refresh` → 换新 token 重放原请求一次 → 失败清 token 并跳 `/login`

`daily-report-api.ts` 照搬。base URL 仍为 `VITE_API_URL` 环境变量，缺省回退 `http://43.140.214.49:3000/api`。

### ② 认证状态（AuthContext → Pinia）

`useAuthStore`：
- state：`user: User | null`、`isLoading: boolean`
- getter：`isAuthenticated`
- action：`fetchProfile()` / `login(accessToken, refreshToken)` / `logout()`

应用启动时在 `router.beforeEach` 首次导航触发 profile 拉取（替代原 useEffect on mount），守卫等待 `isLoading` 结束再决定放行或跳 `/login`。

### ③ 页面迁移要点

- **Login/Register**：表单逻辑、错误提示照搬；`.input-glass` / `.btn-primary` 样式零改动；登录成功后跳回 `redirect` query 指向的页面。
- **HomePage**：顺手修复——移除内联导航栏改用共享 `<Navbar>`；内部跳转全部 `<router-link>`。
- **DailyReports（AI/Stock）**：`useQuery` 换 vue-query 写法；markdown 正文由 markdown-it 渲染 + `v-html`，容器保留 `.markdown-content` class。
- **DevTools**：12 个纯前端小工具（Base64 / URL / HTML 实体 / Unicode / JSON / 时间戳 / 颜色 / 进制 / UUID / 密码 / Hash 等）各拆为独立 SFC（`pages/DevTools/tools/*.vue`），由 `DevToolsPage.vue` 按选中项动态渲染——替代现版全部塞在单个 `.tsx` 的写法，无后端依赖。

### ④ 已知问题修复清单（仅限这两项）

1. HomePage 重复内联导航栏 → 共享 Navbar 组件
2. `<a href>` 内部导航整页刷新 → `<router-link>`

### ⑤ 错误处理

- API 错误在页面级 catch 并显示 `.error-message`
- 401 由 axios 拦截器统一处理（同现状）
- markdown-it 渲染失败兜底为纯文本显示

## 验收标准

1. `pnpm build`（vue-tsc 类型检查 + Vite 构建）通过、`pnpm lint` 无错误
2. 手动验证鉴权链路：未登录访问 `/` → 跳 `/login`；登录 → 回到来源页；token 过期 → 自动刷新无感继续
3. 逐页视觉对比 React 版：暗色玻璃态样式、动画、日报 markdown 渲染一致

## 收尾

全部页面验证通过后，运行 deepinit 重新生成 CLAUDE.md（Vue 3 技术栈、Pinia 模式、新目录结构）；`tailwind.config.js` 遗留文件的存废在新栈下重新确认。

## 不做的事（YAGNI）

- 不引入 UI 组件库（Element Plus / Naive UI 等），样式继续手写 Tailwind
- 不做服务端渲染 / Nuxt
- 不新增测试框架（与现版一致，验收靠 build + lint + 手动验证）
- 不做除「④ 修复清单」外的任何重构
