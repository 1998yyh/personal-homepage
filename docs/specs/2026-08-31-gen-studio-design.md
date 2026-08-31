# 生成台（Gen Studio）设计 spec

> 来源：`.scratch/gen-studio/` wayfinder 地图收敛。
> 决策底座：[01-charting-consensus](../../.scratch/gen-studio/issues/01-charting-consensus.md)（十一项奠基决策）+ [02-ui-prototype](../../.scratch/gen-studio/issues/02-ui-prototype.md)（变体 A 定稿画面）。
> 关联 ADR：[0002 登录墙](../adr/0002-studio-login-wall.md)、[0003 shadcn-vue 组件层](../adr/0003-shadcn-vue-component-layer.md)。

## 问题陈述

用户当前想用「团子后台」的 AI 生成能力（图片 / 视频 / 音频），只能进画布平台，在节点里配置生成——这套流程为「编排创作」设计，节点、连线、配置抽屉一大套，对「我就想快速出一张图 / 一段视频 / 一段配音」的即时需求太重。用户缺一个**表单驱动的快速出活入口**：选模型、写提示词、调几个参数、点生成、看结果、存素材，一条直线走完，不碰画布的编排心智。

## 解决方案

新增独立主板块「生成台」（Navbar 第 9 项，路由 `/studio/*`），表单驱动、快速出活，与画布互补（画布管编排创作，生成台管快速出活），底层复用同一套后端 generation API，不重复造轮子。

板块含四个视图，合于单页顶部 Tab 切换：**图片台 / 视频台 / 音频台**三个能力子页（左表单 + 右本能力结果流），外加**任务历史**（跨能力全量管理：状态过滤 / 重试 / 存素材）。图片、音频同步返回即出结果，视频为异步任务、结果流中原地轮询至终态。生成结果一键存入素材库，提示词可从提示词库引用填入。

生成台是**全站第一条需登录路由**：匿名访问 `/studio/*` 被守卫硬拦、重定向登录页并带 redirect 回跳（见 ADR 0002）。表单下拉控件引入全站第一个第三方组件层 shadcn-vue（reka-ui 底座，见 ADR 0003）。

## 用户故事

### 入口与鉴权

1. 作为已登录用户，我想在 Navbar 看到「生成台」入口（第 9 项），以便快速进入快速出活工作台。
2. 作为匿名用户，我想在访问 `/studio/*` 任一页时被引导去登录，以便知道这块需要登录才能用（全站唯一登录墙）。
3. 作为匿名用户，我在被重定向到登录页后，登录成功能自动回跳到我原本要去的生成台页，以便不丢失操作意图。
4. 作为用户，我想在四个视图（图片台 / 视频台 / 音频台 / 任务历史）间用顶部 Tab 切换，以便在一个页面内完成全部生成与管理。

### 图片台

5. 作为用户，我想在图片台选择一个图片能力的模型，以便用指定渠道模型生成。
6. 作为用户，我想在模型下拉里只看到「启用中的渠道」下「capability=image」的模型，以便不误选到不支持图片的模型。
7. 作为用户，我想填写提示词描述想要的画面，以便驱动生成。
8. 作为用户，我想设置图片尺寸（auto / 1024x1024 / 1536x1024 / 1024x1536）与质量（low / medium / high），以便控制产出规格。
9. 作为用户，我想上传本地参考图或从素材库选参考图（图生图），以便基于已有图片生成。
10. 作为用户，我想点「生成」后在右侧结果流即时看到产出的图片（同步返回），以便马上评估效果。

### 视频台

11. 作为用户，我想在视频台选视频模型、填提示词，并设置时长（默认 / 自动 / 5 / 8 / 10 / 15 秒）、尺寸（16:9 / 9:16 等）、画质（480p / 720p / 1080p），以便控制视频规格。
12. 作为用户，我想上传或从素材库选参考图（图生视频），以便基于图片生成视频。
13. 作为用户，我想点「生成」后在结果流看到一张 pending 卡片并原地轮询进度，以便无需刷新就能等到视频出炉（视频为异步任务）。
14. 作为用户，我想在视频生成失败时看到失败态与错误信息，以便判断是否重试。

### 音频台

15. 作为用户，我想在音频台选音频模型、填文本，并设置嗓音（alloy / nova / …）、格式（mp3 / wav / …）、语速，以便生成想要的配音。
16. 作为用户，我想点「生成」后即时听到产出的音频（同步返回，波形/播放器展示），以便马上试听。

### 结果与联动

17. 作为用户，我想在任一子页的结果卡片上，把成功的产出「一键存为素材」，以便沉淀进素材库复用。
18. 作为用户，我想从提示词库搜一条提示词填入当前 prompt 输入框，以便复用沉淀的提示词。
19. 作为用户，我想在结果卡片看到用的模型与关键参数摘要，以便回溯这次生成的配置。

### 任务历史

20. 作为用户，我想在任务历史看到跨三种能力的全部生成任务列表（时间 / 能力 / 模型 / 提示词 / 状态），以便统一回顾。
21. 作为用户，我想按状态过滤历史（全部 / 进行中 / 已完成 / 失败），以便聚焦我关心的那批。
22. 作为用户，我想对失败的历史任务「同参数重试」，以便一键重发不用重填表单。
23. 作为用户，我想对成功的历史任务「存为素材」，以便在历史页也能沉淀产出。

## 实现决策

### 路由与守卫（⚠️ 动全局守卫，01 已获用户批准）

- 新增路由：`/studio`（重定向到 `/studio/image`）、`/studio/:capability`（capability ∈ image/video/audio）、`/studio/history`。四视图合于单页 Tab，`:capability` 驱动当前子页；或单页内 Tab state（二选一，实现时定，倾向路由驱动以便分享/回跳直达）。
- **登录墙**：给 `/studio/*` 路由挂 `meta: { requiresAuth: true }`。`router.beforeEach` 现有守卫在 `fetchProfile` 之后新增分支：`to.meta.requiresAuth && !auth.isAuthenticated` → `return { path: '/login', query: { redirect: to.fullPath } }`。这是全站首条 `requiresAuth` 路由，守卫从「纯公开」升级为「按 meta 选择性拦截」，其余路由不受影响（无 meta = 公开）。详见 ADR 0002。
- 登录页需支持 `redirect` query 回跳（若现有登录逻辑未处理 redirect，需补：登录成功后 `router.replace(redirect ?? '/')`）——实现时核对 LoginPage 现状。

### 页面结构与组件拆分

- `pages/Studio/StudioPage.vue`：板块壳，顶部子页 Tab（图片/视频/音频/历史）+ 按 capability 渲染对应子页。沿用变体 A 定稿骨架。
- 三个能力子页复用一个 `StudioGeneratePane.vue`（左表单 + 右结果流），按 capability prop 差异化表单参数区与结果卡片形态——避免三份重复（DRY）。
- `components/GenerationForm.vue`：左表单（模型二级选择器 + 提示词 + 能力参数 + 参考图 + 生成钮）。
- `components/ResultStream.vue` + `ResultCard.vue`：右结果流网格，卡片三态（图片方形 / 视频 aspect-video + 播放 / 音频波形），pending/processing 骨架，hover 操作（重试 / 存素材）。
- `pages/Studio/StudioHistoryPage.vue`：filter chips + 全宽表格。
- `components/PromptLibraryPicker.vue`：提示词库引用弹层（搜一条填入）。
- `components/ReferencePicker.vue`：参考图双来源（本地上传 / 素材库选），一律先落 media 拿 mediaId。

### API 映射（全部现成，后端零改动）

- 图片：`generationApi.generateImage(payload)` → `{ task, media: MediaFileView[] }`（同步）。
- 视频：`generationApi.generateVideo(payload)` → `{ task }`（异步，轮询 `getTask`）。
- 音频：`generationApi.generateAudio(payload)` → `{ task, media: MediaFileView }`（同步）。
- 历史：`generationApi.listTasks({ page, limit, capability?, status? })` → 分页 `{ items, total, page, limit, totalPages }`。
- 单任务轮询：`generationApi.getTask(id)` → `GenerationTaskView`。
- 存素材：`assetsApi.create({ mediaId: task.resultMediaId })`（纯前端闭环，`Asset.mediaId` 现成）。
- 提示词引用：`promptsApi` 现有搜索/列表接口取一条填入。
- 参考图上传：`mediaApi` 上传拿 mediaId → 经 `referenceMediaIds: string[]` 传入 payload；媒体 URL 一律过 `mediaUrl()`。
- 重试：同参数重发对应 `generate*`（`generationApi` 无 deleteTask，历史无删除；重试 = 同参数重发）。

### 模型选择器与参数枚举（照抄画布，DRY）

- 模型二级选择器：`modelRef = "channelId::modelName"`，组装复用 `channels-api.ts` 现成 `toModelRef(channelId, modelName)`。过滤逻辑（`channels.filter(isActive).flatMap(models.filter(capability===cap))`）画布内联在 `NodeConfigContent.vue`，本板块照抄为可复用函数。
- 参数枚举常量照抄 `NodeConfigContent.vue`：`IMAGE_SIZES`/`IMAGE_QUALITIES`/`VIDEO_SIZES`/`VIDEO_SECONDS`/`VIDEO_QUALITIES`/`AUDIO_VOICES`/`AUDIO_FORMATS`（值见该文件 28-46 行）。注意 payload 所有参数字段均为 `string`（含 seconds/speed）。
- **不上表单**：`count`（多变体，01 弃用，固定单发）、`nodeRef`（画布专用，生成台不传）。

### 视频异步轮询方案

- 画布的 `useGenerationTaskWatcher` 绑死 canvas store + node metadata，**不可直接复用**；生成台自建轻量 watcher，照抄其模式：2s 间隔 `setInterval`、`TERMINAL_STATUSES` Set（succeeded/failed/cancelled）、`polling` 并发锁、`onBeforeUnmount` 清 timer。
- 结果流中的 pending 视频卡片持有 `taskId`，轮询 `getTask` 至终态后用返回的 `resultMedia` 就地替换为播放器（失败态显 `error`）。

## 测试决策

**维持项目惯例：无自动化测试（CLAUDE.md「本项目没有测试套件」）。** 生成台本质是纯 UI 板块（表单 + 结果流 + 轮询），其逻辑层极薄——`modelRef` 拆合已有 `toModelRef`、能力过滤是单行 filter、参数→payload 是对象拼装、轮询终态是一次 Set 查询。这些正确性靠 `vue-tsc` strict 类型 + 肉眼审 + 一次浏览器验证即可锁死；为一个 UI 板块引项目首个测试框架不划算（YAGNI）。判据：正确性能靠「类型 + 肉眼 + 一次手动」确认的，不测。

（注：项目里真正值得测的是 Agents 流式竞态 / canvas 状态机 / `lib/canvas/` 纯函数这类「有状态·协议·时序·出过 bug」的硬骨头——不在本 spec 范围，此处仅记录判据来由。）

### 验收标准

1. `pnpm build` 通过（vue-tsc 严格类型检查，`noUnusedLocals`/`noUnusedParameters` 开启）。
2. `pnpm lint` 无新增错误（基线 0/0 保持）。
3. 浏览器手动验收清单：
   - **登录墙**：匿名访问 `/studio/image` → 跳登录页且带 `?redirect=/studio/image`；登录成功 → 自动回跳该页；已登录直接访问 → 正常进入。
   - **三子页表单**：模型下拉只列启用中渠道的对应能力模型；参数枚举与画布一致；参考图上传/素材库选可拿到 mediaId。
   - **同步出活**：图片/音频点生成 → 结果流即时出卡片。
   - **异步轮询**：视频点生成 → pending 卡片原地轮询 → 终态替换为播放器 / 失败态显错误；离开页面 timer 清理无泄漏。
   - **联动**：结果「存为素材」→ 素材库可见；提示词库搜一条能填入 prompt。
   - **历史页**：跨能力任务列出；状态 filter 生效；失败重试同参数重发；成功存素材。
   - **亮暗主题**：下拉（shadcn-vue）与全表单在亮/暗主题下均正常（不写死暗色假设）。

## 范围之外

- **任务删除/清理**：`generationApi` 无 deleteTask 端点，历史管理不含删除；重试 = 同参数重发。若要删除需后端加端点。
- **批量/多变体**：`count` 字段后端现成，本批固定单发，不上表单。
- **生成结果送画布**：`nodeRef` 字段现成，本批不做「结果送画布」联动。
- **从生成历史选参考图**：参考图只支持本地上传 + 素材库，不做「从历史选」。
- **用量/成本可见性**：生成烧渠道额度，本批不给用户看用量/次数。
- **画布平台自身改动**：生成台复用同一套 generation API，不动画布。
- **后端新增端点**：一切以前端现有 API 为约束。

## 补充说明

- 原型 `pages/StudioPrototype/` + `components/PrototypeSwitcher.vue` + 路由 `/studio-prototype` 是用完即弃的粗原型，**正式实现落地后一并删除**（含 router 里的 PROTOTYPE 注释行）。
- 设计语言沿用 `index.css` 现有 `od-*` 组件类与设计令牌，亮暗主题随 `data-theme` 自动切换，不发明新风格、不写死暗色假设。
- 组件层 shadcn-vue（reka-ui）为全站首次引入第三方组件库，落地细节（依赖引入、`components/ui/` 目录、od-* 令牌接入）见 ADR 0003。
