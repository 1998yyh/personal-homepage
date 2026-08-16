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
├── lib/            # 框架无关层：api.ts（axios 实例+拦截器）、daily-report-api.ts、markdown.ts、
│                   #   canvas-api/generation-api/channels-api/prompts-api/assets-api/media-api、
│                   #   agents-api/mcp-servers-api/skills-api/stock-signals-api、
│                   #   zip.ts（fflate）+ assets-export.ts、canvas/（画布纯函数层）
├── types/          # 共享 TypeScript 类型（canvas.ts 为画布文档类型，AGPL 移植）
├── stores/         # Pinia：auth.ts、canvas.ts（画布文档态唯一权威：乐观锁/撤销重做/版本轮询）
├── composables/    # useTheme.ts（亮/暗主题切换，Navbar 与认证页共用）
├── router/         # vue-router 路由表 + 全局前置守卫（鉴权在这里，不在组件里）
├── components/     # Navbar.vue、AuthShell.vue、AppIcon.vue（图标唯一来源）、EmptyState、ConfirmDeleteModal
└── pages/
    ├── DailyReports/   # AI/股票日报 + components/（ReportList、ReportContent）
    ├── DevTools/       # 工具箱：components/ToolLayout.vue + tools/ 下 11 个独立工具 SFC
    ├── Canvas/         # 无限画布：CanvasListPage + CanvasEditorPage + components/（节点/连线/工具栏/
    │                   #   MiniMap/菜单）+ composables/（viewport/drag/resize/marquee/connection/
    │                   #   keyboard/generation/task-watcher）
    ├── Channels/       # AI 渠道管理（卡片 + 抽屉表单，apiKey 只写不读）
    ├── Prompts/        # 提示词库（左源管理 + 右卡片/搜索/分页）
    ├── Assets/         # 素材库（kind Tab + 搜索 + ZIP 导入导出）
    ├── StockSignals/   # B 信号筛选（次级页，不进 Navbar；入口在 StockReportsPage；扫描需登录、结果公开）
    ├── McpServers/     # MCP Server 管理（次级页；入口在 AgentsPage；列表仅返回启用中，env/headers 只写）
    ├── Skills/         # Skill 管理（次级页；入口在 AgentsPage；列表仅返回启用中）
    └── Agents/
        ├── AgentsPage.vue           # Agent 管理：卡片网格 + 右侧抽屉（AgentFormDrawer）
        ├── AgentChatPage.vue        # 流式对话：左栏会话列表 + 右栏聊天 + 智能吸底
        ├── components/
        │   ├── AgentFormDrawer.vue  # 创建/编辑抽屉（Esc 关闭，高级配置默认折叠）
        │   ├── ConversationList.vue # 左侧会话列表（前端搜索 + 草稿占位项 + 滚动加载）
        │   ├── MessageBubble.vue    # 消息气泡（user=accent-soft 纯文本 / assistant=markdown 块级增量渲染）
        │   ├── MarkdownBlock.vue    # 流式渲染最小单元：单块 v-html，text 不变则 DOM 不动
        │   ├── ReasoningRow.vue     # 思维链折叠行：流式=最新行滚动+shimmer / 落定=首行摘要
        │   ├── ToolCallCard.vue     # 工具调用卡片：running/done/error/interrupted 四态 + SUMMARY_KEYS 参数摘要
        │   ├── TaskToolCard.vue     # delegate_task 子代理卡：内嵌子轨迹（ReasoningRow+子工具卡，live-only）
        │   ├── BackgroundTasksPill.vue # 头部后台任务 pill + 弹层（live 时 5s 轮询，完成跃迁 invalidate 消息）
        │   ├── MessageQueueStrip.vue   # 排队消息条（流式中发送的消息，自然结束后按序自动续发）
        │   └── SlashCommandMenu.vue    # 斜杠命令菜单（/clear、/stop）
        └── utils/
            └── groupMessages.ts    # 历史消息归组：role='tool' 配对进 assistant.toolCalls（含 isError→error 态）
        # 接口在 lib/agents-api.ts，类型在 types/agent.ts，流式在 composables/useAgentStream.ts
```

**画布平台**（2026-08 从 infinite-canvas 迁移，AGPL-3.0，见根目录 NOTICE；后端设计文档在 tuanzi-server-base `docs/plans/2026-08-07-canvas-platform-design.md`）：画布文档存后端 MySQL（`canvas_projects.document` JSON + version 乐观锁），所有保存走 `stores/canvas.ts` 的 debounce PUT + 409 冲突模态；AI 生成走后端代理，视频为异步任务（`useGenerationTaskWatcher` 轮询终态后 syncVersion 重载）；媒体 URL 一律过 `lib/media-api.ts` 的 `mediaUrl()`（`/uploads/` 不在 `/api` 前缀下）。

## 后端连接

- 所有请求发往 `import.meta.env.VITE_API_URL`（见 `.env.example`），缺省回退到硬编码生产地址 `http://43.140.214.49:3000/api`（`src/lib/api.ts:3`）。
- 后端端点：`/api/auth/*`（注册/登录/刷新/资料）、`/api/daily-reports/*`、`/api/agents/*`（CRUD）与 `/api/conversations/*`（会话/消息/流式）、`/api/canvas-projects/*`（文档 PUT 带 baseVersion 乐观锁 + `/version` 轻量比对）、`/api/ai-generation/*`（images 同步 / videos+tasks 异步轮询）、`/api/ai-channels/*`、`/api/prompts/*`（含 sources 子资源与 refresh）、`/api/assets/*`、`/api/media/*`（上传/查询；文件本体在 `/uploads/`，不在 `/api` 前缀下）、`/api/stock-signals/*`（POST scans 需登录，结果与日期公开）、`/api/mcp-servers/*`、`/api/skills/*`。
- Agents API 分页常量（`src/lib/agents-api.ts`）：`AGENTS_LIMIT=100`（一次拉全）、`CONVERSATIONS_LIMIT=20`（滚动加载）、`MESSAGES_LIMIT=30`（向上翻页）。删除会话走 `DELETE /conversations/:id`（不在 `/agents/` 下）。后台任务走 `GET /conversations/:id/background-tasks`。
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
- **新增页面**：在 `src/router/index.ts` 注册路由（所有页面公开访问，无需 meta 标记）；**主板块**在 `src/components/Navbar.vue` 的 `navItems` 数组加导航项（含 `activePattern` 正则），**次级页面**（如 StockSignals/McpServers/Skills）不进 Navbar，从父页面用 `<router-link>` 进入；带 Navbar 的页面根元素用 `min-h-screen` 即可（背景色在 body 上，无需装饰元素）。
- **服务端状态**用 vue-query（`useQuery`），**跨组件状态**用 Pinia store，组件本地状态用 `ref`；不引入其他状态库。
- **数据到达后的派生选中**用 `watch(source, cb, { immediate: true })`——必须带 `immediate`，否则 vue-query 缓存命中（setup 时 data 已同步填充）且 structural sharing 保留引用时 watch 不触发（参照 `AIReportsPage.vue`）。
- **markdown 渲染**：一律走 `src/lib/markdown.ts` 的 `renderMarkdown()`（markdown-it，`html: false` 防注入，链接自动 `target=_blank`），用 `v-html` 输出到带 `.markdown-content`（+ `theme-ai`/`theme-stock`）class 的容器；标签样式由 `index.css` 的 `.markdown-content` 后代选择器承担，不要在组件里给渲染内容加 class。
- **DevTools 工具**：每个工具是 `pages/DevTools/tools/` 下的独立 SFC；「输入→按钮→输出」型复用 `components/ToolLayout.vue`（`v-model:input` + `buttons` prop），在 `DevToolsPage.vue` 的 `tools` 数组与组件映射中注册。

## Agents 板块深度架构

跨文件链路，改任一环必须理解全图：

### SSE 流式实现（XHR 非 EventSource）

**关键事实**：`useAgentStream.ts` 用 **axios onDownloadProgress**（XHR）而非 `fetch` / `EventSource`，目的是白嫖共享实例的 token 注入与 401 刷新（CLAUDE.md 禁令：绝对不能绕过 `api.ts` 新建实例）。

```
POST /conversations/:id/messages?stream=true
↓
axios 请求拦截器注入 Authorization: Bearer <accessToken>
↓
onDownloadProgress 增量读 xhr.responseText，按 \n\n 切 SSE 事件块
↓
handleChunk() 解析 event: / data: 行，更新 streamingMessage（临时气泡）
↓
连接关闭（请求完成）= 流结束，触发 onStreamEnd 回调 invalidate 消息列表归位
```

**后端事件序列是多轮的**（ReAct 循环每轮一对 message_start/end）：

```
message_start → text_delta* → message_end → (tool_use → tool_result)* → message_start → … → 连接关闭
```

**message_end 不是流结束信号**（只是本轮定稿），流结束以 axios 请求完成（连接关闭）为准。`message_end` 的 `content` 字段：中间轮（工具调用轮）常为空串，仅非空时覆盖临时气泡文本；最终一轮的 `content` 才是最终回答。

**扩展事件**（2026-08 DSH 交互移植）：`tool_result.data.isError`（后端 tools_node catch 到的失败/超时，卡片红色 error 态）；`sub_event { callId, type, data }`（delegate_task 子代理的完整事件流，经回调旁路注入合并队列，前端按 callId 路由进父卡片 `subTrace`，未知 callId 防御性忽略）。后端侧关键不变式：子代理运行带 `metadata.subAgentRun=true` 标记，外层 pump 丢弃带标事件（LangChain callback 传播会让子图 streamEvents 全部冒泡到外层，不过滤会把子代理轨迹持久化成顶层气泡）；`iterations: 0` 必须随每轮重置（checkpoint 会恢复历史累计值，超过 maxIterations 后会话永久跳过 tools_node）。

### 轮次计时 / 队列 / 斜杠 / 停止残影（DSH 移植）

- **TurnStatus/TurnTail**（AgentChatPage）：status→streaming 边沿锚定 `performance.now()`，>15s 显示「正在深入思考… m:ss」；done 时把 `stream.turnMetrics`（elapsedMs/ttftMs/totalTokens）存入页级 ref 渲染页脚（tok/s 含输入 token，是近似值），下次发送/切会话清空；历史轮次无页脚（刻意不持久化）。
- **排队消息**：`sendMessage` 顶部 `if (stream.streaming.value) { queuedMessages.push; return }`；status watch 的 done 边沿 shift 一条 nextTick 重进 sendMessage（**abort/error 不续发**，队列保留）。删行/点行编辑走 MessageQueueStrip。
- **斜杠命令**：输入 `/` 开头且无空白弹 SlashCommandMenu，Enter 执行高亮项（`/clear`→startDraft、`/stop`→stopStreaming 仅流式中可用），Esc 清空输入。
- **停止残影**：`stopStreaming` 用 `stream.abort({ keepPartial: true })`——先把仍 running 的卡片（含嵌套）定格为 interrupted 并保留气泡，不做自动 reset（本地 refetch ~100ms，即清会看不到中断态）；残影随下一次 send 或切会话/草稿（无条件 `stream.abort()`）消散。已知边角：后端断连时**用户消息也不落库**（persist 在流结束后），停止后该轮整体消失；若后端恰好持久化了部分 assistant 内容，历史与残影短暂双显。

### ⚠️ 两类已实测复现的竞态（改动发送/断流链路时必读）

1. **归位 reset 踩新一轮**：`onStreamEnd` 的 invalidate 是异步的，done 边沿的队列续发会在 refetch 完成前开新流；迟到的 `stream.reset()` 会把新一轮 status 踩回 idle、清空其流式气泡与乐观用户气泡（实测：续发轮结束后状态机卡死、消息列表不刷新）。防线：sendMessage 的 `sendSeq` 代际令牌，归位清理只在「仍是最新一轮」时执行。
2. **后台任务 pill 首显**：pill 的 useQuery 只在有 live 任务时 5s 轮询，首查返回空则永远停轮询——run_background_task 在流内建行，必须靠流结束时 invalidate `['background-tasks', convId]`（sendMessage onStreamEnd + stopStreaming 都加了）触发首显。

### 草稿会话状态机（懒创建）

```
用户点「新对话」→ selectedId=null + isDraft=true → 显示建议问题 chips（Kimi 首页式引导）
↓
用户发送首条消息 → 先 POST /agents/:id/conversations 建真实会话
↓
成功：isDraft=false，selectedId=新会话 ID，invalidate 会话列表，执行流式发送
失败：保留草稿态，展示 sendError
```

选中态同步到 URL 查询参数 `?c=<conversationId>`（`router.replace` 不刷历史记录），刷新/分享不丢选中。

### 消息列表双向分页

- **会话列表**：`useInfiniteQuery` 滚动加载更多（`initialPageParam: 1`，`getNextPageParam` 推进）
- **消息列表**：后端 DESC 分页（`page=1` 为最新一页），前端两次反转得 ASC：

```ts
const historyMessages = computed(() =>
  (msgData.value?.pages ?? [])
    .slice()
    .reverse()          // pages 按新→旧，反转为旧→新
    .flatMap((p) => p.items.slice().reverse()),  // 每页内 DESC，反转为 ASC
)
```

向上翻页（「加载更早的消息」）：`fetchNextPage()` prepend 到列表头部。

### 消息归组（`groupMessages`）

历史消息里 `role='tool'` 的独立记录不渲染独立气泡，而是配对进对应 `assistant` 消息的 `toolCalls` 数组（通过 `toolCallId` 索引）：

```ts
// toolCallId → 工具结果
const toolResults = new Map<string, string>();
for (const m of messages) {
  if (m.role === 'tool' && m.toolCallId) {
    toolResults.set(m.toolCallId, m.content);
  }
}
// assistant 消息的 toolCalls 从 map 中捞结果，配对成卡片
```

流式中的 `tool_result` 事件同理：找到临时气泡 `toolCalls` 数组中对应 `id` 的卡片，回填 `content` 字段并置 `status: 'done'`。

### 智能滚动（Kimi 式）

```ts
userNearBottom = scrollHeight - scrollTop - clientHeight < 80  // 阈值 80px
```

- 用户在底部附近时（`userNearBottom=true`）：新消息/流式输出自动吸底
- 上翻看历史时（`userNearBottom=false`）：不被新内容拽回去
- 点「回到底部」悬浮钮 / 自己发送消息：强制 `userNearBottom=true` + `scrollTop=scrollHeight`

### 流式渲染（useAgentStream + MessageBubble，对齐 deepseek-harness 设计）

三层结构，改任一环需理解全图：

1. **数据层 rAF 合帧**（`useAgentStream.ts`）：SSE delta 先写入非响应式 `draft`，每帧最多 `publish` 一次到 reactive `streamingMessage`（避免每个网络 chunk 触发整条响应式链路）。流结束/出错/中断前必须 `flushPublish()` 冲刷末帧。
2. **⚠️ axios 进度回调陷阱**：axios 的 `progressEventReducer` 把 `onDownloadProgress` 节流到 3 次/秒，且延迟触发时原生事件的 `currentTarget` 已被置 null（DOM 规范）——读 `responseText` 必须用 `event.event.target`。拿到 XHR 后另挂原始 `progress` listener（`consume`）以获得全频率增量，axios 回调只做捕获通道。
3. **块级增量渲染**（`MessageBubble.vue` + `MarkdownBlock.vue`）：流式文本按「围栏感知的空行」切成顶层块，`key = 块起始源码偏移`（append-only 流下不变）；已闭合块的 text 不变 → Vue props 浅比较跳过子组件更新 → 其 parse 与 DOM 只发生一次，每帧只有活跃尾块重渲。流结束（`streaming` true → false）整文单次重渲（self-heal 跨块引用/松散列表）。历史消息直接整文渲染。

首 token/工具卡片到达前展示「正在思考」占位（三点弹跳动画，`.thinking-dot`），避免空气泡像卡死。

### 核心约束

- **切换会话 / 离开页面必须断流**：`stream.abort()` 同步中止 AbortController，置 `status='idle'` 并清空临时气泡/残影（`onBeforeUnmount` / `selectConversation` 内调用，无条件）；停止生成走 `abort({ keepPartial: true })` 保留中断残影。
- **发送中禁止再发**：流式中的发送进 `queuedMessages` 排队（后端串行约束，并发会乱序），done 边沿自动续发。
- **停止生成后必须 invalidate**：后端落库时机后移，断流时已生成内容（含用户消息）可能已持久化也可能被丢弃，以 `invalidateQueries` 拉回的为准。
- **删除会话时选中态降级**：若删除的是 `selectedId`，置空后 `conversations` 的 watch（`immediate: true`）会自动选中剩下的最近一个。

## 样式规范

设计语言来自 Open Design 设计稿（human-approachable / 钴蓝 accent，亮主题为默认 + 暗色切换），2026-07 已替换原暗色玻璃拟态：

- **设计令牌**的唯一权威来源是 `src/index.css` 顶部的 `:root` 与 `[data-theme="dark"]` 块（oklch 值与设计稿 `site.css` 一致）：`--bg/--surface/--fg/--muted/--border/--accent(--soft/--strong)/--success/--warn/--danger/--domain/--shadow-card/--shadow-lift/--radius`。
- 这些令牌经 `@theme inline` 映射为 Tailwind 工具类（`bg-bg` / `bg-surface` / `text-fg` / `text-muted` / `border-border` / `bg-accent` / `text-accent-strong` / `shadow-card` / `shadow-lift` 等），**亮暗主题随 `<html data-theme>` 自动切换，不要用 `dark:` 变体，也不要在组件里写死 `text-white`、`bg-white/5` 这类暗色假设**。
- **主题切换**：`index.html` 内联脚本初始化（localStorage 键 `zhe-theme`，缺省跟随系统），切换逻辑统一走 `src/composables/useTheme.ts`（Navbar 与认证页共用）。
- 复用 `index.css` 已定义的组件类：`.od-card` / `.od-panel` / `.od-btn`（`-primary`/`-ghost`/`-soft`/`-lg`/`-block`）/ `.od-input` / `.od-label` / `.od-error` / `.od-chip` / `.od-item`（`.active`）/ `.od-nav-link` / `.od-icon-btn` / `.od-modal-overlay`（全屏遮罩弹窗）/ `.od-drawer` + `.od-drawer-overlay`（右侧抽屉）/ `.eyebrow` / `.ticker`，不要重写相同样式。
- **聊天 markdown**：`MessageBubble` 里用 `.markdown-content.chat-md` 类，区别于日报的 `.markdown-content.theme-ai/.theme-stock`；样式在 `index.css` 定义，不要在组件里内联。
- **图标一律用 `src/components/AppIcon.vue`**（Lucide 风格 SVG），禁止 emoji 充当图标；新工具/板块在组件内的 `icons` 映射中补充。
- **登录/注册页**（2026-07-26 起按设计稿重做）：共用 `AuthShell.vue` 外壳（auth-shell 左右分栏 + 返回首页 + 主题切换），字段级校验态用 `.field-msg` / `.od-input.err|.ok`，动效用 `.anim-rise` / `.anim-shake`；旧暗色玻璃拟态类已全部删除，不得再引入。

## 三层边界模型

### ✅ 必须执行
- 新增后端请求必须走 `src/lib/api.ts` 的共享 axios 实例（才有 token 注入与 401 刷新）。
- 类型用 `import type` 导入；改完代码跑 `pnpm build` 验证类型。
- 退出登录入口必须 `logout()` 后显式 `router.push('/login')`（守卫不拦原地状态变化）。
- 日报类「列表加载后自动选中第一条」场景用带 `immediate: true` 的 watch。
- **切换会话 / 离开 AgentChatPage 时必须调 `stream.abort()`**（切换：`selectConversation` / `startDraft`；离开：`onBeforeUnmount`）——无条件调用（abort 内部幂等），顺带清停止残影；只有「停止生成」用 `abort({ keepPartial: true })` 保留中断残影。
- 发送消息前检查 `stream.streaming.value`，流式进行中禁止并发发送（后端串行约束）——流式中的用户输入走 queuedMessages 排队，done 边沿自动续发。
- 停止生成（`stopStreaming`）后必须 `invalidateQueries` 拉最新消息，以后端落库结果为准。

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
**版本**: v3.7（DSH 交互移植：思维链行/工具四态/子代理嵌套轨迹/后台任务 pill/排队/斜杠命令/轮次计时 + 两类竞态防线）
**最后更新**: 2026-08-16
