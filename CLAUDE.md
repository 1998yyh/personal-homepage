# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 身份定义

- **角色**: Vue 3 前端工程师（AI 工作空间、深色苔绿 / 米白陶土双主题）
- **技术栈**: Vue 3.5（`<script setup lang="ts">`）+ TypeScript 5.9 (strict) + Vite 8 + Pinia 4 + vue-router 5 + @tanstack/vue-query 5 + Tailwind CSS v4 + markdown-it 14 + Axios 1 + reka-ui 2（headless 组件层，目前仅 OdSelect 使用）
- **项目描述**: 「团子 AI」工作空间前端 —— 连接独立后端服务「团子后台」(Web Tools API) 的 SPA，提供 Agent 对话、多模态生成、无限画布、AI 资讯与辅助工具
- **语言约定**: UI 文案与代码注释均为中文。核心 / 关键逻辑必须写中文注释（见「编码规范」）。
- **历史**: 2026-07 由 React 19 版原地重写（`vue-migration` 分支），React 原版可从 `feature-kimi3` 分支对照（`git show feature-kimi3:<path>`）

## 可执行命令

```bash
pnpm install   # 安装依赖（包管理器是 pnpm，pnpm-lock.yaml 已提交）
pnpm dev       # Vite 开发服务器，0.0.0.0:5173（监听所有接口，供局域网访问）；
               # 端口由 vite.config.ts 自探：5173 被「半占用」（别人只绑 127.0.0.1）时自动顺延并打日志
pnpm dev:online # 连线上后端：加载 .env.online，Vite 同源代理 /api 与 /uploads 到 VITE_PROXY_TARGET，规避 CORS（联调主路径）
pnpm build     # vue-tsc -b 类型检查 + 生产构建到 dist/ —— 改完代码用它验证
pnpm lint      # ESLint 全仓检查（当前基线 0 errors / 0 warnings）
pnpm preview   # 本地预览生产构建
node --test tests/*.test.mjs  # lib 纯函数单测（node:test + Node≥22.18 类型剥离直跑 TS；
                              # 必须 glob 到文件，传目录 `node --test tests/` 在 Node 22 上模块解析失败）
```

验证手段是 `pnpm build`（类型检查）+ `pnpm lint` + `tests/` 轻量单测（仅覆盖 lib 纯函数，无组件/E2E 框架）+ 浏览器手动验证（可用 Playwright MCP；`node scripts/mock-agent-api.mjs` 起 Agent 聊天页 mock API，端口 3100，SSE 逐 delta 滴送，把 VITE_API_URL 指过去即可验证流式渲染）。

**部署**：push 到 `main` 自动触发 GitHub Actions（`.github/workflows/deploy.yml`）：CI 用 Node22 构建（`VITE_API_URL=/api`，走 nginx 同源反代）→ rsync `dist/` 到服务器 `/var/www/personal-homepage` → 首页探活。回滚 = 在 Actions 页面重跑旧 ref 的 workflow。纯 `**.md` 改动不触发。旧 `deploy.sh` 已退役。

## 项目结构

```
src/
├── lib/            # 框架无关层：api.ts（axios 实例+拦截器）、daily-report-api.ts、markdown.ts、
│                   #   canvas-api/generation-api/channels-api/prompts-api/assets-api/media-api、
│                   #   agents-api/mcp-servers-api/skills-api、
│                   #   zip.ts（fflate）+ assets-export.ts、canvas/（画布纯函数层）、
│                   #   studio/（生成台纯函数层：models/params/snapshot/assets/types）、
│                   #   video-model-config.ts（视频模型素材/参数校验，tests/ 单测对象）
├── types/          # 共享 TypeScript 类型（canvas.ts 为画布文档类型，AGPL 移植）
├── stores/         # Pinia：auth.ts、canvas.ts（画布文档态唯一权威：乐观锁/撤销重做/版本轮询）、
│                   #   studio.ts（生成台跨能力会话：composer+历史栏，切 Tab 不丢）、launch.ts（首页→对话草稿）
├── composables/    # useTheme.ts（模块级共享主题，设置与认证页共用）、useToast.ts、useAgentStream.ts（见 Agents 板块）
├── router/         # vue-router 路由表 + 全局前置守卫（鉴权在这里，不在组件里）
├── components/     # layout/（AppShell、AppSidebar、AppearanceSettings、navigation.ts）、AuthShell.vue、
│                   #   AppIcon.vue（图标唯一来源）、AppToast.vue（全局 toast，App.vue 挂载）、EmptyState、
│                   #   ConfirmDeleteModal、ui/OdSelect.vue（全站唯一下拉，reka-ui 封装）
└── pages/
    ├── DailyReports/   # AI/股票日报 + components/（ReportList、ReportContent）
    ├── Home/           # 首页组件（HomeHero/HomeComposer/HomeFeatures），由 pages/HomePage.vue 组合
    ├── Studio/         # 生成台（登录墙，meta.requiresAuth）：StudioPage（图片/视频/音频三 Tab + 词库侧栏）
    │                   #   + components/（GeneratePane/Composer/ResultStage/HistoryRail/ReferencePicker/
    │                   #   ResultLightbox/ImagePreview）+ composables/（useStudioGenerate/useStudioRailWidth）
    ├── DevTools/       # 工具箱：components/ToolLayout.vue + tools/ 下 11 个独立工具 SFC
    ├── Canvas/         # 无限画布：CanvasListPage + CanvasEditorPage + components/（节点/连线/工具栏/
    │                   #   MiniMap/菜单）+ composables/（viewport/drag/resize/marquee/connection/
    │                   #   keyboard/generation/task-watcher）
    ├── Channels/       # AI 渠道管理（卡片 + 抽屉表单，apiKey 只写不读）
    ├── Prompts/        # 内部提示词库（生成台侧栏，/prompts 路由已重定向 /studio；分类/标签筛选、按 canManage 新增、按 canEdit 编辑、按 canEdit 删除）
    ├── Assets/         # 素材库（kind Tab + 搜索 + ZIP 导入导出）
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

**领域词汇**（生成台、能力/modelRef、参考图与媒体/素材之分）的唯一权威是 `CONTEXT.md`。

新浪 B/S 信号选股及信号观察池已迁移至 `../guanlan`，本项目已删除对应页面、路由与入口。股票资讯日报继续保留。

## 后端连接

- 所有请求发往 `import.meta.env.VITE_API_URL`（见 `.env.example`），缺省回退到硬编码生产地址 `http://43.140.214.49:3000/api`（`src/lib/api.ts:3`）。
- 后端端点：`/api/auth/*`（注册/登录/刷新/资料）、`/api/daily-reports/*`、`/api/agents/*`（CRUD）与 `/api/conversations/*`（会话/消息/流式）、`/api/canvas-projects/*`（文档 PUT 带 baseVersion 乐观锁 + `/version` 轻量比对）、`/api/ai-generation/*`（images 同步 / videos+tasks 异步轮询）、`/api/ai-channels/*`、`/api/prompts/*`（含 sources 子资源与 refresh）、`/api/assets/*`、`/api/media/*`（上传/查询；文件本体在 `/uploads/`，不在 `/api` 前缀下）、`/api/mcp-servers/*`、`/api/skills/*`。
- Agents API 分页常量（`src/lib/agents-api.ts`）：`AGENTS_LIMIT=100`（一次拉全）、`CONVERSATIONS_LIMIT=20`（滚动加载）、`MESSAGES_LIMIT=30`（向上翻页）。删除会话走 `DELETE /conversations/:id`（不在 `/agents/` 下）。后台任务走 `GET /conversations/:id/background-tasks`。
- 连本地后端需其 CORS 放行 `http://localhost:5173`；连线上用 `pnpm dev:online`（`.env.online`：`VITE_API_URL=/api` + `VITE_PROXY_TARGET`），Vite dev server 同源代理 `/api` 与 `/uploads`，从根上绕开 CORS（2026-07 迁移验收时后端未放行本地源，代理方案即由此而来）。

## 核心架构：JWT 认证链路

跨文件的关键链路，改动任一环都要理解全图：

```
登录页提交 → authApi.login() 得 token → auth store login() 存 localStorage 并 fetchProfile()
  → 之后每个请求：api.ts 请求拦截器自动附加 Authorization: Bearer <accessToken>
  → 401 时：响应拦截器用 refreshToken 调 /auth/refresh，换新 token 后重放原请求一次
  → 刷新失败：清空 localStorage + store 静默登出（原地不跳页；若正在 /studio/* 上，下次导航被守卫拦回 /login）
路由层：router/index.ts 的 beforeEach 全局守卫 —— 首次导航（store.isLoading）
  先 fetchProfile 恢复登录态；绝大多数页面公开（2026-07-22 起），仅 meta.requiresAuth
  的 /studio/*（生成台，全站第一条登录墙）硬拦：未登录重定向 /login 并带 redirect 回跳
```

关键事实：
- Token 存 localStorage：`accessToken`（约 2h）、`refreshToken`（约 7d）。**只有 `api.ts` 的响应拦截器实现了 401 自动刷新**，绕过它新建 axios 实例会丢失该能力。
- ⚠️ **守卫只在导航时触发**。`logout()` 只清状态不跳转——所有退出入口必须 `auth.logout()` 后显式 `router.push('/login')`（参照 `src/components/layout/AppSidebar.vue` 的 `logout`）。
- 除 `/studio/*` 外页面均匿名可访问；未登录时 侧栏显示「登录」入口，登录后显示用户头像与「退出」。
- vue-query 全局配置 `retry: false`、`refetchOnWindowFocus: false`（`src/main.ts`）。
- `/daily-reports` 重定向到 `/ai-news`；通配路由兜底回 `/`。

## 编码规范

从代码中观察到的实际约定：

- **SFC 一律 `<script setup lang="ts">`**；类型导入必须 `import type`（`verbatimModuleSyntax` 开启，混用会编译失败）。
- **核心 / 关键逻辑必须加中文注释**：状态机、竞态/代际令牌、乐观锁、轮询终态、鉴权刷新、生成占位替换、跨 Tab 会话等「不看注释会踩坑」的路径，用一两句中文写清**为什么**和不变式，不要复述下一行代码在干什么。显而易见的取值 / 绑样式 / 普通 CRUD 不要注。注释语言只能是中文（与「语言约定」一致）。
- **API 层模式**：`src/lib/` 一个资源一个模块，首行 `import api from './api'`，方法内 `const { data } = await api.get<T>(...)` 后直接返回 `data`（参照 `daily-report-api.ts`）。类型放 `src/types/`。
- **新增页面**：在 `src/router/index.ts` 注册路由（默认公开访问；确需登录墙才加 `meta.requiresAuth`，现有唯一先例 `/studio/*`）；**导航入口**在 `src/components/layout/navigation.ts` 对应分组中添加，**次级页面**（如 StockSignals/McpServers/Skills）不进主导航，从父页面用 `<router-link>` 进入；普通页面根使用 `page-root`，共享侧栏与 64px 顶栏由 `App.vue` / `AppShell.vue` 提供，页面不要重复挂导航。
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

设计语言为「团子 AI」：D 深色苔绿 + F 米白陶土，2026-09-12 从已确认原型落地：

- **设计令牌**的唯一权威来源是 `src/index.css` 顶部的 `:root` 与 `[data-theme="dark"]` 块：`--bg/--sidebar/--surface/--panel/--fg/--muted/--border/--accent(--soft/--strong)/--on-accent/--success/--warn/--danger/--domain/--shadow-card/--shadow-lift/--radius/--art-1..4`。
- 这些令牌经 `@theme inline` 映射为 Tailwind 工具类（`bg-bg` / `bg-surface` / `text-fg` / `text-muted` / `border-border` / `bg-accent` / `text-accent-strong` / `shadow-card` / `shadow-lift` 等），**亮暗主题随 `<html data-theme>` 自动切换；主色按钮前景使用 `text-on-accent` / `--on-accent`，不要用 `dark:` 变体，也不要在组件里写死 `text-white`、`bg-white/5` 这类暗色假设**。
- **主题切换**：`index.html` 内联脚本初始化（localStorage 键 `zhe-theme`，新用户默认 dark；一次性迁移原型 `tuanzi-ui-appearance` 的 D/F 选择），切换逻辑统一走 `src/composables/useTheme.ts`（模块级状态，设置与认证页共用，支持 storage 事件同步）。
- 复用 `index.css` 已定义的组件类：`.od-card` / `.od-panel` / `.od-btn`（`-primary`/`-ghost`/`-soft`/`-lg`/`-block`）/ `.od-input` / `.od-label` / `.od-error` / `.od-chip` / `.od-item`（`.active`）/ `.od-nav-link` / `.od-icon-btn` / `.od-modal-overlay`（全屏遮罩弹窗）/ `.od-drawer` + `.od-drawer-overlay`（右侧抽屉）/ `.eyebrow` / `.ticker`，不要重写相同样式。
- **下拉选择一律用 `src/components/ui/OdSelect.vue`**（reka-ui headless 封装，样式全接 od-* 令牌随主题切换）；禁止再写原生 `<select>`（2026-09 已全面替换：系统弹层 CSS 不可控、视觉割裂）。
- **聊天 markdown**：`MessageBubble` 里用 `.markdown-content.chat-md` 类，区别于日报的 `.markdown-content.theme-ai/.theme-stock`；样式在 `index.css` 定义，不要在组件里内联。
- **图标一律用 `src/components/AppIcon.vue`**（Lucide 风格 SVG），禁止 emoji 充当图标；新工具/板块在组件内的 `icons` 映射中补充。
- **登录/注册页**（2026-07-26 起按设计稿重做）：共用 `AuthShell.vue` 外壳（auth-shell 左右分栏 + 返回首页 + 主题切换），字段级校验态用 `.field-msg` / `.od-input.err|.ok`，动效用 `.anim-rise` / `.anim-shake`；旧暗色玻璃拟态类已全部删除，不得再引入。

## 三层边界模型

### ✅ 必须执行
- 新增后端请求必须走 `src/lib/api.ts` 的共享 axios 实例（才有 token 注入与 401 刷新）。
- 类型用 `import type` 导入；改完代码跑 `pnpm build` 验证类型。
- 写或改核心 / 关键逻辑时必须补中文注释（为什么 + 不变式）；禁止只写英文注释，也禁止给显而易见的代码刷注释。
- 退出登录入口必须 `logout()` 后显式 `router.push('/login')`（守卫不拦原地状态变化）。
- 日报类「列表加载后自动选中第一条」场景用带 `immediate: true` 的 watch。
- **切换会话 / 离开 AgentChatPage 时必须调 `stream.abort()`**（切换：`selectConversation` / `startDraft`；离开：`onBeforeUnmount`）——无条件调用（abort 内部幂等），顺带清停止残影；只有「停止生成」用 `abort({ keepPartial: true })` 保留中断残影。
- 发送消息前检查 `stream.streaming.value`，流式进行中禁止并发发送（后端串行约束）——流式中的用户输入走 queuedMessages 排队，done 边沿自动续发。
- 停止生成（`stopStreaming`）后必须 `invalidateQueries` 拉最新消息，以后端落库结果为准。

### ⚠️ 需先询问
- 改动 `api.ts` 拦截器逻辑（401 刷新、重定向行为）或 `router/index.ts` 守卫——影响所有请求与所有路由。
- 修改硬编码的生产回退地址 `http://43.140.214.49:3000/api`。
- 升级 vue-router 大版本（当前为 v5，guard 返回值/redirect 行为需回归验证）。
- 在 `eslint.config.js` 中新增规则豁免（历史豁免 `Navbar` 单词组件名已随组件在 UI 改版中删除，当前无生效豁免）。

### ❌ 禁止操作
- 新建独立的 axios 实例或直接用 `fetch` 调后端（会丢 token 与 401 刷新）。
- 把 token 存到 localStorage 以外的地方，或改动 `accessToken`/`refreshToken` 这两个键名（后端契约）。
- 提交 `.env`（仅 `.env.example` 入库）。
- 内部导航用 `<a href>`（整页刷新丢 SPA 状态）——一律 `<router-link>`。
- 绕过 `renderMarkdown()` 直接 `v-html` 未消毒内容。

## 测试要求

轻量单测：`tests/*.test.mjs`（node:test，直接 import `src/lib/` 的 .ts 纯函数，Node ≥22.18 类型剥离免编译）。lib 纯函数逻辑变更必须同步维护对应用例。

变更的验收标准：
1. `pnpm build` 通过（vue-tsc 严格类型检查，`noUnusedLocals`/`noUnusedParameters` 开启）。
2. `pnpm lint` 无新增错误（当前基线 0/0，保持）。
3. 涉及 `src/lib/` 纯函数的改动，`node --test tests/*.test.mjs` 全绿。
4. 涉及鉴权/路由的改动，浏览器手动验证：匿名可访问除 `/studio/*` 外所有页面且 侧栏显示「登录」；匿名进 `/studio/*` 被重定向 `/login` 并带 `redirect`；登录 → 回 `redirect` 来源页；退出 → 回 `/login` 且 localStorage 双 token 清空；token 过期 → 自动刷新无感继续（Network 面板可见 `/auth/refresh`）；刷新失败 → 静默登出留在当前页（侧栏变回「登录」）。

---
**版本**: v3.9（增量：生成台 `/studio/*` 登录墙（meta.requiresAuth 硬拦）、`pnpm dev:online` 代理联调、`tests/` node:test 轻量单测、OdSelect/reka-ui 约定、结构树补 Home/Studio/stores/lib 漂移修正）
**最后更新**: 2026-09-12

## 首页与共享外壳（2026-09 UI 改版）

- `App.vue` 为普通路由挂载 `components/layout/AppShell.vue`；登录、注册与 `/canvas/:id` 编辑器独立全屏。桌面侧栏固定，窄屏使用原生 dialog；每个页面内容区高度减去共享顶栏 64px。
- `HomePage.vue` 只组合 `Home/components/` 的 Hero、Composer 和 Features。图像/视频输入通过 `stores/studio.ts` 带入生成台；聊天草稿通过 `stores/launch.ts` 经 Agent 列表传入对话草稿，不放 URL，不自动提交请求。
- 提示词入口使用 `/studio/image?library=1`；生成台默认收起词库，显式入口展开。
- 已确认的原型存于 `design/archive/ui-refresh/`，仅作视觉参考，不参与应用编译。正式页面不得依赖原型的事件占位弹窗。
- 改版验证截图存 `results/`（ui-refresh/ui-prototypes），是验证产物不是源码，不参与应用编译。
