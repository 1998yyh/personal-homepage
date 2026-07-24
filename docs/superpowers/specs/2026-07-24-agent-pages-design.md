# Agent 页面设计文档

- **日期**: 2026-07-24
- **分支**: `feat/agent-page`（已合并 `origin/feature-kimi3`，前端栈为 Vue 3）
- **后端**: `tuanzi-server-base`（NestJS），Agent/会话/SSE 接口已全部就绪

## 1. 需求范围

实现 Agent 功能的完整前端：

1. **Agent 模型配置与管理**：创建、编辑、删除、列表（对应后端 `agents` 模块 CRUD）
2. **Agent 对话**：SSE 流式聊天，工具调用过程实时展示
3. **会话管理**：会话创建、列表、删除、消息历史分页

## 2. 后端接口契约（已存在，前端对齐即可）

### Agent CRUD（`/api/agents`，JWT）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/agents` | 创建 Agent |
| GET | `/agents?page=&limit=` | 分页列表（仅当前用户启用中的） |
| GET | `/agents/:id` | 详情（apiKey 脱敏为后 4 位 `apiKeyMasked`） |
| PATCH | `/agents/:id` | 更新（apiKey 不传则保持原值） |
| DELETE | `/agents/:id` | 软删除（is_active=false） |

**CreateAgentDto 关键字段**：`name`(必填) / `description` / `provider`(枚举 `anthropic|openai|deepseek`，deepseek 后端暂未支持) / `model`(必填) / `apiKey`(必填) / `systemPrompt` / `maxTokens`(默认 4096，1-200000) / `maxIterations`(默认 10，1-50) / `enabledTools`(内置工具名数组，如 `web_search`) / `mcpServers`(数组，stdio 仅管理员)。

### 会话与消息（JWT）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/agents/:agentId/conversations` | 创建会话（title 可选，缺省取首条消息前 30 字） |
| GET | `/agents/:agentId/conversations?page=&limit=` | 会话分页列表 |
| DELETE | `/conversations/:id` | 删除会话（级联消息与 checkpoint） |
| GET | `/conversations/:id/messages?page=&limit=` | 消息历史分页 |
| POST | `/conversations/:id/messages?stream=true` | 发送消息，SSE 流式响应 |

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

## 3. 页面结构（已与用户确认：两个页面）

| 路由 | 页面 | 职责 |
|---|---|---|
| `/agents` | `AgentsPage.vue` | Agent 卡片列表 + 新建/编辑/删除（弹窗表单） |
| `/agents/:id` | `AgentChatPage.vue` | 左侧会话列表 + 右侧聊天窗口 |

Navbar `navItems` 增加：`{ path: '/agents', label: 'Agent', emoji: '🧠', activePattern: /\/agents/ }`。

## 4. 文件结构

```
src/
├── types/agent.ts                    # Agent/Conversation/Message/SSE 事件类型
├── lib/agents-api.ts                 # agents + conversations REST 接口（共享 axios 实例）
├── composables/
│   └── useAgentStream.ts             # SSE 流式对话 composable
└── pages/
    └── Agents/
        ├── AgentsPage.vue            # 管理页
        ├── AgentChatPage.vue         # 聊天页
        └── components/
            ├── AgentFormModal.vue    # 创建/编辑表单弹窗（简易+高级折叠）
            ├── ConversationList.vue  # 会话侧边栏
            ├── MessageBubble.vue     # 消息气泡（user/assistant）
            └── ToolCallCard.vue      # 工具调用卡片（实时+可折叠）
```

## 5. 技术方案（已与用户确认）

- **数据管理**：Agent 列表、会话列表、消息历史走 vue-query（`useQuery`/`useMutation`），与 DailyReports 模块一致
- **SSE 实现**：axios `onDownloadProgress` 增量解析 XHR 响应文本——token 注入与 401 刷新白嫖现有拦截器，不违反 CLAUDE.md「禁止裸 fetch」禁令
- **流式临时状态**：组件内 `ref`，不进 vue-query 缓存；`message_end` 后 `invalidateQueries` 消息列表归位
- **markdown 渲染**：assistant 消息走 `src/lib/markdown.ts` 的 `renderMarkdown()`（`html: false` 防注入）
- **零新增依赖**，不新增 Pinia store

## 6. Agent 表单（已与用户确认：简易+高级折叠）

- **简易区（默认展开）**：名称、描述、provider（下拉，禁用 deepseek 并标注"暂未支持"）、模型名称、apiKey、系统提示词
- **高级区（默认折叠）**：maxTokens、maxIterations、内置工具勾选（web_search）、MCP Server 配置（sse 模式：名称+URL；stdio 模式仅管理员可见）
- 编辑时 apiKey 留空表示不修改（后端契约）；详情返回的 `apiKeyMasked` 仅作展示占位

## 7. 聊天页交互

- 进入 `/agents/:id` → 左栏加载会话列表，自动选中最近一个（`watch + immediate: true`，遵循 CLAUDE.md 规范）；无会话显示空状态引导新建
- 选中会话 → 加载消息历史（分页倒序，顶部"加载更多"）
- 发送 → 本地立即插入 user 气泡 + 临时 assistant 气泡开始流式渲染
- 工具调用卡片实时插入文本流，默认折叠显示 `🔧 <工具名> 调用中...`，点击展开看入参/结果
- `streaming` 状态禁用输入框与发送按钮（后端串行约束）
- 切换会话/离开页面时 `AbortController` 中断流

## 8. useAgentStream 状态机

```
idle ──发送──▶ streaming ──message_end──▶ done → invalidate messages → idle
                 │
                 └──error 事件/断流──▶ error（保留已生成文本，可重试）
```

解析逻辑：`onDownloadProgress` 取 `xhr.responseText` 全量文本，记录已消费偏移量，buffer 按 `\n\n` 切事件、按 `event:`/`data:` 行解析后 `JSON.parse`。

临时 assistant 消息结构：`{ text: string, toolCalls: Array<{ id, name, args, content?, status: 'running'|'done' }> }`（`tool_result.callId` 回填对应 `id` 的卡片）。`message_end` 以后端重建的 content/toolCalls 为最终准绳，修正临时消息的拼接误差。

## 9. 错误处理

| 场景 | 处理 |
|---|---|
| 发送时 401 | axios 拦截器自动刷新 token 重放 |
| 流中途 error 事件/断流 | 临时气泡标红"执行异常，请重试"，保留已生成文本，允许重发 |
| Agent 已停用（410） | 提示并禁用输入框 |
| 表单校验失败（400） | 弹窗内 `.error-message` 展示后端 message |

## 10. 验收标准（项目无测试框架）

1. `pnpm build` 通过（vue-tsc 严格类型检查）
2. `pnpm lint` 无新增错误（基线 0/0）
3. 浏览器手动验证：Agent CRUD → 创建会话 → SSE 流式对话（含工具调用展示）→ 会话删除 → 历史分页加载
