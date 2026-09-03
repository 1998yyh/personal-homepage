# CONTEXT — Web Tools 前端 / 团子后台

## 股票信号域（Stock Signals）

- **B 信号（B Signal）**：新浪财经 upbs 多空信号接口中 `value='1'` 的买入信号。后端不做任何计算，直接抓取落库。
- **S 点（S Signal）**：同一 upbs 接口中 `value='0'` 的卖出信号，与 B 信号严格交替出现（B→S→B→S）。与 B 同源同接口，无需独立算法。
- **扫描（Scan）**：对沪深主板非 ST 股票（约 3044 只静态清单）或指定代码抓取 upbs 当日值的行为。需登录触发，结果公开缓存且历史每日保留。
- **观察池（Watchlist）**：登录用户**私有**的长期跟踪股票集合，上限 100 只。池内股票只盯 S 点，再出 B 不提示。
- **监控中（Watching）**：池内股票的默认状态。
- **已触发（Triggered）**：池内股票出现 S 点后的状态。该股票在观察池列表中**标红高亮**，保留在池内，一直红到用户手动将它**移除出池**为止。没有「确认已读」动作——标红即提醒，剔除即收场。
- **每日检查（Daily Watch Scan）**：定时任务，每个交易日 10:00 与 14:50 各跑一次全市场扫描，并顺带对池内股票做 S 点检测（池内检测白嫖全市场扫描的落库数据，无额外抓取）。观察池页面上另有「立即检查」手动入口。
- **入池（Add to Watchlist）**：把股票加入观察池的唯一途径是——在 B 信号结果列表中勾选后批量加入。不支持手动输代码入池。

## 生成台域（Gen Studio）

- **生成台（Gen Studio）**：结果优先的 AI 生成工作台，独立主板块（Navbar「生成台」，路由 `/studio/*`）。与画布互补：画布管编排创作，生成台管快速出活。仅登录用户可用（全站第一个登录墙）。交互以 `docs/specs/2026-09-02-gen-studio-interaction.md` 为准（左历史栏 + 主区当前结果 + 贴手 composer；任务历史页已取消）。
- **生成任务（Generation Task）**：一次生成调用的持久化记录，状态机 pending → processing → succeeded / failed / cancelled。图片与音频同步返回，视频为异步任务轮询终态。
- **能力（Capability）**：生成任务的类别：image / video / audio。（chat 能力归 Agents 板块，不进生成台。）
- **模型引用（modelRef）**：生成请求必填的渠道模型标识，格式 `channelId::modelName`。
- **参考图（Reference Media）**：图生图 / 图生视频的输入媒体。一律先落媒体库取得 mediaId，再经 `referenceMediaIds` 传入；来源限本地上传或素材库选取。
- **媒体（Media）**：文件本体（`/uploads/` 下的落盘文件）。生成结果天然落媒体库。
- **素材（Asset）**：挂在某个媒体上的命名收藏（`Asset.mediaId`）。「结果存为素材」= 以结果的 resultMediaId 建一条素材记录。
