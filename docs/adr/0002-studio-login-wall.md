# 生成台走守卫层 `meta.requiresAuth` 硬拦，成为全站首条需登录路由

生成台（`/studio/*`）是全站第一条需登录才能访问的路由。鉴权在 `router/index.ts` 的 `beforeEach` 全局守卫实现——给 `/studio/*` 挂 `meta: { requiresAuth: true }`，守卫在现有 `fetchProfile` 之后新增分支：`to.meta.requiresAuth && !auth.isAuthenticated` 时重定向 `/login` 并带 `query.redirect = to.fullPath`，登录成功回跳。依据：生成台烧渠道额度、产出落用户媒体库，是强用户态功能，与「全站公开、登录仅展示用户信息」的现状（2026-07-22 起）本质不同，必须挡在门外。守卫从「纯放行」升级为「按 meta 选择性拦截」，无 meta 的路由行为不变（仍公开），改动向后兼容。代价：守卫不再是「一律返回 true」的极简形态，多一处 meta 分支；且这是 CLAUDE.md 标记的 ⚠️ 类改动（动全局守卫影响所有路由），已获用户明确批准。

**Considered Options**：①组件内 `onMounted` 里判断未登录再跳——被否，守卫只在导航时触发、组件级拦截会闪一下未授权内容，且散落各页不如守卫集中。②全站强制登录——被否，与 2026-07 起「全站公开」定位冲突，只有生成台需要登录。③后端拦截返 401 靠拦截器跳转——被否，401 自动刷新链路是为 token 过期设计的，拿它兜「本就该登录」的场景会和刷新逻辑纠缠，语义不清。
