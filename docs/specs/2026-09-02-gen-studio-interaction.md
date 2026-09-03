# 生成台交互优化方案

> 日期：2026-09-02
> 修订：
> - 2026-09-03 图片尺寸由 4 档扩为 8 档主流比例（见「图片尺寸」）
> - 2026-09-03 布局改为「左侧历史栏 + 主区当前结果 + 底部 composer」；**任务历史页取消**，历史即左侧缩略图栏
> 状态：已落地（2026-09-03）
> 前置：[2026-08-31 生成台设计 spec](./2026-08-31-gen-studio-design.md)（变体 A：左表单 + 右结果流）
> 范围：纯前端交互。不改后端、不新增生成能力、不换视觉语言（继续 `od-*` 令牌）。

## 问题陈述

生成台第一版按「表单驱动快速出活」落地：左栏 380px 填模型 / 提示词 / 尺寸 / 质量 / 参考图，右栏等一张被 `object-cover` 裁切的小卡片。能力做齐了，循环没做。

真正的使用路径是 **写一句 → 出一张 → 看清楚 → 改一句或拿结果当参考 → 再出一张**。当前实现把这条循环掐断：

- 切 Tab 用 `:key="activeTab"` 整树重挂，prompt、结果、进行中的视频全部归零
- 结果卡不能「再用这句 / 这组参数 / 当参考图」；卡片上的「重试」读的是当前表单，不是这张卡自己的参数
- `generating` 锁死主按钮，出图十几秒内工作台是死的
- 本页结果是内存数组，历史是另一张运维表格，刷新即空、点不开、回填不了
- prompt 只是侧栏里一个 `min-h-[96px]` 字段，和尺寸、质量视觉权重相同
- 参数直接甩 API 原值（`low` / `1024x1024` / `alloy`）；参考图文案写着「先落媒体库再引用」
- 操作藏在 hover 里，触屏不可用；没有灯箱、没有下载，只有「存素材」
- 页面 chrome 厚（eyebrow + 大标题 + Tab），真正的工作面被压到折线以下

第一版骨架（左表单 + 右小卡）决定了 prompt 永远是侧栏字段、结果永远是缩略图。继续打补丁解决不了。把历史做成第四个顶栏 Tab + 表格，等于把「回顾」和「再做一次」拆成两个世界。

## 解决方案

把生成台改成结果优先的工作台：**左侧是历史，主区是当前这一条，prompt 永远在手边。**

- 顶栏只留三个能力台：图片 / 视频 / 音频。**不再有「任务历史」页。**
- 左侧一条缩略图栏，一条生成记录一个 tab。点它：主区还原那次的结果，composer 还原那次的 prompt / 模型 / 参数 / 参考图。
- 点生成：始终在栏顶插入一条新记录并选中它，不覆盖上一条。迭代 = 点旧的 → 改一句 → 再生成 → 新 tab。
- 空态（当前能力还没有任何记录，或点了「新的一次」）：composer 在主区垂直居中。有选中记录后，结果占满主区，composer 沉底。

## 交互原则（验收标准）

1. **主区是当前这一条结果。** Prompt 是工具条，不是侧栏表单里的一个字段。
2. **历史就是左侧栏。** 没有单独的任务历史页。点缩略图 = 还原配置 + 结果。
3. **循环不断。** 切能力台再回来，选中项、composer、进行中的任务还在。
4. **先看清楚，再操作。** 主区媒体 `object-contain`，不被裁死；下载和存素材常驻，不藏 hover。
5. **生成不锁台。** 进行中仍可再发；新任务变成栏顶一条新缩略图。
6. **参数说人话。** `1024x1024` / `low` 换成比例图形和「草稿 / 标准 / 高清」。
7. **空态也是工作台。** 没选中记录时 prompt 居中当主角，不是「请去填左边」。

## 已拍板

1. **空态居中 prompt，有选中记录后 composer 沉底。**
2. **左侧缩略图栏取代任务历史页。** 顶栏不再出现「任务历史」；`/studio/history` 重定向到 `/studio/image`。
3. **栏内按当前能力过滤。** 图片台只列图片任务，视频 / 音频同理。三种媒体形态差太多，混排会乱；要看视频历史就切到视频台。
4. **一条生成 = 一个 tab。** 缩略图来自结果媒体（音频用音符占位）。点生成总是新建，不改写已有 tab。

## 画面

### 空态（该能力还没有记录，或点了「新的一次」）

```
Navbar
[ 图片台 | 视频台 | 音频台 ]

┌────┬─────────────────────────────────────────┐
│ +  │                                         │
│    │         描述你想要的画面…                 │
│    │    ┌──────────────────────┐ [生成图片]   │
│    │    │  textarea            │             │
│    │    └──────────────────────┘             │
│    │    [1:1] [16:9] [9:16] …  标准  模型▾    │
└────┴─────────────────────────────────────────┘
```

### 有选中记录

```
Navbar
[ 图片台 | 视频台 | 音频台 ]

┌────┬─────────────────────────────────────────┐
│ +  │                                         │
│ ■  │     当前结果（object-contain 大图）        │
│ □  │     下载 · 存素材 · 当参考 · 放大          │
│ □  │                                         │
│ □  │                                         │
│    ├─────────────────────────────────────────┤
│    │ prompt                          [生成]  │
│    │ 比例 · 质量 · 模型 · 参考 · 词库          │
└────┴─────────────────────────────────────────┘
  ▲
  选中项 accent 描边；缩略图最新在上
```

去掉 eyebrow「生成台」和大标题「AI 生成工作台」，顶栏三个能力台就是页身份。

工作区高度 `h-[calc(100vh-4rem)]`（Navbar `h-16`）。composer 贴工作区底，不用 `position:fixed` 以免盖住 Navbar。

左侧栏约 80px 宽（缩略图 64×64，圆角、中性底）。选中：`border-accent`。hover 出 prompt 前两字的 `title`。栏本身独立滚动；顶上「+」固定，不随列表滚走。

窄屏：左侧栏收成主区上方横向缩略图条（可横滑），「+」在最左。不把栏做成要先点开的抽屉——历史必须一眼能看见。

## 左侧历史栏

一条 tab = 一次 `generate*` 调用（含进行中的占位和失败项）。

| 状态 | 缩略图 |
|---|---|
| 图片成功 | 结果图 `object-cover` |
| 视频成功 | 视频帧 / `<video>` 首帧，角标播放图标 |
| 音频成功 | 音符图标 + 嗓音名，无封面 |
| 进行中 | 骨架 pulse + 已用秒数 |
| 失败 | 危险底 + 感叹号 |

### 删除（角上 ×）

- 鼠标 hover 右上角出现 ×；当前选中的那张始终露出（触屏可点）。
- 点 × 不弹确认：有 `taskId` 则 `POST /ai-generation/tasks/:id/delete`，成功后再从栏里拿掉；仅占位（生成中未落库）只删本地。
- 删的是正在看的那张：选列表里相邻下一条，没有则上一张，再没有则「新的一次」。
- 不删结果媒体（素材库 / 画布可能还在用）。

### 点 tab

1. 设为选中。
2. 主区换成这条的结果（失败则错误文案 + 重试；进行中则大骨架）。
3. composer **整份还原**这条快照：prompt、`modelRef`、全部参数、参考图。不自动再生成。
4. 可选：URL 写成 `/studio/{capability}?t={taskId}`，刷新仍停在这一条。没有 `t` 时 hydrate 后选最近一条；没有任何记录则进入「新的一次」。

切到另一条 tab 时，composer 里还没发出去的改动直接丢弃，以被点中那条的快照为准。不弹确认。

### 「+ 新的一次」

- 取消选中（`selectedKey = null`）。
- 主区回到居中 composer。
- **保留**当前模型与尺寸 / 质量 / 时长等参数（工作台默认）。
- **清空** prompt 与参考图。

这是从一条旧记录改去开新活的出口，避免「不点历史就清不掉」。

### 点生成

1. 用 **当前 composer**（可能刚从某条历史还原后又改过）发请求。
2. 在栏顶插入占位 tab 并选中它。
3. 回来后用真实结果替换该占位（失败则该 tab 变失败态）。
4. 不改写被当作起点的那条旧记录。

并发生成 = 栏顶可以同时有多张骨架。点别的 tab 不影响后台轮询。

### 数据从哪来

左侧栏就是该能力的任务列表：`generationApi.listTasks({ capability, page, limit })`。进页 hydrate；滚到底再拉下一页。本地新插入的占位 / 刚完成的结果排在服务器列表前面，按 `key` 去重。

刷新不靠 localStorage。选中态靠 `?t=`，没有则选最近一条。

## 本轮做

| 项 | 具体 |
|---|---|
| 去 chrome | 去掉 eyebrow 与大标题；顶栏只留图片 / 视频 / 音频 |
| 去掉历史页 | 删除 `StudioHistoryPage` 的展示入口；`/studio/history` → `/studio/image` |
| 换骨架 | 左历史栏 + 主区当前结果 + 底部 composer；空态 / 「新的一次」时 composer 居中 |
| 跨能力保活 | Pinia `studio` store，三套能力会话分开存。去掉 `:key` 导致的整树销毁 |
| 历史栏 | 缩略图 tab、+ 新的一次、按能力过滤、无限滚动 hydrate |
| 点 tab 还原 | 主区结果 + composer 全量快照（prompt / 模型 / 参数 / 参考图） |
| 主区动作 | 放大 / 当参考 / 下载 / 存素材 / 失败重试。常驻，不靠 hover。不再需要「再用」（点 tab 就是再用） |
| 灯箱 | 主区点媒体再放大；Esc / 点遮罩关闭 |
| 并发生成 | 去掉 `generating` 锁；每次生成栏顶一条新占位。有进行中时按钮文案为「再生成一张」 |
| 默认模型 | 选项到达且未选时自动选第一项；一个都没有则 composer 提示去 `/channels` |
| 快捷键 | `Cmd/Ctrl + Enter` 生成；Enter 仍换行 |
| 参数 chips | 尺寸用比例图形；质量用中文；视频比例/时长、音频嗓音/语速同样 chips。模型仍用 `OdSelect` |
| 参考图 | 文案「添加参考图」；可拖到 composer；主区「当参考」写入参考槽 |

## 明确不做

- 音频嗓音试听（没样本资源）
- 一次出多张（`count`）、送画布、用量/成本
- 任务取消（后端无 cancel；删除走 `POST /ai-generation/tasks/:id/delete`，只删任务行不删媒体）
- 跨能力混合的一条历史栏（按台过滤）
- 提示词库从覆盖改成插入
- 持久化到 localStorage（列表走 `listTasks`，选中走 `?t=`）
- 切 tab 时对未发出的 composer 改动做确认框
- 新视觉风格 / 新组件库
- 后端其它新增端点（删除任务除外）

## 组件与数据流

```
StudioPage.vue                   壳：Navbar + 三能力 Tab + 工作区高度
└── StudioGeneratePane.vue       组合面：历史栏 + 主区 + composer + lightbox
    ├── StudioHistoryRail.vue    左栏：+ / 缩略图列表 / 滚动加载
    ├── StudioResultStage.vue    主区：当前选中结果（大图 / 播放器 / 音频 / 骨架 / 失败）
    ├── ResultLightbox.vue       放大预览
    └── StudioComposer.vue       prompt 条 + chips + 参考 + 生成
        ├── ReferencePicker.vue  拖拽 / 上传 / 素材库
        └── PromptLibraryPicker  保持现有弹层

stores/studio.ts                 三套会话 + 选中 key + 灯箱
composables/useStudioGenerate.ts 生成 / 占位 / 并行 / 轮询 / 下载 / 还原
lib/studio/types.ts              StudioResult 补 snapshot
lib/studio/params.ts             中文标签 + 比例选项
```

删除（或本轮不再挂到路由）：`StudioHistoryPage.vue`。

`StudioGeneratePane` 不自己持有 prompt / 列表。会话在 Pinia。轮询在 store / composable 层，切能力台时进行中的视频继续轮。

### Store 形状

```ts
interface StudioComposer {
  prompt: string
  modelRef?: string
  imageSize: string
  imageQuality: string
  videoSeconds: string
  videoSize: string
  videoQuality: string
  audioVoice: string
  audioFormat: string
  audioSpeed: string
  referenceMedia: MediaFileView[]
  formError: string
}

interface StudioSession {
  composer: StudioComposer
  items: StudioResult[]     // 该能力历史，最新在前（本地占位 + hydrate）
  selectedKey: string | null // null = 「新的一次」
  hydrated: boolean
  listPage: number
  listHasMore: boolean
}

sessions: Record<'image' | 'video' | 'audio', StudioSession>
previewKey: string | null
```

`StudioResult` 在现有字段上增加：

- `modelRef`、`params`、`referenceMedia?`：点 tab / 重试用的快照
- `startedAt`：进行中显示已用秒数
- `taskId?`：与 `?t=`、轮询、hydrate 去重

`selectItem(key)`：写入 `selectedKey`，把该条快照拷进 `composer`。
`startDraft()`：`selectedKey = null`，清空 prompt 与参考图，保留模型与规格参数。
`runGenerate()`：只读当前 `composer`，栏顶插入新 item 并选中。

hydrate：该能力 `!hydrated` 时拉第一页。本地已有相同 `taskId` 的占位不覆盖。

## 参数怎么展示

质量、视频、音频只改展示，发给 API 的值不变。图片尺寸在原有 4 档上扩充主流比例，值仍是 `size` 字符串透传（后端无白名单）。

### 图片尺寸

芯片显示比例（用户心智），值是一组常见像素，覆盖方图 / 横屏 / 竖屏 / 相机 / 传统 4:3。默认 `1024x1024`（1:1）。

主档（composer 第一行）：

| 值 | 芯片 | 用途 |
|---|---|---|
| `auto` | 自动 | 模型自己决定 |
| `1024x1024` | 1:1 | 方图、头像、社交 |
| `1920x1080` | 16:9 | 横屏、壁纸、演示 |
| `1080x1920` | 9:16 | 竖屏、故事、手机壁纸 |

次档（同一行继续横滑，或「更多」展开）：

| 值 | 芯片 | 用途 |
|---|---|---|
| `1536x1024` | 3:2 | 相机横图（GPT Image 官方横图档） |
| `1024x1536` | 2:3 | 相机竖图（GPT Image 官方竖图档） |
| `1536x1152` | 4:3 | 传统横图 |
| `1152x1536` | 3:4 | 传统竖图 |

不做 21:9（那是视频/电影画幅，图片需求少）。

常量落在 `src/lib/studio/params.ts` 的 `IMAGE_SIZE_OPTIONS`。不同渠道对 `size` 的支持面不一样（GPT Image 官方只有 `auto` / `1024x1024` / `1536x1024` / `1024x1536`；DALL·E 3 还有 `1792x1024` / `1024x1792`；Ark / Gemini 更认比例）。前端不按模型过滤——模型不支持的档，失败走主区错误，不在芯片里藏。

### 图片质量

| 值 | 芯片 |
|---|---|
| `low` | 草稿 |
| `medium` | 标准 |
| `high` | 高清 |

默认仍是 `medium`（标准）。

### 视频

- 时长主档：5 / 8 / 10 / 15 秒。空串「默认」和 `-1`「自动」收进次级，避免三个语义并列。
- 比例用小矩形示意：`auto` / `16:9` / `9:16` / `1:1` / `4:3` / `3:4` / `21:9`。
- 画质：480p / 720p / 1080p，默认 720p。

### 音频

- 嗓音：chips，英文名保留，无试听。
- 格式：默认 mp3，其余（wav / opus / aac / flac / pcm）进次级。
- 语速：0.75x / 1.0x / 1.25x / 1.5x 四档 chips，默认 1.0x。

模型选项太多，仍用 `OdSelect`，不改成 chips。

## 主区动作

主区媒体 `object-contain` + 中性底。动作条常驻在结果下方（图标钮 ≥32px，带 `title` / `aria-label`）：

| 状态 | 动作 |
|---|---|
| 图片 / 视频成功 | 放大、当参考、下载、存素材 |
| 音频成功 | 下载（无「当参考」；无存素材——仍无 audio `AssetKind`） |
| 失败 | 错误文案 + 同快照重试（在当前 tab 原地再跑，不新开） |
| 进行中 | 大骨架 + 已用秒数；不提供取消 |

- **放大**：灯箱，媒体 `object-contain`；Esc / 点遮罩关闭。
- **当参考**：把当前结果 `media` 写入 composer 参考槽（去重）；仅图片 / 视频台。
- **下载**：`mediaUrl` + 现成 `downloadBlob`。
- **存素材**：沿用 `saveMediaAsAsset`（含 toast）。
- **重试**：用这条快照再发，同一条 tab 改回生成中；成功后原地换成新结果，并删掉旧的失败任务。
- 不再单独做「再用」：点左侧 tab 已经把配置还原进 composer。

## 路由

- `/studio` → `/studio/image`
- `/studio/image` `/studio/video` `/studio/audio`：三个能力台
- `/studio/history` → `/studio/image`（旧链接兜底）
- 选中记录：`/studio/{capability}?t={taskId}`，`router.replace` 不刷历史栈

`StudioPage` 的 `TabKey` 去掉 `history`。非法 tab 仍兜底到图片台。

## 实现顺序

1. 扩展 `StudioResult` + 新建 `stores/studio.ts`（composer / items / selectedKey / restore / draft / hydrate）
2. `useStudioGenerate`：生成 / 占位插栏顶 / 并行 / 轮询 / 下载
3. `StudioHistoryRail`：缩略图、+、选中描边、滚动加载
4. `StudioComposer` + 参数 chips + 拖拽参考 + Cmd+Enter + 默认模型
5. `StudioResultStage` + 灯箱；主区常驻动作
6. `StudioPage` / `StudioGeneratePane` 换成三栏骨架；去掉标题 chrome 与历史 Tab
7. 路由去掉历史页入口，`/studio/history` 重定向
8. `pnpm build` + `pnpm lint`；浏览器走通下方验收清单

## 风险

- **并发生成 vs 后端串行**：前端不锁。多条骨架可以同时在栏顶，先回来的先替换自己的 key。
- **hydrate 与本地占位**：按 `taskId` / `key` 去重，占位不被列表冲掉。
- **composer 未发出的改动**：切 tab 即丢。用「先生成就会落成新 tab」换简单；不弹窗。
- **参考图还原**：历史任务 API 若只给 `params.referenceMediaIds` 不给媒体本体，还原参考槽可能只有 id。能拉到 `MediaFileView` 就回填缩略图；拉不到就只带 id 发下一次，槽里用占位块。
- **窄屏**：改横向缩略图条，不要把历史藏进汉堡菜单。

## 验收清单

1. `pnpm build` 通过，`pnpm lint` 无新增错误。
2. 顶栏只有图片 / 视频 / 音频，没有「任务历史」。访问 `/studio/history` 落到图片台。
3. 该能力无记录时，左侧只有「+」，主区 composer 居中。
4. 点生成：栏顶立即出现骨架 tab 并选中；完成后主区是大图 / 播放器，不被裁切。
5. 点另一条缩略图：主区换成那次结果，composer 的 prompt / 模型 / 尺寸 / 质量 / 参考图与那次一致；不自动再生成。
6. 点「+」：主区回到空态 composer，prompt 与参考图清空，模型与规格仍在。
7. 在某条历史上改 prompt 再生成：旧 tab 不变，栏顶多一条新的并被选中。
8. 进行中仍可再点「再生成一张」；切到视频台再回来，进行中的图还在轮。
9. 失败 tab 可点开看到错误；重试用该快照在当前 tab 原地再跑，不新开栏位。
10. 无模型：composer 提示去渠道页。
11. `Cmd/Ctrl + Enter` 生成；Enter 换行。
12. 尺寸芯片为 1:1 / 16:9 / 9:16 / 3:2 / 2:3 / 4:3 / 3:4（外加自动）；质量为草稿 / 标准 / 高清。
13. 参考图可拖入；文案是「添加参考图」。
14. 刷新后左侧仍有该能力历史；带 `?t=` 时选中对应条。
15. 亮 / 暗主题下栏、主区、composer、灯箱均正常。
16. 窄屏：历史为顶部横滑缩略图条，主区与 composer 仍可用。
