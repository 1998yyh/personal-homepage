# CONTEXT — Web Tools 前端 / 团子后台

股票信号域已迁移至 [观澜](../guanlan/docs/sina-signals-migration.md)。

## 生成台域（Gen Studio）

- **生成台（Gen Studio）**：结果优先的 AI 生成工作台，独立主板块（Navbar「生成台」，路由 `/studio/*`）。与画布互补：画布管编排创作，生成台管快速出活。仅登录用户可用（全站第一个登录墙）。交互为左历史栏 + 主区当前结果 + 贴手 composer（任务历史页已取消）。
- **生成任务（Generation Task）**：一次生成调用的持久化记录，状态机 pending → processing → succeeded / failed / cancelled。图片与音频同步返回，视频为异步任务轮询终态。
- **能力（Capability）**：生成任务的类别：image / video / audio。（chat 能力归 Agents 板块，不进生成台。）
- **模型引用（modelRef）**：生成请求必填的渠道模型标识，格式 `channelId::modelName`。
- **参考图（Reference Media）**：图生图 / 图生视频的输入媒体。一律先落媒体库取得 mediaId，再经 `referenceMediaIds` 传入；来源限本地上传或素材库选取。
- **媒体（Media）**：文件本体（`/uploads/` 下的落盘文件）。生成结果天然落媒体库。
- **素材（Asset）**：挂在某个媒体上的命名收藏（`Asset.mediaId`）。「结果存为素材」= 以结果的 resultMediaId 建一条素材记录。
