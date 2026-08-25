# Personal Homepage - Web Tools Frontend

个人主页前端，包含登录注册、AI/股票日报阅读与开发工具箱，连接 Web Tools 后台 API。

## 技术栈

- **框架**: Vue 3 + TypeScript + Vite
- **样式**: Tailwind CSS v4（`@theme` 定义于 `src/index.css`）
- **路由**: vue-router
- **状态管理**: Pinia + Vue Query（@tanstack/vue-query）
- **HTTP 客户端**: Axios
- **Markdown 渲染**: markdown-it

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置后端 API 地址
```

### 3. 启动开发服务器

```bash
pnpm dev          # 连本地后端（.env 里的 VITE_API_URL，默认 localhost:3000）
pnpm dev:online   # 直连线上后端：加载 .env.online，由 Vite 代理 /api 与 /uploads 到线上，规避 CORS
```

访问 http://localhost:5173

## 功能特性

### 🔐 认证系统
- 用户注册（邮箱、用户名、密码）
- 用户登录（支持邮箱或用户名）
- JWT Token 自动刷新
- 登录状态持久化

### 📰 日报阅读
- AI 日报与股票日报列表
- markdown-it 渲染（卡片式排版，禁用 raw HTML）

### 🧰 开发工具箱
- JSON、Base64、URL、时间戳、UUID、哈希等 11 个在线工具

### 🧠 Agent 对话
- Agent 配置管理（多供应商、自定义模型、API Key 加密存储）
- SSE 流式对话，工具调用（联网搜索/计算器）实时展示
- 会话懒创建、删除、历史消息分页加载、会话搜索过滤
- Kimi 式交互：智能滚动（上翻不吸底 + 回到底部悬浮钮）、「正在思考」占位、
  草稿态欢迎屏（建议问题 chips）、消息 hover 复制、发送后自动聚焦
- 设计文档见 `docs/superpowers/specs/2026-07-24-agent-pages-design.md`

### 🎨 设计特点
- 现代暗色玻璃态设计（Glassmorphism）
- 流畅的动画效果
- 响应式布局
- 自定义配色方案

## 项目结构

```
src/
├── main.ts                 # 应用入口
├── App.vue                 # 根组件
├── index.css               # 全局样式（Tailwind v4 @theme 主题令牌）
├── router/
│   └── index.ts            # 路由表与全局登录守卫
├── stores/
│   └── auth.ts             # Pinia 认证 store
├── lib/
│   ├── api.ts              # Axios 实例（Token 注入、401 自动刷新）
│   ├── daily-report-api.ts # 日报接口
│   └── markdown.ts         # markdown-it 封装
├── components/
│   └── Navbar.vue          # 顶部导航栏
├── pages/
│   ├── LoginPage.vue       # 登录页
│   ├── RegisterPage.vue    # 注册页
│   ├── HomePage.vue        # 首页（需登录）
│   ├── DailyReports/       # AI/股票日报
│   │   ├── AIReportsPage.vue
│   │   ├── StockReportsPage.vue
│   │   └── components/     # ReportList / ReportContent
│   └── DevTools/           # 开发工具箱
│       ├── DevToolsPage.vue
│       ├── components/     # ToolLayout
│       └── tools/          # 11 个工具 SFC
├── composables/
│   └── useAgentStream.ts   # SSE 流式对话（axios onDownloadProgress 增量解析）
├── pages（续）
│   └── Agents/             # Agent 管理与对话
│       ├── AgentsPage.vue      # Agent 卡片列表 + 表单弹窗
│       ├── AgentChatPage.vue   # 会话列表 + 流式聊天
│       ├── components/         # AgentFormModal / ConversationList / MessageBubble / ToolCallCard
│       └── utils/              # groupMessages（历史消息工具调用归组）
└── types/
    ├── daily-report.ts     # 日报类型定义
    └── agent.ts            # Agent/会话/消息/SSE 事件类型
```

## API 接口

前端连接以下后端接口：

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/profile | 获取用户信息 |
| POST | /api/auth/refresh | 刷新 Token |

## 构建生产版本

```bash
pnpm build
```

输出文件在 `dist/` 目录。

## 开发说明

### 后端要求

确保后端服务已启动并配置正确的 CORS：

```
CORS_ORIGINS=http://localhost:5173
```

### Token 管理

- AccessToken: 存储在 localStorage，有效期 2 小时
- RefreshToken: 存储在 localStorage，有效期 7 天
- 401 错误自动尝试刷新 Token

## License

ISC

本项目包含从 [infinite-canvas](https://github.com/basketikun/infinite-canvas)（AGPL-3.0）移植/改写的代码，相关文件头部有来源注释，详见根目录 [NOTICE](NOTICE)。
