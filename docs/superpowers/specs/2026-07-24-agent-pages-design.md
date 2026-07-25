# Agent 页面设计文档

- **日期**: 2026-07-24（经 grilling 评审后修订）
- **分支**: `feat/agent-page`（已合并 `origin/feature-kimi3`，前端栈为 Vue 3）
- **后端**: `tuanzi-server-base`（NestJS），Agent/会话/SSE 接口已就绪
- ⚠️ **前置依赖**：本前端依赖后端三项配套变更先落地，详见
  `tuanzi-server-base/docs/plans/2026-07-24-agent-backend-adjustments.md`：
  ① 消息历史 DESC 分页；② SSE 模式 user 消息落库时机后移；③ messages 表新增 `total_tokens` 列

## 1. 需求范围

实现 Agent 功能的完整前端：

1. **Agent 模型配置与管理**：创建、编辑、删除、列表（对应后端 `agents` 模块 CRUD）
2. **Agent 对话**：SSE 流式聊天，工具调用过程实时展示
3. **会话管理**：会话懒创建、列表、删除、消息历史分页

## 2. 后端接口契约（含待落地变更标注）

### Agent CRUD（`/api/agents`，JWT）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/agents` | 创建 Agent |
| GET | `/agents?page=&limit=` | 分页列表（仅当前用户启用中的） |
| GET | `/agents/:id` | 详情（apiKey 脱敏为后 4 位 `apiKeyMasked`） |
| PATCH | `/agents/:id` | 更新（apiKey 不传则保持原值） |
| DELETE | `/agents/:id` | 软删除（is_active=false） |

**CreateAgentDto 关键字段**：`name`(必填) / `description` / `provider`(枚举 `anthropic|openai|deepseek`，deepseek 后端暂未支持) / `model`(必填) / `apiKey`(必填) / `systemPrompt` / `maxTokens`(默认 4096，1-200000) / `maxIterations`(默认 10，1-50) / `enabledTools`(内置工具名数组) / `mcpServers`(v1 前端不暴露，见 §11)。

**内置工具清单**（后端 `tool-registry.service.ts` 注册，**无工具列表接口**，前端硬编码映射）：

| name | 前端展示名 | 说明 |
|---|---|---|
| `web_search` | 联网搜索 | 需后端配置搜索 API |
| `calculator` | 计算器 | 纯本地安全求值（递归下降解析，非 eval），弥补 LLM 算数弱项 |

### 会话与消息（JWT）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/agents/:agentId/conversations` | 创建会话（title 可选，缺省由首条消息前 30 字回填） |
| GET | `/agents/:agentId/conversations?page=&limit=` | 会话分页列表（updatedAt DESC） |
| DELETE | `/conversations/:id` | 删除会话（级联消息与 checkpoint） |
| GET | `/conversations/:id/messages?page=&limit=` | 消息历史分页 ⚠️**依赖后端变更①：DESC 分页（最新在前）**；响应含 `totalTokens` ⚠️**依赖变更③** |
| POST | `/conversations/:id/messages?stream=true` | 发送消息，SSE 流式响应 ⚠️**依赖变更②：流异常时展示层零残留** |

**串行约束**：同一会话必须串行发消息，收到 `message_end` 前禁止发下一条。

**SSE 事件序列**：

```
message_start → [text_delta]* → [tool_use → tool_result]* → message_end
                                                            ↘ error（异常时，随后关流）
```

事件格式：`event: <type>\ndata: <json>\n\n`。data 形状（已核对 `agent-executor.service.ts` 的 `mapToSseEvent`）：

- `message_start → { role: 'assistant' }`
- `text_delta → { text: string }`
- `tool_use → { id: string, name: string, args: Record<string, unknown> }`
- `tool_result → { callId: string, name: string, content: string }`（`callId` 对应 `tool_use` 的 `id`）
- `message_end → { content: string, toolCalls: Array<{ id, name, args }> | null, totalTokens: number }`（以后端重建的最终消息为准；text_delta/tool_use 仅用于实时展示）
- `error → { message: string }`

**历史消息实体**（`GET /conversations/:id/messages` 返回）：

```ts
{
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls: Array<{ id: string; name: string; args: Record<string, unknown> }> | null; // 仅 assistant
  toolCallId: string | null;   // 仅 tool，关联 assistant.toolCalls[].id
  totalTokens: number | null;  // 仅 assistant（后端变更③；存量数据为 NULL）
  createdAt: string;
}
```

### 用户信息

`GET /auth/profile` 返回完整用户实体（除 password），**含 `role: 'admin' | 'user'`**——前端 `src/lib/api.ts` 的 `User` interface 需补 `role` 字段（后端零改动）。

## 3. 页面结构（两个页面）

| 路由 | 页面 | 职责 |
|---|---|---|
| `/agents` | `AgentsPage.vue` | Agent 卡片列表 + 新建/编辑/删除（弹窗表单） |
| `/agents/:id` | `AgentChatPage.vue` | 左侧会话列表 + 右侧聊天窗口；选中会话同步到 `?c=<conversationId>` |

Navbar `navItems` 增加：`{ path: '/agents', label: 'Agent', emoji: '🧠', activePattern: /\/agents/ }`。

**会话 URL 同步**（`?c=` 查询参数）：

- 选中会话 → `router.replace({ query: { c: id } })`（不发请求，不产生冗余历史记录）
- 进入页面 → 优先读 `route.query.c` 定位会话；无则回落到"自动选最近"
- 收益：刷新不丢选中态、前进/后退可用、链接可分享/收藏

## 4. 文件结构

```
src/
├── types/agent.ts                    # Agent/Conversation/Message/SSE 事件类型
├── lib/agents-api.ts                 # agents + conversations REST 接口（共享 axios 实例）
│                                     #   分页常量定义在此文件顶部：AGENTS_LIMIT=100 / CONVS_LIMIT=20 / MSGS_LIMIT=30
├── composables/
│   └── useAgentStream.ts             # SSE 流式对话 composable
└── pages/
    └── Agents/
        ├── AgentsPage.vue            # 管理页
        ├── AgentChatPage.vue         # 聊天页
        ├── utils/
        │   └── groupMessages.ts      # 历史消息归组纯函数（见 §7）
        └── components/
            ├── AgentFormModal.vue    # 创建/编辑表单弹窗（简易+高级折叠）
            ├── ConversationList.vue  # 会话侧边栏
            ├── MessageBubble.vue     # 消息气泡（user/assistant）
            └── ToolCallCard.vue      # 工具调用卡片（实时流式与历史渲染共用）
```

## 5. 技术方案

- **数据管理**：Agent 列表、会话列表、消息历史走 vue-query（`useQuery`/`useMutation`），与 DailyReports 模块一致
- **SSE 实现**：axios `onDownloadProgress` 增量解析 XHR 响应文本——token 注入与 401 刷新白嫖现有拦截器，不违反 CLAUDE.md「禁止裸 fetch」禁令
- **流式临时状态**：组件内 `ref`，不进 vue-query 缓存；`message_end` 后 `invalidateQueries` 消息列表归位
- **流式 markdown 渲染**：每个 `text_delta` 累积进临时消息的 `text`，用 `requestAnimationFrame` 节流重渲 `renderMarkdown()`（markdown-it 对未闭合围栏/加粗有容错，视觉可接受；防高频 delta 刷爆渲染队列）
- **markdown 渲染**：assistant 消息走 `src/lib/markdown.ts` 的 `renderMarkdown()`（`html: false` 防注入）
- **零新增依赖**，不新增 Pinia store

## 6. Agent 表单（简易+高级折叠）

- **简易区（默认展开）**：
  - 名称、描述（textarea）
  - provider（下拉，禁用 deepseek 并标注"暂未支持"）
  - 模型名称：**自由文本输入**，placeholder 随 provider 联动（anthropic → `claude-sonnet-5` 等示例；openai → `gpt-5` 等示例）——不硬编码模型名单，避免过期
  - apiKey、系统提示词（textarea）
- **高级区（默认折叠）**：
  - maxTokens、maxIterations
  - 内置工具勾选：`web_search`（联网搜索）、`calculator`（计算器）——工具清单硬编码于前端（后端无列表接口）
  - ~~MCP Server 配置~~ → **v1 砍掉，移入 §11 v2 待办**
- 编辑时 apiKey 留空表示不修改（后端契约）；详情返回的 `apiKeyMasked` 仅作展示占位

## 7. 聊天页交互

### 会话列表（左栏）

- `limit=20`，滚动到底部"加载更多"（`page+1`）
- 进入 `/agents/:id` → 加载会话列表；优先按 `route.query.c` 选中，无则自动选最近一个（`watch + immediate: true`，遵循 CLAUDE.md 规范）；无会话显示空状态引导新建

### 新建会话：懒创建

- 点"新建会话"**不调接口**，本地进入草稿态（`selectedConversation = null` + 清空聊天区）
- 用户发出首条消息时才 `POST /agents/:id/conversations` 拿真实 id，随后发消息
- 收益：会话列表里永远只有"至少说过一句话"的真会话，无空标题僵尸会话

### 消息历史

- `limit=30` 每页；后端 DESC 分页（变更①），`page=1` 为最新 30 条，前端 `reverse()` 后正序渲染在底部
- 向上滚动/"加载更多"→ `page+1`，往顶部 prepend；`hasMore = page < totalPages`

### 历史消息归组（`groupMessages.ts`）

历史与实时流是两套数据结构，统一归组后喂给同一套组件：

- assistant 消息带 `toolCalls` → 按 `toolCallId` 从同批消息中捞出对应 `role='tool'` 消息，组装成 ToolCallCard（`status='done'`，默认折叠）
- `role='tool'` 消息**不单独渲染气泡**
- 输出统一渲染模型（消息 + 内联工具卡片的序列），实时流式与历史渲染共用 ToolCallCard 组件

### 发送与流式

- 发送 → 本地立即插入 user 气泡 + 临时 assistant 气泡开始流式渲染
- 工具调用卡片实时插入文本流，默认折叠显示 `🔧 <工具名> 调用中...`，点击展开看入参/结果
- `streaming` 状态禁用输入框与发送按钮（后端串行约束）
- 切换会话/离开页面时 `AbortController` 中断流
- assistant 气泡底部小灰字展示 `totalTokens`（如 `1,234 tokens`）；历史消息该字段为 NULL（存量数据）则不展示

### 删除会话

1. 任何删除先弹确认（"删除后消息记录不可恢复"）
2. 删的是当前选中会话 → 先 `AbortController` 断流、清临时流式状态，再发 DELETE
3. 删除成功后自动选中剩下的最近一个会话（同步 `?c=`），没了则显示空状态

## 8. useAgentStream 状态机

```
idle ──发送──▶ streaming ──message_end──▶ done → invalidate messages → idle
                 │
                 └──error 事件/断流──▶ error（保留已生成文本，可重试）
```

解析逻辑：`onDownloadProgress` 取 `xhr.responseText` 全量文本，记录已消费偏移量，buffer 按 `\n\n` 切事件、按 `event:`/`data:` 行解析后 `JSON.parse`。

临时 assistant 消息结构：`{ text: string, toolCalls: Array<{ id, name, args, content?, status: 'running'|'done' }> }`（`tool_result.callId` 回填对应 `id` 的卡片）。`message_end` 以后端重建的 content/toolCalls 为最终准绳，修正临时消息的拼接误差。

**重试语义**（依赖后端变更②）：error 状态下展示"重试"按钮 → **原样重发同一 content**。因 user 消息落库时机已后移到流正常结束，重发不会产生重复消息。

## 9. 错误处理

| 场景 | 处理 |
|---|---|
| 发送时 401 | axios 拦截器自动刷新 token 重放 |
| 流中途 error 事件/断流 | 临时气泡标红"执行异常，请重试"，保留已生成文本，"重试"按钮原样重发同一 content（后端变更②保证不产生重复消息） |
| Agent 已停用（410） | 提示并禁用输入框 |
| 表单校验失败（400） | 弹窗内 `.error-message` 展示后端 message |

## 10. 非管理员 MCP stdio 禁用态（v1 预留判断逻辑）

v1 表单不含 MCP 配置 UI（见 §11），但 `User.role` 字段补齐与 `isAdmin` 计算属性**现在就做**（改动一行类型 + 一行派生），v2 加 MCP 表单时直接使用：

- `src/lib/api.ts` 的 `User` interface 补 `role: 'admin' | 'user'`
- v2 的 stdio 选项形态已定：**显示但禁用** + 文案"仅管理员可配置（服务端将执行子进程）"（后端 `agents.service.ts` 也会对非管理员 stdio 配置返回 403）

## 11. v2 待办（明确砍出 v1 范围）

- **MCP Server 配置 UI**：动态增删列表（sse：名称+URL；stdio：command+args，管理员禁用态按 §10）——后端字段可选，v1 不传即可；等真有要接的 MCP Server 再做，需求具体了表单反而设计得更准
- **deepseek provider**：等后端支持后放开下拉禁用
- **会话级/Agent 级 token 聚合展示**：需后端聚合接口，暂不做

## 12. 验收标准（项目无测试框架）

1. `pnpm build` 通过（vue-tsc 严格类型检查）
2. `pnpm lint` 无新增错误（基线 0/0）
3. **后端三项变更已落地并验证**（见文档头部前置依赖）
4. 浏览器手动验证：
   - Agent CRUD（含双工具勾选、provider 切换 placeholder、编辑时 apiKey 留空保持）
   - 懒创建会话 → 发首条消息 → 列表出现带标题会话
   - SSE 流式对话（工具调用卡片实时展示、token 数展示、刷新后历史卡片正确归组渲染）
   - 流中途异常 → 重试 → 历史无重复 user 消息
   - 会话切换 `?c=` 同步、刷新后选中态保持
   - 删除当前会话（确认弹窗 → 断流 → 降级选中）
   - 消息历史向上翻页加载到最早一条
   - 退出登录回 `/login`（`logout()` + 显式 `router.push`）
