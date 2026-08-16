---
name: verify
description: 本项目的运行时验证配方（无测试框架）：dev server + mock API + Playwright MCP 驱动真实页面
---

# 验证配方（personal-homepage）

无测试框架；`pnpm build` / `pnpm lint` 只是 CI 式检查，运行时验证按下面来。

## 启动

1. `pnpm dev`（5173 常被占用时 vite 会自动换端口，看输出里的实际端口）。
2. 后端：默认 `.env` 指向 `localhost:3000`（用户本地 tuanzi-server-base）。如需隔离后端或验证流式等特定链路，用 `VITE_API_URL=http://localhost:3100/api pnpm dev` 指向 mock。

## Mock API（Agents 聊天链路）

`node scripts/mock-agent-api.mjs`（:3100）：覆盖 auth/profile、agent 详情、会话/消息列表、**SSE 滴送流式**（80ms×7字符），POST 后把消息并入后续 GET（模拟落库）。改流式/消息渲染代码时用它驱动 `/agents/agent-1?c=conv-1`。

## 驱动（Playwright MCP）

- 免登录：`page.evaluate` 写 `localStorage.accessToken/refreshToken`（任意值），再导航目标页（守卫的 fetchProfile 走 mock）。
- 流式观测：采样 `.markdown-content.chat-md` 气泡数 / textContent 长度 / `.md-block` 数（流式中块数增长=增量渲染在工作；流结束块数归 0=整文重渲 swap）。
- DOM 稳定性探针：`window.__x = el` 存块节点引用，几秒后查 `isConnected`（false 说明冻结块被重建，性能回归）。
- 已知陷阱：**axios `onDownloadProgress` 被节流到 3 次/秒且延迟调用的 `event.currentTarget` 为 null**，读响应文本必须用 `event.target`（见 CLAUDE.md「流式渲染」节）。

## 验收基线

- `pnpm build`（vue-tsc strict）+ `pnpm lint`（基线 0/0）必须通过。
- 鉴权/路由改动需浏览器手动验证（清单见 CLAUDE.md「测试要求」）。
