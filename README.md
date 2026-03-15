# Personal Homepage - Web Tools Frontend

现代化的登录注册前端界面，连接 Web Tools 后台 API。

## 技术栈

- **框架**: React 18 + TypeScript + Vite
- **样式**: Tailwind CSS
- **路由**: React Router v7
- **状态管理**: React Query + Context API
- **HTTP 客户端**: Axios

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
pnpm dev
```

访问 http://localhost:5173

## 功能特性

### 🔐 认证系统
- 用户注册（邮箱、用户名、密码）
- 用户登录（支持邮箱或用户名）
- JWT Token 自动刷新
- 登录状态持久化

### 🎨 设计特点
- 现代暗色玻璃态设计（Glassmorphism）
- 流畅的动画效果
- 响应式布局
- 自定义配色方案

## 项目结构

```
src/
├── main.tsx              # 应用入口
├── App.tsx               # 根组件（路由配置）
├── index.css             # 全局样式
├── components/
│   └── ProtectedRoute.tsx # 路由守卫
├── context/
│   └── AuthContext.tsx   # 认证上下文
├── lib/
│   └── api.ts            # API 服务
└── pages/
    ├── LoginPage.tsx     # 登录页
    ├── RegisterPage.tsx  # 注册页
    └── HomePage.tsx      # 首页（需登录）
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