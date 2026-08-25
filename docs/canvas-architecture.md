# Canvas 无限画布板块架构文档

> 适用范围：`src/pages/Canvas` + `src/stores/canvas.ts` + `src/lib/canvas*` + `src/types/canvas.ts`
> 来源：2026-08 从 infinite-canvas（https://github.com/basketikun/infinite-canvas，AGPL-3.0）移植，见根目录 `NOTICE`；后端设计文档在 tuanzi-server-base `docs/plans/2026-08-07-canvas-platform-design.md`
> 最后整理：2026-08-24

---

## 一、分层总览

```
┌─ 页面层  CanvasListPage（项目列表） + CanvasEditorPage（编辑器编排，只管坐标换算/上传/菜单弹层）
├─ 交互层  pages/Canvas/composables/ ×8（视口/拖拽/缩放/框选/连线/键盘/生成/任务轮询）
├─ 渲染层  pages/Canvas/components/（InfiniteCanvas 世界容器 + CanvasNode 节点壳
│          + CanvasConnections 连线 + Node*Content 内容组件 + 工具栏/MiniMap/菜单）
├─ 状态层  stores/canvas.ts（文档态唯一权威：文档/历史/保存/版本同步/选区瞬态）
├─ 纯函数层 lib/canvas/（canvas-node-factory 建节点 / canvas-node-geometry 几何
│          / canvas-node-size 尺寸 / canvas-export 导出）
├─ API 层  lib/canvas-api.ts（项目 CRUD + 整文档 PUT 乐观锁 + /version 轻量比对）
└─ 类型层  types/canvas.ts（CanvasDocument = { nodes, connections, viewport }）
```

**铁律：所有文档变更只有一个入口 —— `store.applyLocal()`。** 组件和 composable 不允许直接改 `nodes`/`connections`。

---

## 二、数据模型（`src/types/canvas.ts`）

### CanvasDocument

```ts
type CanvasDocument = {
  nodes: CanvasNodeData[];
  connections: CanvasConnection[];
  viewport?: ViewportTransform;  // { x, y, k }：屏幕平移 + 缩放
};
```

与后端 `canvas_projects.document` JSON 列一一对应，整存整取。

### 节点

6 种内置类型（`CanvasNodeType` const 对象，`erasableSyntaxOnly` 开启不能用 enum）：

| 类型 | 用途 |
|---|---|
| `image` | 图片（上传或 AI 生成结果） |
| `text` | 文本（可编辑，可作为生成提示词来源） |
| `config` | 生成配置（AI 生成的触发入口 + 参数面板） |
| `video` | 视频（上传或异步生成结果） |
| `audio` | 音频 |
| `group` | 分组（容器，不参与连线） |

`CanvasNodeTypeId = CanvasNodeType | (string & {})`：未知类型字符串也能存（历史文档残留/未来扩展），渲染走 fallback，`getNodeSpec()` 回退通用规格。

```ts
type CanvasNodeData = {
  id: string;
  type: CanvasNodeTypeId;
  title: string;
  position: Position;   // 世界坐标
  width: number;
  height: number;
  metadata?: CanvasNodeMetadata;
};
```

`metadata` 是大平铺结构（`types/canvas.ts:34`），按用途分四组：

- **内容**：`content`（媒体 URL 或文本）、`prompt`、`status`（idle/success/loading/error）、`errorDetails`、`fontSize`
- **生成参数**：`generationMode`、`model`（`channelId::modelName`）、`size`、`quality`、`background`、`count`、`seconds`、`vquality`、`generateAudio`、`watermark`、`audioVoice/Format/Speed/Instructions`、`reasoningEffort`
- **媒体信息**：`mediaId`（media_files.id，作生成参考素材用）、`storageKey`、`naturalWidth/Height`、`bytes`、`mimeType`、`durationMs`
- **关系**：`groupId`（所属分组）、批次四件套（`isBatchRoot`/`batchRootId`/`batchChildIds`/`primaryImageId` + `imageBatchExpanded`）、`taskId`（服务端异步生成任务 id，轮询回填用）

### 连线

```ts
type CanvasConnection = { id: string; fromNodeId: string; toNodeId: string };
```

有向。方向规则由 `normalizeConnection()` 保证（见「几何纯函数」）。

### 坐标系

- 节点存**世界坐标**（文档坐标系，原点在画布世界中心）。
- 视口 `{ x, y, k }` 是屏幕空间变换：`screen = world * k + t`。
- 屏幕 → 世界换算在编辑器页：`screenToCanvas(clientX, clientY) = (client - rect.left - viewport.x) / k`。
- 缩放范围 0.05 ~ 5。

---

## 三、状态核心：`src/stores/canvas.ts`（改动前必读全文件）

### 1. 状态分四类

| 类别 | 字段 | 说明 |
|---|---|---|
| 服务端同步态 | `projectId` `name` `version` `loaded` `loading` `loadError` `dirty` `saving` `conflict` | `conflict`：409 或远端版本超前且本地脏时置位 |
| 文档态 | `nodes` `connections` `viewport` | 进历史、进保存 |
| 瞬态交互态 | `selectedNodeIds` `selectedConnectionId` `hoveredNodeId` `connecting` `connectionTargetNodeId` `mouseWorld` `selectionBox` `contextMenu` `dropTargetGroupId` `isNodeDragging` `isNodeResizing` 等 | **不进历史不保存**，`clearInteraction()` 一键清 |
| 历史可用性 | `canUndo` `canRedo` | 镜像非响应式栈长度的响应式 ref |

**性能设计**（`stores/canvas.ts:36-46`）：历史栈 `historyPast/historyFuture`、`lastSnapshot`、剪贴板、所有定时器都是 **store 外的模块级变量**——故意不进 ref，避免 Vue 深度代理快照数组。

### 2. applyLocal —— 文档变更唯一入口

```ts
function applyLocal(next: { nodes?: CanvasNodeData[]; connections?: CanvasConnection[] }) {
  // 引用相等 → 直接跳过（原地 mutate 等于没改！）
  // 替换 ref → dirty = true
  // 非历史应用且未暂停 → 180ms 防抖提交历史快照
  // → 500ms 防抖调度保存
}
```

**不可变更新**：所有操作都是 `map`/`filter` 产生新数组。历史快照就是旧数组引用，零拷贝，50 步历史（`HISTORY_LIMIT`）内存代价极小。

### 3. 历史机制（撤销/重做）

- `HISTORY_COMMIT_DEBOUNCE = 180`ms：连续变更（如打字）合并成一步。
- **手势合并**：拖拽/缩放开始 `pauseHistory()`，结束 `resumeHistory()`——一次拖动的几百次 applyLocal 只算一步撤销。新的连续手势必须 pause/resume 配对，否则撤销功能直接废掉。
- `applySnapshot` 的时序坑（`stores/canvas.ts:272`）：undo 本身会触发 nodes 变更，用 `setTimeout` 下一拍再落 `lastSnapshot`，防止 undo 自己又产生一条历史；定时器 id 留存，快速连按 undo/redo 或中途 load 时先清掉上一拍，避免旧快照覆盖新状态。
- undo/redo 时清空选区与右键菜单。

### 4. 保存与冲突

- `scheduleSave()`：500ms 防抖调 `saveNow()`。
- `saveNow()`：`PUT /canvas-projects/:id` 整文档 + `baseVersion` 乐观锁。
  - 成功：更新 `version`，清 `dirty`。
  - **409**：置 `conflict = true`，**不覆盖远端**，编辑器页弹「刷新画布」模态（`reloadAfterConflict()` 丢弃本地重拉）。
  - 其他错误：`console.error`，保持 dirty 等下一轮重试。
  - `saving` 锁防并发重入。

### 5. 版本同步（多端/异步回填场景）

`syncVersion()`（返回 true 表示发生了静默重拉）：

```
GET /canvas-projects/:id/version 轻量比对
├─ 版本相同 → 返回 false
├─ 远端超前 + 本地脏 → conflict = true（交给用户决策）
└─ 远端超前 + 本地干净 → load() 静默整文档重拉
```

触发时机：window focus 监听 + 30s 轮询（`startVersionPolling/stopVersionPolling`）。轮询请求失败静默吞掉。视频生成任务终态也会由 `useGenerationTaskWatcher` 触发一次。

### 6. 加载 / 卸载

- `load(id)`：拉整文档 → 重置历史栈/所有定时器/瞬态 → 返回 `{ restoredViewport }`（文档没带 viewport 时由编辑器页负责居中）。
- `unload()`：停轮询、清全部定时器、清空所有状态。**编辑器页卸载顺序：`saveNow()` → `unload()`**（不然 500ms 防抖窗口内的修改直接丢）。

### 7. 业务操作的边界处理

| 方法 | 边界逻辑 |
|---|---|
| `addNode` | 经 `createCanvasNode` 工厂（默认尺寸 + 居中于给定点），自动选中 |
| `deleteNodes` | 批次根删除**级联删所有子图**；被删分组的成员清 `groupId`；存活批次根的 `batchChildIds` 同步清理；连线级联删除 |
| `connectNodes` | 经 `normalizeConnection` 规范化方向后去重；拒绝自连 |
| `finishNodeMove` | 拖拽结束分组吸附：中心点落进 group → `snapNodesIntoGroup`（带 24px padding 挤压校正）；否则按 `findContainingGroupId` 重算每个节点的 `groupId` |
| `pasteCopiedNodes` | 内部剪贴板（模块级变量，非系统剪贴板）；id 二次映射（`groupId` 引用的组节点可能排在子节点之后，第一遍 idMap 不完整）；标题加「 副本」 |
| `setBatchPrimary` | 把子图的 content/尺寸/naturalWidth 等上提到批次根节点 |

---

## 四、页面层

### 4.1 CanvasListPage（`src/pages/Canvas/CanvasListPage.vue`）

标准列表页：卡片网格 + 搜索 + 分页（vue-query，`['canvas-projects', page, keyword]`）+ 新建（自动命名「画布 <日期>」后跳编辑器）+ 删除（ConfirmDeleteModal）。**需要登录**（`enabled: auth.isAuthenticated`），未登录显示 EmptyState 引导。

### 4.2 CanvasEditorPage（`src/pages/Canvas/CanvasEditorPage.vue`，855 行）

页面自身几乎不持有业务状态，全是编排胶水：

**加载链路**（`watch(projectId, immediate)`）：

```
路由 id 变化 → 同实例内切换画布先 saveNow() 落旧账
→ store.load(id) → 文档没带 viewport 则居中（needsCenter）
→ startVersionPolling()
异常 → loadError 错误态
```

**卸载**：`resizeObserver.disconnect` → `stopVersionPolling` → `saveNow()` → `unload()`。

**上传链路**（三条入口 → 同一管线）：

| 入口 | 落点 |
|---|---|
| 工具栏「上传」按钮 | 视口中心 |
| 拖文件落入画布（drop） | 鼠标位置 |
| 双击空媒体节点 | 替换该节点内容（`replaceNodeWithFile`：保持 id，类型/尺寸/元数据按新文件重写，中心对齐） |

管线：过滤 image/video/audio → `mediaApi.upload` → 按类型建节点（音频固定默认尺寸、视频限 420×420、图片 `fitNodeSize` 等比缩到 640 内）→ 多文件 40px 阶梯错位。

**系统剪贴板回退**：`Ctrl+V` 时内部剪贴板为空 → `navigator.clipboard.read()` 有图片则上传建节点；否则 `readText()` 有文本则建文本节点。权限被拒静默。

**渲染数据**：

- `visibleNodes`：视口剔除（外扩 `CULL_PADDING = 280`px）+ `isHiddenBatchChild` 过滤折叠批次子图——**大画布的性能命门**。
- `relatedHighlight`：悬停/单选节点时，其关联连线与两端节点高亮（多选时不触发）。
- `groupChildCountById`：分组子节点计数（NodeGroupContent 徽标）。

**其他**：顶栏双击重命名（`renameProject`）、保存状态文案（保存中…/未保存/已保存）、图片全屏预览 overlay、清空画布确认、导出 zip（整项目 / 选中节点，导出前先 `saveNow()`）。

---

## 五、交互层 composables（8 个）

共同模式：全局事件监听（window）+ `onBeforeUnmount` 清理 + **rAF 合帧**（高频 mousemove 每帧最多落一次状态）。

| Composable | 职责 | 关键设计 |
|---|---|---|
| `useCanvasViewport` | 滚轮缩放 + 平移 | 缩放**以光标为锚点**（缩放前后光标下世界点不动）；左键空白/中键平移；`PAN_CLICK_THRESHOLD = 3`px 区分「点击空白取消选区」与「平移」；Space 键追踪；`[data-canvas-no-zoom]` 与弹层内豁免 |
| `useNodeDrag` | 节点选中 + 拖拽 | **capture 阶段先选中（pendingSelection 缓存），bubbling 阶段才启动拖拽**——节点内 textarea 按下也先选中节点；拖批次根级联子图、拖 group 级联全组；初始位置建 Map 索引避免每帧 O(n·m)；rAF 预览 + `dropTargetGroupId` 吸附高亮；结束 `finishNodeMove` |
| `useNodeResize` | 四角缩放手柄 | min 220×160；图片（非 `freeResize`）/视频锁宽高比（主导轴为准再回夹最小值）；左/上角同时改 position；松手先冲刷挂起的最后一帧防丢位移 |
| `useMarqueeSelection` | 框选 | Ctrl/Cmd + 左键空白拖框（普通左键空白是平移/取消选区），与节点实时求交；Shift 追加模式基于 `initialSelectedNodeIds` |
| `useConnectionDrag` | 连线拖拽 | 命中优先级：**节点内部 > 连接点 40px 半径 > 节点附近 32px**（均除以 k 换算）；落节点 → `connectNodes`；落节点附近 → 取消；落空白 → 挂起 `pendingConnectionCreate`，页面弹「创建并连接」菜单 |
| `useCanvasKeyboard` | 快捷键 | Ctrl+Z/Shift+Z/Y（撤销重做）、Ctrl+A（全选）、Ctrl+C/V（内部剪贴板）、Delete/Backspace（删节点或选中连线）、Esc（清交互态）；输入控件/contenteditable 内不响应；**页面有文本选区时 Ctrl+C 让位给系统复制** |
| `useNodeGeneration` | config 节点生成编排 | 见「六、AI 生成链路」 |
| `useGenerationTaskWatcher` | 异步任务轮询 | 2s 扫一次带 `taskId` 且 `status=loading` 的节点；查询并行、`syncVersion` 串行（避免并发重载竞态）；到终态时服务端 poller 已回填节点（版本 +1），前端走 `syncVersion()` 静默重拉整文档 |

---

## 六、AI 生成链路（config 节点，跨 4 个文件）

```
文本节点 ──连入──→ config 节点（NodeConfigContent）
媒体节点 ──连入──→   │  节点上：模式/模型摘要 + 「生成」「配置」按钮
                     │  抽屉（Teleport 到 body）：完整参数表单
                     ↓ 点「生成」
        useNodeGeneration.runGeneration(configNodeId)
          ├─ collectInputs：连入的文本节点内容拼进 prompt（自身 prompt 在前）
          │                 连入的媒体节点 mediaId 收集为 referenceMediaIds
          ├─ 校验：无模型 → error「请先在配置中选择模型」；无 prompt → error「请先填写提示词」
          ├─ config 节点 status = loading
          │
          ├─【图片】generationApi.generateImage（同步）
          │     → 每张图建节点（config 右侧 RESULT_GAP=80px，多图 48px 垂直错位）
          │     → fitNodeSize 等比适配 → config 自动连出到结果节点
          ├─【音频】generationApi.generateAudio（同步）→ 同上
          │
          └─【视频】（异步任务）
                1. 先建 pending 视频节点（status=loading，标题「视频生成中…」）并连线
                2. await store.saveNow() 落库
                   ⚠️ 必须！服务端 poller 按 nodeRef 回填时文档里得先有该节点
                3. generationApi.generateVideo 带 nodeRef { projectId, nodeId }
                4. 节点 metadata.taskId = task.id
                     ↓
        useGenerationTaskWatcher（2s 轮询 taskId 节点）
                终态 → syncVersion() 静默重拉 → pending 节点被服务端回填为真视频
                （本地脏时升级为 conflict 提示）
```

**模型下拉来源**（`NodeConfigContent.vue:57`）：`channelsApi.list()` 按 `capability === 当前 generationMode` 过滤启用中的渠道模型，`modelRef = "channelId::modelName"`。**切换生成模式会清空已选模型**（能力不同，原选择多半不匹配）。

**异常处理**：生成失败 → config 节点 `status=error` + `errorDetails`（优先取后端 `response.data.message`）；视频建任务失败 → pending 节点标 error。

---

## 七、渲染层组件

### InfiniteCanvas.vue（世界容器）

- 内层世界 div：`transform: translate(x, y) scale(k)` + `origin-top-left`，slot 内容即世界。
- CSS 网格背景：dots/lines/blank 三模式，`backgroundSize = 48 * k`，`backgroundPosition = viewport % gridSize` 跟随视口，颜色走 `--border` 设计令牌（亮暗自动）。
- 纯事件转发：pointerdown/dblclick/wheel/contextmenu/drop → emit 给编辑器页。pan/zoom 逻辑在 `useCanvasViewport`。

### CanvasNode.vue（节点壳）

- 结构：标题浮签（悬停/选中显示，双击改名，点击外部结束）+ 卡片主体 + 四角 resize 手柄 + **左 target / 右 source 连接点**（group 都没有，config 没有 source，悬停/选中/连线中才显示）。
- 内容分发：`metadata.status` 优先（loading → 转圈层，error → 错误层），再按 type 分发到 Node*Content；未知类型显示 fallback。
- 样式：选中/连线目标 `#2f80ff` 蓝框，关联节点 muted 框；图片/视频有内容时卡片透明无边框；group 半透明虚线框。
- z-index 分层：group=5 / 普通=10 / 选中=50；`contain: layout style` 限重重排范围。
- 双击行为：有内容的图片 → 全屏预览；空媒体节点 → 触发上传填充。

### CanvasConnections.vue（连线层）

- SVG 三次贝塞尔：从 from 节点右缘中点到 to 节点左缘中点，曲率 `max(|dx| * 0.5, 50)`。
- **两条 path**：16px 宽透明 path 承担点击/右键命中（`pointer-events: stroke`），细 path 纯展示。
- path 字符串在 `visibleConnections` computed 里缓存——拖拽/缩放高频重渲染时不逐条重算。
- 折叠批次子图的连线端点隐藏（`isHiddenBatchConnectionEndpoint`）。
- 拖拽中的临时连线：蓝色虚线，随鼠标移动，命中目标时吸附到目标节点边缘。

### Node*Content 内容组件

| 组件 | 要点 |
|---|---|
| `NodeTextContent` | 双击进 textarea 编辑（滚轮拦截防冒泡到画布缩放）；「生成」按钮：以本文本为 prompt 在右侧建 config 节点并自动连线（文本 → config） |
| `NodeImageContent` / `NodeVideoContent` / `NodeAudioContent` | 媒体展示，URL 一律过 `mediaUrl()`（`/uploads/` 不在 `/api` 前缀下） |
| `NodeGroupContent` | 子节点计数徽标 |
| `NodeConfigContent` | 见「六」；**抽屉必须 `Teleport to body`**——节点在 CSS transform 世界里，fixed 定位会失真 |

### 悬浮控件

- `CanvasToolbar`：加节点（6 类型菜单）/上传/撤销重做/删除选中/清空/背景模式/图片信息开关。
- `CanvasZoomControls`：缩放滑杆 + 百分比 + 重置。
- `CanvasMiniMap`：节点缩略 + 视口框，点击/拖动改 viewport。
- `CanvasContextMenu`：节点（副本/删除）与连线（删除）两种。
- `CanvasCreateMenu`：双击空白建节点 / 连线落空白「创建并连接」两种模式共用。

---

## 八、纯函数层（`src/lib/canvas/`）

| 模块 | 导出 | 说明 |
|---|---|---|
| `canvas-node-factory.ts` | `NODE_DEFAULT_SIZE` `NODE_SPECS` `getNodeSpec` `createCanvasNode` `imageMetadata/videoMetadata/audioMetadata` `applyNodeConfigPatch` | 节点默认尺寸（图片/文本/config 340×240，视频 420×236，音频 340×120，分组 760×480）；MediaFileView → metadata 映射；config patch 时按 size 比例同步空媒体节点尺寸（居中保持） |
| `canvas-node-geometry.ts` | `nodeBounds` `findGroupDropTarget` `snapNodesIntoGroup` `findContainingGroupId` `getConnectionTargetAnchor` `normalizeConnection` `isHiddenBatchChild` `isHiddenBatchConnectionEndpoint` | 分组吸附（中心点判定 + 24px padding 挤压校正）；连线方向规范化；批次隐藏判定 |
| `canvas-node-size.ts` | `fitNodeSize` `nodeSizeFromRatio` | 等比缩放进 max 框；`1024x1024`/`16:9` 字符串 → 节点尺寸（比例限 0.25~4） |
| `canvas-export.ts` | `exportCanvasProject` `exportCanvasNodes` | 整项目：`project.json`（含 document + files 清单）+ 媒体文件打 zip，媒体拉取失败跳过不阻断；选中节点：媒体导原文件、文本导 txt、其余导 JSON |

**连线方向规则**（`normalizeConnection`）：

1. group 不参与任何连线；config 不能连 config；禁止自连。
2. 第二节点是 config → 方向为「第一节点 → config」（config 只能当目标）。
3. 第一节点是 config 且从 target 手柄拖出 → 方向纠正为「第二节点 → config」。
4. 其余保持拖拽方向。

**批次（组图）机制**：`isBatchRoot` 根 + `batchChildIds` / 子图 `batchRootId` + `imageBatchExpanded` 折叠态 + `primaryImageId` 主图。规则散布：删除级联（store）、拖动级联（useNodeDrag）、折叠时子图及其连线隐藏（geometry）、`setBatchPrimary` 子图内容上提到根。

---

## 九、后端接口契约（`src/lib/canvas-api.ts`）

| 端点 | 用途 |
|---|---|
| `GET /canvas-projects?page&limit&keyword` | 列表（含 nodeCount/connectionCount 摘要） |
| `POST /canvas-projects` | 新建 |
| `GET /canvas-projects/:id` | 整文档（`{ id, name, version, document }`） |
| `GET /canvas-projects/:id/version` | **仅版本号**（轮询比对用，避免整文档传输） |
| `PATCH /canvas-projects/:id` | 重命名 |
| `PUT /canvas-projects/:id` | 整文档保存 `{ document, baseVersion }`，409 = 版本冲突 |
| `DELETE /canvas-projects/:id` | 删除 |

生成相关走 `lib/generation-api.ts`（`/ai-generation/*`：images/audio 同步、videos 异步任务 + `GET tasks/:id`）；媒体上传走 `lib/media-api.ts`（`POST /media`，返回 MediaFileView）。

---

## 十、避坑清单（改代码前过一遍）

1. **新文档操作必须走 `applyLocal`，且传入新数组**——引用相等会直接跳过，原地 mutate 等于没改还不触发保存。
2. **连续手势必须 `pauseHistory`/`resumeHistory` 配对**，否则拖一下产生几百条历史，撤销直接废掉。
3. **连线方向别自己判断**——一律过 `normalizeConnection`（group 不连、config 只当目标）。
4. **弹层一律 `Teleport to body`**——节点在 CSS transform 世界里，fixed 定位会失真。
5. **视频 pending 节点先 `saveNow()` 落库再建任务**——顺序反了服务端 poller 回填找不到节点。
6. **媒体 URL 一律过 `mediaUrl()`**。
7. **卸载/切换画布前先 `saveNow()`**——500ms 防抖窗口内的修改会丢。
8. **高频鼠标事件状态更新必须 rAF 合帧**（viewport/nodeDrag/resize/connectionDrag 都是这个模式，新加交互保持一致）。
9. **全局事件监听器必须在 `onBeforeUnmount` 移除**；`document.body.style.cursor` 这类全局副作用也要复位。
10. **快捷键要豁免输入控件**（input/textarea/select/contenteditable），`[data-canvas-no-zoom]` 标记的元素内不响应滚轮缩放与画布快捷键。
