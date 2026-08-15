# AI 渠道统一化（Agent 对话模型引用 AiChannel）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use tuanzii:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agent 对话模型从「内嵌 provider/apiKey/baseUrl/model 四字段」改为「引用 AiChannel + capability=chat 的模型」，渠道成为全站唯一的 LLM/生成端点凭据管理入口。

**Architecture:** `ai_channels` 表扩展 `apiFormat=anthropic` 与 `capability=chat`；`agent_configs` 新增 `channel_id`（FK，RESTRICT）+ `model_name`，旧四列（provider/model/api_key_encrypted/base_url）在端到端验收通过后由迁移脚本 `--drop-legacy` 模式删除。运行时 `AgentExecutorService` 通过 `AiChannelsService.resolveChatModel()` 取解密凭据实例化 LangChain ChatModel。前端 Agent 表单砍掉 4 个连接字段，换成「渠道 → 对话模型」两级下拉。

**Tech Stack:** NestJS 11 + TypeORM 0.3 + MySQL（后端 tuanzi-server-base）；Vue 3.5 + @tanstack/vue-query 5 + Tailwind v4（前端 personal-homepage）

**涉及两个仓库：**
- 后端：`D:\projects\tuanzi-server-base`（Task 1-6、12）
- 前端：`D:\projects\personal-homepage`（Task 7-11、12）

## Global Constraints

- **后端 `synchronize: false`**（`src/app.module.ts:36`）：所有表结构变更必须走 Task 3 的迁移脚本手动 DDL，严禁依赖 TypeORM 自动同步。
- 后端验证命令：`pnpm test`（jest，测试目录 `test/` 镜像 `src/`，测试内 import 用 `src/...` 路径）、`pnpm build`（nest build）、`pnpm lint`。
- 前端验证命令：`pnpm build`（vue-tsc 严格检查，`noUnusedLocals` 开启——删字段后必须清干净未使用的 import）、`pnpm lint`（基线 0 errors / 0 warnings）。**前端无测试框架**，不补测试，以 build + lint 验收。
- 前端类型文件禁用 `enum`（`erasableSyntaxOnly`），用 `const 对象 as const + 类型别名`（参照 `src/types/ai-generation.ts` 现有写法）；类型导入必须 `import type`（`verbatimModuleSyntax`）。
- **chat 用途仅允许 `apiFormat ∈ {openai, anthropic}`**（chat 走 LangChain ChatModel，仅这两类有对应实现；gemini/ark 渠道的 chat 模型在前端与后端双层拒绝）。**只校验 chat 方向，不做「格式 × 用途」全矩阵**——模型能力不由格式决定（grilling 已拍板）。
- **术语约定**：`capability` 的中文一律叫**「用途」**（UI 文案、后端错误消息统一），代码标识符保持 `capability` 不动（grilling 已拍板，写入后端 CONTEXT.md）。
- apiKey 密文可跨表复制：两张表共用 `AGENT_ENCRYPTION_KEY` + AES-256-GCM（`src/common/utils/crypto.util.ts`），迁移直接拷贝 `api_key_encrypted` 值即可。
- UI 文案与代码注释均为中文；commit message 用 conventional 中文（如 `feat(agents): ...`）。
- **部署顺序硬约束**：先跑 Task 3 迁移脚本（默认模式），再部署 Task 4-6 的后端代码；前端 Task 7-11 在后端上线后发布（前端直接消费新响应形状）。**`--drop-legacy` 删列在 Task 12 手动验收全部通过后执行**——删列不可逆，执行后回滚旧代码会直接崩（grilling 已拍板接受该风险）。

---

### Task 1: 扩展 ApiFormat / ModelCapability 枚举 + chat 格式校验（后端）

**Files:**
- Modify: `D:\projects\tuanzi-server-base\src\ai-generation\entities\ai-channel.entity.ts:12-24`
- Modify: `D:\projects\tuanzi-server-base\src\ai-generation\ai-channels.service.ts`
- Test: `D:\projects\tuanzi-server-base\test\ai-generation\ai-channels.service.spec.ts`

**Interfaces:**
- Consumes: 现有 `AiChannelsService.create(user, dto)` / `update(user, id, dto)`。
- Produces: `ApiFormat.ANTHROPIC = 'anthropic'`、`ModelCapability.CHAT = 'chat'`（Task 2/4/5/6 与前端 Task 7 依赖这两个枚举值）；`AiChannelsService.validateModels(apiFormat, models)`（私有，本任务内使用）。

- [ ] **Step 1: 写失败测试**

在 `test/ai-generation/ai-channels.service.spec.ts` 末尾追加（文件已有 `user = { id: 'user-1' }` 与 repo mock，直接复用）：

```ts
  describe('chat 能力格式校验', () => {
    const chatChannelDto = {
      name: 'OpenAI 官方',
      apiFormat: ApiFormat.OPENAI,
      baseUrl: 'https://api.openai.com',
      apiKey: 'sk-test-key',
      models: [{ name: 'gpt-5', capability: ModelCapability.CHAT }],
    };

    it('openai 格式渠道允许 chat 模型', async () => {
      await expect(service.create(user as never, chatChannelDto)).resolves.toBeDefined();
    });

    it('anthropic 格式渠道允许 chat 模型', async () => {
      await expect(
        service.create(user as never, {
          ...chatChannelDto,
          apiFormat: ApiFormat.ANTHROPIC,
          baseUrl: 'https://api.anthropic.com',
          models: [{ name: 'claude-opus-4-8', capability: ModelCapability.CHAT }],
        }),
      ).resolves.toBeDefined();
    });

    it('gemini 格式渠道拒绝 chat 模型', async () => {
      await expect(
        service.create(user as never, { ...chatChannelDto, apiFormat: ApiFormat.GEMINI }),
      ).rejects.toThrow('不支持「对话」用途');
    });

    it('ark 格式渠道拒绝 chat 模型', async () => {
      await expect(
        service.create(user as never, { ...chatChannelDto, apiFormat: ApiFormat.ARK }),
      ).rejects.toThrow('不支持「对话」用途');
    });

    it('update 把 models 改成含 chat 时按合并后的 apiFormat 校验', async () => {
      // channel fixture 是 openai 格式；update 同时把 apiFormat 改成 gemini + models 含 chat → 拒绝
      await expect(
        service.update(user as never, 'ch-1', {
          apiFormat: ApiFormat.GEMINI,
          models: [{ name: 'gemini-2.5-pro', capability: ModelCapability.CHAT }],
        }),
      ).rejects.toThrow('不支持「对话」用途');
    });
  });
```

注意：现有 spec 顶部的 `channel` fixture `models` 是 image 能力，不受影响。

- [ ] **Step 2: 跑测试确认失败**

Run: `cd D:/projects/tuanzi-server-base && pnpm test -- test/ai-generation/ai-channels.service.spec.ts`
Expected: FAIL —— `ApiFormat.ANTHROPIC` / `ModelCapability.CHAT` 不存在（编译错误即失败）。

- [ ] **Step 3: 实现枚举扩展 + 校验**

`src/ai-generation/entities/ai-channel.entity.ts:12-24` 改为：

```ts
/** 渠道 API 格式（决定请求/响应的拼装方式；「对话」用途仅支持 openai / anthropic） */
export enum ApiFormat {
  OPENAI = 'openai',
  GEMINI = 'gemini',
  ARK = 'ark',
  ANTHROPIC = 'anthropic',
}

/** 模型能力（chat = 对话，供 Agent 使用；image/video/audio = 生成，供画布使用） */
export enum ModelCapability {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  CHAT = 'chat',
}
```

`src/ai-generation/ai-channels.service.ts`：
1. import 处把 `AiChannel, AiChannelView` 改为 `AiChannel, AiChannelView, ApiFormat, ChannelModel, ModelCapability`（均来自 `./entities/ai-channel.entity`），并从 `@nestjs/common` 增加 `BadRequestException`。
2. 类内新增（放在 `create` 方法之前）：

```ts
  /** 支持「对话」用途的协议格式：chat 走 LangChain ChatModel，仅这两类有对应实现 */
  private static readonly CHAT_CAPABLE_FORMATS: ReadonlySet<ApiFormat> = new Set([
    ApiFormat.OPENAI,
    ApiFormat.ANTHROPIC,
  ]);

  /** 「对话」用途的模型只允许挂在 openai / anthropic 格式的渠道上 */
  private validateModels(apiFormat: ApiFormat, models: ChannelModel[]): void {
    for (const m of models) {
      if (
        m.capability === ModelCapability.CHAT &&
        !AiChannelsService.CHAT_CAPABLE_FORMATS.has(apiFormat)
      ) {
        throw new BadRequestException(
          `apiFormat 为 "${apiFormat}" 的渠道不支持「对话」用途的模型（「对话」用途仅支持 openai / anthropic 格式）`,
        );
      }
    }
  }
```

3. `create` 方法体首行（`this.channelRepo.save` 之前）加 `this.validateModels(dto.apiFormat, dto.models);`
4. `update` 方法在 `findOwned` 之后、字段赋值之前加：

```ts
    // 按「合并后」的 apiFormat + models 校验（dto 只传其一时用现值兜底）
    this.validateModels(dto.apiFormat ?? channel.apiFormat, dto.models ?? channel.models);
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd D:/projects/tuanzi-server-base && pnpm test -- test/ai-generation/ai-channels.service.spec.ts`
Expected: PASS（含既有用例）

- [ ] **Step 5: Commit**

```bash
cd D:/projects/tuanzi-server-base
git add src/ai-generation/entities/ai-channel.entity.ts src/ai-generation/ai-channels.service.ts test/ai-generation/ai-channels.service.spec.ts
git commit -m "feat(ai-generation): 渠道枚举扩展 anthropic 格式与 chat 能力并加格式校验"
```

---

### Task 2: AiChannelsService.resolveChatModel + 渠道删除引用保护（后端）

**Files:**
- Modify: `D:\projects\tuanzi-server-base\src\ai-generation\ai-channels.service.ts`
- Modify: `D:\projects\tuanzi-server-base\src\ai-generation\ai-generation.module.ts:16`
- Test: `D:\projects\tuanzi-server-base\test\ai-generation\ai-channels.service.spec.ts`

**Interfaces:**
- Consumes: Task 1 的 `ModelCapability.CHAT` / `ApiFormat`。
- Produces（Task 5、6 依赖，签名不得改）：

```ts
// src/ai-generation/ai-channels.service.ts
export interface ResolvedChatModel {
  channelId: string;
  apiFormat: ApiFormat;
  baseUrl: string;
  /** 解密后的 API Key，只活在调用方栈帧 */
  apiKey: string;
  model: string;
}

AiChannelsService.resolveChatModel(
  userId: string,
  channelId: string,
  modelName: string,
): Promise<ResolvedChatModel>

AiChannelsService.getById(id: string): Promise<AiChannel | null>  // 轻量查询，不解密

// 渠道删除被引用时的 400 响应形状（前端 Task 11 依赖，不得改）：
// BadRequestException({ message: string, referencingAgents: Array<{ id: string; name: string }> })
```

- [ ] **Step 1: 写失败测试**

spec 文件 `beforeEach` 的 `Test.createTestingModule({ providers: [...] })` 数组里追加一个 provider（放在 `AGENT_ENCRYPTION_KEY` 那行之后）：

```ts
        {
          provide: getRepositoryToken(AgentConfig),
          useValue: { find: jest.fn(async () => []) },
        },
```

import 处追加：

```ts
import { AgentConfig } from 'src/agents/entities/agent-config.entity';
import { BadRequestException } from '@nestjs/common';
```

文件末尾追加：

```ts
  describe('resolveChatModel', () => {
    const chatChannel: AiChannel = {
      ...channel,
      models: [
        { name: 'gpt-5', capability: ModelCapability.CHAT },
        { name: 'gpt-image-2', capability: ModelCapability.IMAGE },
      ],
    };

    beforeEach(() => {
      chatChannel.apiKeyEncrypted = encrypt('sk-plain-key', TEST_KEY);
      repo.findOne.mockResolvedValue(chatChannel);
    });

    it('返回解密后的渠道配置与模型名', async () => {
      const resolved = await service.resolveChatModel('user-1', 'ch-1', 'gpt-5');
      expect(resolved).toEqual({
        channelId: 'ch-1',
        apiFormat: ApiFormat.OPENAI,
        baseUrl: 'https://api.openai.com',
        apiKey: 'sk-plain-key',
        model: 'gpt-5',
      });
    });

    it('渠道归属他人时抛 ForbiddenException', async () => {
      await expect(service.resolveChatModel('user-2', 'ch-1', 'gpt-5')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('渠道停用时抛 BadRequestException', async () => {
      repo.findOne.mockResolvedValue({ ...chatChannel, isActive: false });
      await expect(service.resolveChatModel('user-1', 'ch-1', 'gpt-5')).rejects.toThrow('已停用');
    });

    it('模型不存在时抛 BadRequestException', async () => {
      await expect(service.resolveChatModel('user-1', 'ch-1', 'not-exists')).rejects.toThrow(
        '不存在模型',
      );
    });

    it('模型用途不是「对话」时抛 BadRequestException', async () => {
      await expect(service.resolveChatModel('user-1', 'ch-1', 'gpt-image-2')).rejects.toThrow(
        '的用途不是「对话」',
      );
    });
  });

  describe('remove 引用保护', () => {
    it('有启用中的 Agent 引用时拒绝删除，并带出引用者清单', async () => {
      repo.findOne.mockResolvedValue(channel);
      agentRepo.find.mockResolvedValue([
        { id: 'a-1', name: '客服助手' },
        { id: 'a-2', name: '翻译助手' },
      ] as AgentConfig[]);
      try {
        await service.remove(user as never, 'ch-1');
        fail('应该抛 BadRequestException');
      } catch (e) {
        const res = (e as BadRequestException).getResponse() as {
          message: string;
          referencingAgents: Array<{ id: string; name: string }>;
        };
        expect(res.message).toContain('2 个 Agent 引用');
        expect(res.referencingAgents).toEqual([
          { id: 'a-1', name: '客服助手' },
          { id: 'a-2', name: '翻译助手' },
        ]);
      }
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('无引用时正常删除', async () => {
      repo.findOne.mockResolvedValue(channel);
      agentRepo.find.mockResolvedValue([]);
      await service.remove(user as never, 'ch-1');
      expect(repo.remove).toHaveBeenCalledWith(channel);
    });
  });
```

同时在 describe 顶部声明区补 `let agentRepo: jest.Mocked<Repository<AgentConfig>>;`，并在 `beforeEach` 模块构建后加 `agentRepo = module.get(getRepositoryToken(AgentConfig));`（参照现有 `repo = module.get(...)` 写法）。

- [ ] **Step 2: 跑测试确认失败**

Run: `cd D:/projects/tuanzi-server-base && pnpm test -- test/ai-generation/ai-channels.service.spec.ts`
Expected: FAIL —— `service.resolveChatModel is not a function` / 编译错误。

- [ ] **Step 3: 实现**

`src/ai-generation/ai-generation.module.ts:16` 的 `TypeOrmModule.forFeature([AiChannel, GenerationTask])` 改为：

```ts
TypeOrmModule.forFeature([AiChannel, GenerationTask, AgentConfig])
```

文件头部加 `import { AgentConfig } from '../agents/entities/agent-config.entity';`（仅实体导入，不是模块依赖——agents → ai-generation 的模块依赖方向不变，无环）。

`src/ai-generation/ai-channels.service.ts`：
1. 头部加 `import { AgentConfig } from '../agents/entities/agent-config.entity';`
2. 文件顶部（import 之后、service 之前）加：

```ts
/** 对话模型解析结果（apiKey 已解密，只活在调用方栈帧） */
export interface ResolvedChatModel {
  channelId: string;
  apiFormat: ApiFormat;
  baseUrl: string;
  apiKey: string;
  model: string;
}
```

3. constructor 追加一个参数：

```ts
    @InjectRepository(AgentConfig)
    private readonly agentRepo: Repository<AgentConfig>,
```

4. `findWithKey` 方法之后追加：

```ts
  /** 轻量查询（不解密）：供 Agent 响应拼装渠道名/格式 */
  async getById(id: string): Promise<AiChannel | null> {
    return this.channelRepo.findOne({ where: { id } });
  }

  /** 执行用：解析对话模型，做归属/启用/存在性/能力校验，返回解密后的渠道配置 */
  async resolveChatModel(
    userId: string,
    channelId: string,
    modelName: string,
  ): Promise<ResolvedChatModel> {
    const { channel, apiKey } = await this.findWithKey(channelId);
    if (channel.userId !== userId) {
      throw new ForbiddenException('只能使用自己的 AI 渠道');
    }
    if (!channel.isActive) {
      throw new BadRequestException(`渠道 "${channel.name}" 已停用`);
    }
    const model = channel.models.find((m) => m.name === modelName);
    if (!model) {
      throw new BadRequestException(`渠道 "${channel.name}" 下不存在模型 "${modelName}"`);
    }
    if (model.capability !== ModelCapability.CHAT) {
      throw new BadRequestException(`模型 "${modelName}" 的用途不是「对话」`);
    }
    return {
      channelId: channel.id,
      apiFormat: channel.apiFormat,
      baseUrl: channel.baseUrl,
      apiKey,
      model: model.name,
    };
  }
```

5. `remove` 方法改为：

```ts
  async remove(user: CurrentUser, id: string): Promise<void> {
    const channel = await this.findOwned(id, user.id);
    // 有启用中的 Agent 引用时禁止删除（DB 层还有 FK RESTRICT 兜底，这里是友好报错 + 引用者清单）
    const referencingAgents = await this.agentRepo.find({
      where: { channelId: id, isActive: true },
      select: ['id', 'name'],
    });
    if (referencingAgents.length > 0) {
      throw new BadRequestException({
        message: `该渠道正被 ${referencingAgents.length} 个 Agent 引用，请先修改或删除相关 Agent`,
        referencingAgents: referencingAgents.map((a) => ({ id: a.id, name: a.name })),
      });
    }
    await this.channelRepo.remove(channel);
  }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd D:/projects/tuanzi-server-base && pnpm test -- test/ai-generation/ai-channels.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd D:/projects/tuanzi-server-base
git add src/ai-generation/ai-channels.service.ts src/ai-generation/ai-generation.module.ts test/ai-generation/ai-channels.service.spec.ts
git commit -m "feat(ai-generation): 新增 resolveChatModel 对话模型解析与渠道删除引用保护"
```

---

### Task 3: 数据库迁移脚本（DDL + 存量凭据物化为渠道）（后端）

**Files:**
- Create: `D:\projects\tuanzi-server-base\scripts\migrate-agent-channels.ts`

**Interfaces:**
- Consumes: Task 1 的枚举值（脚本写入 `'chat'` / `'anthropic'` 字面量）。
- Produces: `agent_configs.channel_id` / `agent_configs.model_name` 两列（NOT NULL + FK RESTRICT）；`ai_channels.api_format` 枚举列含 `anthropic`；`--drop-legacy` 删列模式（Task 12 验收后执行）。Task 4-6 的代码以此表结构为前提。

> 本任务是一次性运维脚本，不做 TDD；以「跑两遍都成功（幂等）+ 抽查 SQL」验收。

- [ ] **Step 1: 备份数据库**

```bash
mysqldump -h localhost -u root -p tuanzi_server agent_configs ai_channels > backup-agent-channels-$(date +%Y%m%d).sql
```

- [ ] **Step 2: 写迁移脚本**

创建 `scripts/migrate-agent-channels.ts`（零新依赖：env 文件手动解析，不用 dotenv——pnpm 下 dotenv 是传递依赖不可直接 import）：

```ts
/**
 * 一次性迁移：agent_configs 内嵌 LLM 凭据（provider/apiKey/baseUrl/model）→ ai_channels 渠道物化。
 *
 * 用法：
 *   默认模式   npx ts-node -r tsconfig-paths/register scripts/migrate-agent-channels.ts
 *   删列模式   npx ts-node -r tsconfig-paths/register scripts/migrate-agent-channels.ts --drop-legacy
 *
 * 前置：先备份（mysqldump）。幂等：channel_id 列已存在时跳过 DDL，仅补跑未回填的行。
 * 删列模式在端到端验收通过后单独执行：DROP 旧四列，不可逆！
 *
 * 密文直接跨表复制：两表共用 AGENT_ENCRYPTION_KEY + AES-256-GCM。
 * 合并语义：同一 user + provider + baseUrl + key 的多个 Agent 合并为一个渠道，
 * 不同 model 逐个追加进渠道 models（用途均为「对话」）。
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { existsSync, readFileSync } from 'fs';
import { randomUUID } from 'crypto';

/** 与 app.module 一致的 env 加载顺序（.env.local 优先，已存在的 process.env 最高优先） */
function loadEnv(): void {
  for (const file of ['.env', '.env.local']) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
    }
  }
}

/** Agent baseUrl 为空（走 SDK 默认）时物化出的渠道 baseUrl（ai_channels.base_url NOT NULL） */
const DEFAULT_BASE_URL: Record<string, string> = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com',
};

const LEGACY_COLUMNS = ['provider', 'model', 'api_key_encrypted', 'base_url'] as const;

interface AgentRow {
  id: string;
  user_id: string;
  provider: 'anthropic' | 'openai';
  model: string;
  api_key_encrypted: string;
  base_url: string | null;
}

async function connect(): Promise<DataSource> {
  loadEnv();
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_DATABASE ?? 'tuanzi_server',
  });
  await ds.initialize();
  return ds;
}

/** 删列模式：DROP 旧四列（幂等；前置校验 channel_id 已是 NOT NULL） */
async function dropLegacyColumns(): Promise<void> {
  const ds = await connect();
  const notNull = await ds.query<Array<{ Null: string }>>(
    `SHOW COLUMNS FROM agent_configs LIKE 'channel_id'`,
  );
  if (!notNull.length || notNull[0].Null !== 'NO') {
    throw new Error('channel_id 尚未回填/收紧为 NOT NULL，请先跑默认模式迁移');
  }
  const dropped: string[] = [];
  for (const col of LEGACY_COLUMNS) {
    const exists: unknown[] = await ds.query(`SHOW COLUMNS FROM agent_configs LIKE '${col}'`);
    if (!exists.length) continue;
    await ds.query(`ALTER TABLE agent_configs DROP COLUMN ${col}`);
    dropped.push(col);
  }
  await ds.destroy();
  console.log(dropped.length ? `已删除旧列：${dropped.join(', ')}` : '旧列均已删除，无需操作');
}

async function main(): Promise<void> {
  if (process.argv.includes('--drop-legacy')) {
    await dropLegacyColumns();
    return;
  }

  const ds = await connect();
  const cols: unknown[] = await ds.query(`SHOW COLUMNS FROM agent_configs LIKE 'channel_id'`);
  const ddlDone = cols.length > 0;

  if (!ddlDone) {
    // ── Phase A：DDL ──
    await ds.query(
      `ALTER TABLE ai_channels MODIFY COLUMN api_format ENUM('openai','gemini','ark','anthropic') NOT NULL`,
    );
    await ds.query(
      `ALTER TABLE agent_configs
         ADD COLUMN channel_id VARCHAR(36) NULL AFTER base_url,
         ADD COLUMN model_name VARCHAR(100) NULL AFTER channel_id`,
    );
    // 旧四列本阶段不动，由 --drop-legacy 在验收通过后统一删除
    console.log('Phase A：DDL 完成');
  } else {
    console.log('Phase A：channel_id 已存在，跳过 DDL');
  }

  // ── Phase B：存量数据物化（同一 user+provider+baseUrl+key 去重为一个渠道，model 逐个追加）──
  const agents = await ds.query<AgentRow[]>(
    `SELECT id, user_id, provider, model, api_key_encrypted, base_url
       FROM agent_configs
      WHERE channel_id IS NULL AND provider IS NOT NULL`,
  );
  // key → { channelId, models: 已挂进渠道的模型名 }
  const channelCache = new Map<string, { channelId: string; models: Set<string> }>();
  for (const agent of agents) {
    const baseUrl = agent.base_url ?? DEFAULT_BASE_URL[agent.provider];
    const key = [agent.user_id, agent.provider, baseUrl, agent.api_key_encrypted].join('|');
    let entry = channelCache.get(key);
    if (!entry) {
      entry = { channelId: randomUUID(), models: new Set() };
      await ds.query(
        `INSERT INTO ai_channels (id, user_id, name, api_format, base_url, api_key, models, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [
          entry.channelId,
          agent.user_id,
          `迁移渠道（${agent.provider}）`,
          agent.provider,
          baseUrl,
          agent.api_key_encrypted,
          JSON.stringify([]),
        ],
      );
      channelCache.set(key, entry);
    }
    // 同凭据不同模型的 Agent 合并进同一渠道：模型逐个追加（JSON_ARRAY_APPEND 保持数组形态）。
    // 注意：渠道初始 models 为空数组、逐个追加——若插入时就带上第一个模型，
    // 同凭据的第二个 Agent 的模型会丢（grilling 自查出的合并缺陷）
    if (!entry.models.has(agent.model)) {
      await ds.query(
        `UPDATE ai_channels
            SET models = JSON_ARRAY_APPEND(models, '$', JSON_OBJECT('name', ?, 'capability', 'chat'))
          WHERE id = ?`,
        [agent.model, entry.channelId],
      );
      entry.models.add(agent.model);
    }
    await ds.query(`UPDATE agent_configs SET channel_id = ?, model_name = ? WHERE id = ?`, [
      entry.channelId,
      agent.model,
      agent.id,
    ]);
  }
  console.log(`Phase B：物化渠道 ${channelCache.size} 个，回填 Agent ${agents.length} 条`);

  // 未回填行（历史脏数据：provider 为 NULL）不给约束报错的机会
  const orphans: Array<{ c: number }> = await ds.query(
    `SELECT COUNT(*) AS c FROM agent_configs WHERE channel_id IS NULL`,
  );
  if (orphans[0].c > 0) {
    throw new Error(`仍有 ${orphans[0].c} 行 agent_configs.channel_id 为 NULL，请人工处理后重跑`);
  }

  if (!ddlDone) {
    // ── Phase C：约束收紧 ──
    await ds.query(
      `ALTER TABLE agent_configs
         MODIFY COLUMN channel_id VARCHAR(36) NOT NULL,
         MODIFY COLUMN model_name VARCHAR(100) NOT NULL`,
    );
    await ds.query(
      `ALTER TABLE agent_configs
         ADD CONSTRAINT fk_agent_configs_channel
         FOREIGN KEY (channel_id) REFERENCES ai_channels (id) ON DELETE RESTRICT`,
    );
    console.log('Phase C：NOT NULL + FK RESTRICT 完成');
  }

  await ds.destroy();
  console.log('迁移完成（旧四列保留待验收，通过后以 --drop-legacy 删除）');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: 运行迁移**

```bash
cd D:/projects/tuanzi-server-base && npx ts-node -r tsconfig-paths/register scripts/migrate-agent-channels.ts
```

Expected 输出：
```
Phase A：DDL 完成
Phase B：物化渠道 N 个，回填 Agent M 条
Phase C：NOT NULL + FK RESTRICT 完成
迁移完成（旧四列保留待验收，通过后以 --drop-legacy 删除）
```

- [ ] **Step 4: 抽查验证 + 幂等验证**

```sql
-- 每个 agent 都有渠道，且渠道模型含 chat
SELECT a.id, a.model_name, c.name, c.api_format, c.models
FROM agent_configs a JOIN ai_channels c ON c.id = a.channel_id;

-- 应返回 0
SELECT COUNT(*) FROM agent_configs WHERE channel_id IS NULL;
```

再跑一遍脚本，Expected：`Phase A：channel_id 已存在，跳过 DDL` + `物化渠道 0 个，回填 Agent 0 条` + `迁移完成`（不报错即幂等通过）。

- [ ] **Step 5: Commit**

```bash
cd D:/projects/tuanzi-server-base
git add scripts/migrate-agent-channels.ts
git commit -m "chore(agents): 新增 agent_configs 凭据物化为 ai_channels 的一次性迁移脚本"
```

---

### Task 4: AgentConfig 实体改造（新增 channel 引用，直接删除旧四字段）（后端）

**Files:**
- Modify: `D:\projects\tuanzi-server-base\src\agents\entities\agent-config.entity.ts`

**Interfaces:**
- Consumes: Task 3 的表结构。
- Produces（Task 5/6 依赖的实体字段）：`AgentConfig.channelId: string`、`AgentConfig.modelName: string`、`AgentConfig.channel: AiChannel`（ManyToOne，RESTRICT）。旧字段 `provider/model/apiKeyEncrypted/baseUrl` 与 `ProviderType` 枚举**从实体中删除**（DB 列保留到 Task 12 `--drop-legacy`——`synchronize: false` 下实体比表少列无影响；grilling 已拍板删列）。

- [ ] **Step 1: 改造实体**

`src/agents/entities/agent-config.entity.ts`：

1. import 追加：`import { AiChannel } from '../../ai-generation/entities/ai-channel.entity';`
2. **整体删除** `ProviderType` 枚举（第 18-26 行，含其 doc 注释）。全局 grep `ProviderType` 确认引用面：`create-agent.dto.ts` / `agent-response.dto.ts` / 两个 spec 文件——都在 Task 5/6 的改造清单内，本任务不动。
3. 第 56-68 行的四个旧字段（`provider` / `model` / `apiKeyEncrypted` / `baseUrl`）**整体删除**，原地替换为：

```ts
  /** 对话模型所属渠道（ai_channels.id；FK RESTRICT：被引用时禁止删除渠道） */
  @ManyToOne(() => AiChannel, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'channel_id' })
  channel: AiChannel;

  @Column({ name: 'channel_id' })
  channelId: string;

  /** 渠道下的对话模型名（capability=chat，「对话」用途） */
  @Column({ name: 'model_name', length: 100 })
  modelName: string;
```

注意：`legacyMcpServers`（第 80-85 行）保持原样不动——那是上一轮迁移的既有先例，不在本次范围内。

- [ ] **Step 2: 类型检查（此时业务代码还没改，预期报错，用于列出受影响面）**

Run: `cd D:/projects/tuanzi-server-base && pnpm typecheck`
Expected: FAIL，报错集中在 `agents.service.ts`、`agent-executor.service.ts`、`create-agent.dto.ts`、`agent-response.dto.ts`、`test/agents/*`——这正是 Task 5/6 要改的文件清单，确认无其他意外文件报错（如 `scheduled-tasks.service.ts` 若仅透传 agentConfig 则不报错）。

- [ ] **Step 3: Commit（与 Task 5/6 一起构成可编译单元——本地按序提交即可）**

```bash
cd D:/projects/tuanzi-server-base
git add src/agents/entities/agent-config.entity.ts
git commit -m "refactor(agents): AgentConfig 新增 channel 引用并移除内嵌凭据四字段"
```

---

### Task 5: AgentExecutorService 按渠道解析 ChatModel（后端）

**Files:**
- Modify: `D:\projects\tuanzi-server-base\src\agents\agent-executor.service.ts`（第 91-110、131-150、175-210、260-270、359-381 行区域）
- Test: `D:\projects\tuanzi-server-base\test\agents\agent-executor.service.spec.ts`

**Interfaces:**
- Consumes: Task 2 的 `AiChannelsService.resolveChatModel(userId, channelId, modelName): Promise<ResolvedChatModel>`、Task 4 的 `AgentConfig.channelId/modelName`。
- Produces: `AgentExecutorService` 公开方法签名不变（`run`/`runStream`/`runBatch` 仍接收 `AgentConfig`）——调用方（conversations.service、scheduled-tasks.service、skill-tool.factory）零改动。

- [ ] **Step 1: 改测试（先失败）**

`test/agents/agent-executor.service.spec.ts`：

1. import 追加：

```ts
import { AiChannelsService } from 'src/ai-generation/ai-channels.service';
import { ApiFormat } from 'src/ai-generation/entities/ai-channel.entity';
```

2. `buildAgent` helper（当前第 40-55 行区域，含 `provider: ProviderType.ANTHROPIC` / `apiKeyEncrypted` 等字段）整体替换为：

```ts
const buildAgent = (overrides: Partial<AgentConfig> = {}): AgentConfig =>
  ({
    id: 'agent-1',
    userId: 'user-1',
    name: '测试 Agent',
    channelId: 'ch-1',
    modelName: 'claude-opus-4-8',
    maxTokens: 4096,
    maxIterations: 10,
    enabledTools: [],
    isActive: true,
    ...overrides,
  }) as AgentConfig;
```

3. `Test.createTestingModule` providers 数组追加：

```ts
      {
        provide: AiChannelsService,
        useValue: {
          resolveChatModel: jest.fn(
            async (_userId: string, channelId: string, modelName: string) => ({
              channelId,
              apiFormat: ApiFormat.OPENAI,
              baseUrl: 'https://api.openai.com',
              apiKey: API_KEY,
              model: modelName,
            }),
          ),
        },
      },
```

同时声明区加 `let aiChannelsService: jest.Mocked<AiChannelsService>;`，`beforeEach` 模块构建后加 `aiChannelsService = module.get(AiChannelsService);`。

4. 现有 `describe('createModelFromConfig', ...)`（第 375 行起）整组替换为：

```ts
  describe('createModelFromConfig（按渠道解析）', () => {
    it('用 agent 的 userId/channelId/modelName 调 resolveChatModel', async () => {
      await service.run(buildAgent({ channelId: 'ch-9', modelName: 'gpt-5' }), 'thread-1', 'hi');
      expect(aiChannelsService.resolveChatModel).toHaveBeenCalledWith('user-1', 'ch-9', 'gpt-5');
    });

    it('openai 格式渠道创建 ChatOpenAI 并传 baseURL', async () => {
      const { ChatOpenAI } = jest.requireMock('@langchain/openai') as { ChatOpenAI: jest.Mock };
      await service.run(buildAgent({ modelName: 'gpt-5' }), 'thread-1', 'hi');
      expect(ChatOpenAI).toHaveBeenCalledWith({
        apiKey: API_KEY,
        model: 'gpt-5',
        maxTokens: 4096,
        configuration: { baseURL: 'https://api.openai.com' },
      });
    });

    it('anthropic 格式渠道创建 ChatAnthropic 并传 anthropicApiUrl', async () => {
      aiChannelsService.resolveChatModel.mockResolvedValueOnce({
        channelId: 'ch-1',
        apiFormat: ApiFormat.ANTHROPIC,
        baseUrl: 'https://api.anthropic.com',
        apiKey: API_KEY,
        model: 'claude-opus-4-8',
      });
      const { ChatAnthropic } = jest.requireMock('@langchain/anthropic') as {
        ChatAnthropic: jest.Mock;
      };
      await service.run(buildAgent(), 'thread-1', 'hi');
      expect(ChatAnthropic).toHaveBeenCalledWith({
        apiKey: API_KEY,
        model: 'claude-opus-4-8',
        maxTokens: 4096,
        anthropicApiUrl: 'https://api.anthropic.com',
      });
    });

    it('gemini 等不支持的格式抛 BadRequestException', async () => {
      aiChannelsService.resolveChatModel.mockResolvedValueOnce({
        channelId: 'ch-1',
        apiFormat: ApiFormat.GEMINI,
        baseUrl: 'https://generativelanguage.googleapis.com',
        apiKey: API_KEY,
        model: 'gemini-2.5-pro',
      });
      await expect(service.run(buildAgent(), 'thread-1', 'hi')).rejects.toThrow('不支持对话');
    });
  });
```

注意：若该 spec 其他用例构造了自己的 agent fixture（含旧 `provider` 字段），一并改为 `channelId`/`modelName` 形态；若 `encrypt`/`TEST_KEY` 仅旧 helper 使用则删掉对应 import（lint 会标出）。

- [ ] **Step 2: 跑测试确认失败**

Run: `cd D:/projects/tuanzi-server-base && pnpm test -- test/agents/agent-executor.service.spec.ts`
Expected: FAIL —— `aiChannelsService.resolveChatModel` mock 未被调用 / 现有实现读 `config.provider` 抛错。

- [ ] **Step 3: 实现**

`src/agents/agent-executor.service.ts`：

1. import 调整：加 `import { AiChannelsService, ResolvedChatModel } from '../ai-generation/ai-channels.service';` 和 `import { ApiFormat } from '../ai-generation/entities/ai-channel.entity';`；删掉不再使用的 `ProviderType` 引用与 `decrypt`（若该文件 decrypt 仅 createModelFromConfig 使用——改完全局搜一次确认）。
2. constructor 追加注入：`private readonly aiChannelsService: AiChannelsService,`
3. `createModelFromConfig`（第 359-381 行）替换为：

```ts
  /** 按 Agent 引用的渠道创建 ChatModel；解密结果只活在函数栈帧 */
  private async createModelFromConfig(config: AgentConfig): Promise<BaseChatModel> {
    const resolved: ResolvedChatModel = await this.aiChannelsService.resolveChatModel(
      config.userId,
      config.channelId,
      config.modelName,
    );
    switch (resolved.apiFormat) {
      case ApiFormat.ANTHROPIC:
        return new ChatAnthropic({
          apiKey: resolved.apiKey,
          model: resolved.model,
          maxTokens: config.maxTokens,
          anthropicApiUrl: resolved.baseUrl,
        });
      case ApiFormat.OPENAI:
        return new ChatOpenAI({
          apiKey: resolved.apiKey,
          model: resolved.model,
          maxTokens: config.maxTokens,
          configuration: { baseURL: resolved.baseUrl },
        });
      default:
        throw new BadRequestException(`渠道格式 "${resolved.apiFormat}" 不支持对话`);
    }
  }
```

4. `buildGraph`（第 262 行起）改为 async，第 267 行 `const model = this.createModelFromConfig(config);` 改为 `const model = await this.createModelFromConfig(config);`，方法签名改为 `private async buildGraph(config: AgentConfig, tools: ...)`（返回类型相应变 `Promise<...>`）。
5. 三处调用点加 `await`：
   - 第 97 行 `const graph = this.buildGraph(agentConfig, tools);` → `const graph = await this.buildGraph(agentConfig, tools);`
   - 第 137 行同上
   - 第 192 行附近（`runBatch` 内 `{ ...agentConfig, systemPrompt: ... }` 传入处）同上

- [ ] **Step 4: 跑测试 + 全仓类型检查**

Run: `cd D:/projects/tuanzi-server-base && pnpm test -- test/agents/agent-executor.service.spec.ts && pnpm typecheck`
Expected: 测试 PASS；typecheck 仍报 `agents.service.ts` / `agent-response.dto.ts` 的错（Task 6 处理），不应再报 executor 相关错误。

- [ ] **Step 5: Commit**

```bash
cd D:/projects/tuanzi-server-base
git add src/agents/agent-executor.service.ts test/agents/agent-executor.service.spec.ts
git commit -m "refactor(agents): ChatModel 实例化改为按引用渠道解析凭据"
```

---

### Task 6: Agent CRUD DTO + Service 改造（后端）

**Files:**
- Modify: `D:\projects\tuanzi-server-base\src\agents\dto\create-agent.dto.ts`
- Modify: `D:\projects\tuanzi-server-base\src\agents\dto\agent-response.dto.ts`
- Modify: `D:\projects\tuanzi-server-base\src\agents\agents.service.ts`
- Modify: `D:\projects\tuanzi-server-base\src\agents\dto\update-agent.dto.ts`（仅注释）
- Test: `D:\projects\tuanzi-server-base\test\agents\agents.service.spec.ts`

**Interfaces:**
- Consumes: Task 2 的 `resolveChatModel` / `getById`，Task 4 的实体字段。
- Produces（前端 Task 7 的 `Agent` 类型与之一一对应）：

```ts
// AgentResponseDto 新形状
{
  id: string; name: string; description: string | null;
  channelId: string; channelName: string | null; apiFormat: ApiFormat | null;
  modelName: string;
  systemPrompt: string | null; maxTokens: number; maxIterations: number;
  enabledTools: string[]; isActive: boolean; createdAt: Date; updatedAt: Date;
}

// CreateAgentDto 新字段（删 provider/model/apiKey/baseUrl，加：）
channelId: string  // @IsUUID()
modelName: string  // @IsString() @Length(1,100)
```

- [ ] **Step 1: 改测试（先失败）**

`test/agents/agents.service.spec.ts`：

1. import 追加：

```ts
import { AiChannelsService } from 'src/ai-generation/ai-channels.service';
import { ApiFormat } from 'src/ai-generation/entities/ai-channel.entity';
```

2. 两个 agent fixture（第 30-70 行区域）的 `provider: ProviderType.ANTHROPIC, model: 'claude-opus-4-8', apiKeyEncrypted: encrypt(...)` 等旧字段替换为 `channelId: 'ch-1', modelName: 'claude-opus-4-8'`；create 用例的 dto fixture 改为 `{ name: '客服助手', channelId: 'ch-1', modelName: 'claude-opus-4-8' }`。
3. providers 数组追加：

```ts
      {
        provide: AiChannelsService,
        useValue: {
          resolveChatModel: jest.fn(async () => ({
            channelId: 'ch-1',
            apiFormat: ApiFormat.OPENAI,
            baseUrl: 'https://api.openai.com',
            apiKey: 'sk-x',
            model: 'claude-opus-4-8',
          })),
          getById: jest.fn(async () => ({
            id: 'ch-1',
            name: '公司网关',
            apiFormat: ApiFormat.OPENAI,
          })),
        },
      },
```

声明区加 `let aiChannelsService: jest.Mocked<AiChannelsService>;`，`beforeEach` 补 `aiChannelsService = module.get(AiChannelsService);`。若 `AGENT_ENCRYPTION_KEY` provider 仅为加解密测试服务且相关断言已删，可保留注入（service 仍声明该依赖时保留更安全——见 Step 3 决定是否从 service 移除）。

4. 旧断言替换：
   - `expect(saved.apiKeyEncrypted).not.toContain(API_KEY)`、`decrypt(saved.apiKeyEncrypted, ...)`、`expect(result.apiKeyMasked).toBe('****3456')` 等加密相关断言删除，替换为：

```ts
      expect(aiChannelsService.resolveChatModel).toHaveBeenCalledWith(
        'user-1',
        'ch-1',
        'claude-opus-4-8',
      );
      expect(result.channelName).toBe('公司网关');
      expect(result.apiFormat).toBe(ApiFormat.OPENAI);
      expect(result.modelName).toBe('claude-opus-4-8');
      expect(result).not.toHaveProperty('apiKeyMasked');
```

   - `update` 的「传了 apiKey 才重新加密」用例替换为：

```ts
    it('只在传了 channelId 或 modelName 时才重新校验渠道', async () => {
      await service.update(normalUser, 'agent-1', { name: '改名' });
      expect(aiChannelsService.resolveChatModel).not.toHaveBeenCalled();

      await service.update(normalUser, 'agent-1', { modelName: 'gpt-5' });
      // 合并校验：channelId 用现值
      expect(aiChannelsService.resolveChatModel).toHaveBeenCalledWith('user-1', 'ch-1', 'gpt-5');
    });
```

   - 新增渠道校验失败传播用例：

```ts
    it('渠道校验失败（如模型用途不是「对话」）时创建抛错', async () => {
      aiChannelsService.resolveChatModel.mockRejectedValueOnce(
        new BadRequestException('模型 "gpt-image-2" 的用途不是「对话」'),
      );
      await expect(
        service.create(normalUser, { name: 'x', channelId: 'ch-1', modelName: 'gpt-image-2' }),
      ).rejects.toThrow('的用途不是「对话」');
    });
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd D:/projects/tuanzi-server-base && pnpm test -- test/agents/agents.service.spec.ts`
Expected: FAIL。

- [ ] **Step 3: 实现**

`src/agents/dto/create-agent.dto.ts`：删 `provider`/`model`/`apiKey`/`baseUrl` 四个字段及其 import（`IsEnum`、`IsNotEmpty`、`IsUrl` 若不再使用一并删，`ProviderType` import 删除），替换为：

```ts
  @ApiProperty({
    example: '9b1d...-uuid',
    description: '对话模型所属渠道（/ai-channels 中含 capability=chat 模型的渠道）',
  })
  @IsUUID()
  channelId: string;

  @ApiProperty({ example: 'claude-opus-4-8', description: '渠道下的对话模型名（capability=chat）' })
  @IsString()
  @Length(1, 100)
  modelName: string;
```

`src/agents/dto/update-agent.dto.ts` 注释改为 `/** 部分更新；channelId/modelName 传其一时按合并后的组合校验 */`。

`src/agents/dto/agent-response.dto.ts`：`provider`/`model`/`apiKeyMasked`/`baseUrl` 四字段替换为（`ProviderType` import 改为 `import { ApiFormat } from '../../ai-generation/entities/ai-channel.entity';`）：

```ts
  @ApiProperty({ example: 'uuid', description: '对话模型所属渠道 ID' })
  channelId: string;

  @ApiProperty({ example: '公司网关', description: '渠道名称', nullable: true })
  channelName: string | null;

  @ApiProperty({ enum: ApiFormat, example: 'openai', description: '渠道 API 格式', nullable: true })
  apiFormat: ApiFormat | null;

  @ApiProperty({ example: 'claude-opus-4-8', description: '对话模型名' })
  modelName: string;
```

`src/agents/agents.service.ts`：
1. import：`AiChannelsService` 加入；删 `encrypt`/`maskApiKey`/`AGENT_ENCRYPTION_KEY`（service 不再碰加解密——`decrypt` 也随 toResponse 重写删除）。
2. constructor：删 `@Inject(AGENT_ENCRYPTION_KEY) private readonly encryptionKey: string,`，加 `private readonly aiChannelsService: AiChannelsService,`。
3. `create`：

```ts
  async create(user: CurrentUser, dto: CreateAgentDto): Promise<AgentResponseDto> {
    // 渠道归属/启用/「对话」用途校验（失败抛 400/403，由全局过滤器转响应）
    await this.aiChannelsService.resolveChatModel(user.id, dto.channelId, dto.modelName);
    const agent = await this.agentRepo.save(
      this.agentRepo.create({
        userId: user.id,
        name: dto.name,
        description: dto.description ?? null,
        channelId: dto.channelId,
        modelName: dto.modelName,
        systemPrompt: dto.systemPrompt ?? null,
        maxTokens: dto.maxTokens ?? 4096,
        maxIterations: dto.maxIterations ?? 10,
        enabledTools: dto.enabledTools ?? [],
      }),
    );
    return this.toResponse(agent);
  }
```

4. `update`：

```ts
  async update(user: CurrentUser, id: string, dto: UpdateAgentDto): Promise<AgentResponseDto> {
    const agent = await this.findOwnedOrFail(user.id, id);

    // channelId/modelName 传其一时，按「合并后」的组合校验
    if (dto.channelId !== undefined || dto.modelName !== undefined) {
      await this.aiChannelsService.resolveChatModel(
        user.id,
        dto.channelId ?? agent.channelId,
        dto.modelName ?? agent.modelName,
      );
    }
    Object.assign(agent, dto);
    const saved = await this.agentRepo.save(agent);
    return this.toResponse(saved);
  }
```

5. `toResponse` 改 async 并整体替换（`findAll`/`findOne`/`create`/`update` 的调用点相应 `await`，`findAll` 里用 `items: await Promise.all(items.map((a) => this.toResponse(a)))`）：

```ts
  /** 响应拼装：channelName/apiFormat 来自渠道轻量查询（不解密），密文绝不出现 */
  private async toResponse(agent: AgentConfig): Promise<AgentResponseDto> {
    const channel = await this.aiChannelsService.getById(agent.channelId);
    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      channelId: agent.channelId,
      channelName: channel?.name ?? null,
      apiFormat: channel?.apiFormat ?? null,
      modelName: agent.modelName,
      systemPrompt: agent.systemPrompt,
      maxTokens: agent.maxTokens,
      maxIterations: agent.maxIterations,
      enabledTools: agent.enabledTools ?? [],
      isActive: agent.isActive,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }
```

- [ ] **Step 4: 跑 agents 全部测试 + 全仓回归**

Run: `cd D:/projects/tuanzi-server-base && pnpm test && pnpm typecheck && pnpm build`
Expected: 全 PASS；typecheck/build 0 错误。若 `conversations.service.spec.ts` / `scheduled-tasks.service.spec.ts` 有构造 agent fixture 含旧字段的编译错误，按 Task 5 的 `buildAgent` 形态同步修（这些 spec 只透传 fixture，不断言 provider）。

- [ ] **Step 5: Commit**

```bash
cd D:/projects/tuanzi-server-base
git add src/agents/dto src/agents/agents.service.ts test/agents/agents.service.spec.ts
git commit -m "refactor(agents): Agent CRUD 改用 channelId+modelName，响应拼装渠道信息"
```

---

### Task 7: 前端类型层（ai-generation 枚举扩展 + agent 类型重塑）

**Files:**
- Modify: `D:\projects\personal-homepage\src\types\ai-generation.ts:4-16`
- Modify: `D:\projects\personal-homepage\src\types\agent.ts:1-49`

**Interfaces:**
- Consumes: Task 6 的 `AgentResponseDto` 形状。
- Produces（Task 8/9/10 依赖）：`ApiFormat.Anthropic`、`ModelCapability.Chat`；`Agent { channelId, channelName, apiFormat, modelName, ... }`（无 `provider/model/apiKeyMasked/baseUrl`）；`AgentPayload { channelId, modelName, ... }`（无 `provider/model/apiKey/baseUrl`）。`AgentProvider` 类型删除。

- [ ] **Step 1: 改 ai-generation.ts 枚举**

`src/types/ai-generation.ts` 第 4-16 行替换为：

```ts
export const ApiFormat = {
  OpenAI: 'openai',
  Gemini: 'gemini',
  Ark: 'ark',
  Anthropic: 'anthropic',
} as const
export type ApiFormat = (typeof ApiFormat)[keyof typeof ApiFormat]

export const ModelCapability = {
  Image: 'image',
  Video: 'video',
  Audio: 'audio',
  Chat: 'chat',
} as const
export type ModelCapability = (typeof ModelCapability)[keyof typeof ModelCapability]
```

- [ ] **Step 2: 改 agent.ts 的 Agent / AgentPayload**

`src/types/agent.ts`：删第 3-4 行的 `AgentProvider` 类型；第 18-49 行的 `Agent` / `AgentPayload` 替换为（文件顶部加 `import type { ApiFormat } from './ai-generation'`）：

```ts
/** Agent 配置（对话模型引用 ai-channels 渠道；后端返回渠道名/格式供展示） */
export interface Agent {
  id: string
  name: string
  description: string | null
  /** 对话模型所属渠道（ai-channels.id） */
  channelId: string
  /** 渠道名称（展示用，渠道异常时为 null） */
  channelName: string | null
  /** 渠道 API 格式（展示用） */
  apiFormat: ApiFormat | null
  /** 渠道下的对话模型名（capability=chat） */
  modelName: string
  systemPrompt: string | null
  maxTokens: number
  maxIterations: number
  enabledTools: string[]
  mcpServers: McpServerConfig[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** 创建/更新 Agent 的提交载荷（连接凭据在渠道侧维护，这里只引用） */
export interface AgentPayload {
  name: string
  description?: string
  channelId: string
  modelName: string
  systemPrompt?: string
  maxTokens?: number
  maxIterations?: number
  enabledTools?: string[]
}
```

- [ ] **Step 3: 构建确认受影响面**

Run: `cd D:/projects/personal-homepage && pnpm build`
Expected: FAIL，报错集中在 `AgentFormDrawer.vue`、`AgentsPage.vue`（Task 9/10 处理）——确认无其他文件引用旧字段。

- [ ] **Step 4: Commit**

```bash
cd D:/projects/personal-homepage
git add src/types/ai-generation.ts src/types/agent.ts
git commit -m "refactor(types): Agent 类型改为渠道引用形态，枚举扩展 anthropic/chat"
```

---

### Task 8: ChannelFormDrawer 扩展 chat 用途与 anthropic 格式（前端）

**Files:**
- Modify: `D:\projects\personal-homepage\src\pages\Channels\components\ChannelFormDrawer.vue:21-37,87-93`

**Interfaces:**
- Consumes: Task 7 的 `ApiFormat.Anthropic` / `ModelCapability.Chat`。
- Produces: 无新签名（表单提交 `ChannelPayload` 形状不变）。

- [ ] **Step 1: 改选项常量**

`ChannelFormDrawer.vue` 第 21-37 行替换为：

```ts
const API_FORMAT_OPTIONS: Array<{ value: (typeof ApiFormat)[keyof typeof ApiFormat]; label: string; hint: string }> = [
  { value: ApiFormat.OpenAI, label: 'OpenAI 兼容', hint: 'OpenAI 官方及兼容网关（对话 /v1/chat、生图 /v1/images、视频 /v1/videos、音频 /v1/audio）' },
  { value: ApiFormat.Anthropic, label: 'Anthropic', hint: 'Claude 对话模型（仅支持「对话」用途）' },
  { value: ApiFormat.Ark, label: '火山方舟 Ark', hint: '豆包 Seedream 生图 / Seedance 视频（/api/v3）' },
  { value: ApiFormat.Gemini, label: 'Gemini', hint: 'Google Gemini 生图（暂不支持视频/音频/对话）' },
]

const CAPABILITY_OPTIONS: Array<{ value: ModelCapability; label: string }> = [
  { value: 'chat', label: '对话' },
  { value: 'image', label: '图片' },
  { value: 'video', label: '视频' },
  { value: 'audio', label: '音频' },
]

const BASE_URL_PLACEHOLDERS: Record<string, string> = {
  openai: '如 https://api.openai.com',
  anthropic: '如 https://api.anthropic.com',
  ark: '如 https://ark.cn-beijing.volces.com/api/v3',
  gemini: '如 https://generativelanguage.googleapis.com',
}
```

- [ ] **Step 2: 提交校验加 chat 格式限制（与后端一致的前置拦截）**

`handleSubmit` 里 `if (!models.length) { ... }` 之后追加：

```ts
  // 与后端 CHAT_CAPABLE_FORMATS 一致：chat 仅支持 openai / anthropic
  if (models.some((m) => m.capability === 'chat') && !['openai', 'anthropic'].includes(form.apiFormat)) {
    localError.value = '当前 API 格式不支持「对话」模型（仅 OpenAI 兼容 / Anthropic 渠道支持）'
    return
  }
```

- [ ] **Step 3: 验证**

Run: `cd D:/projects/personal-homepage && pnpm lint -- src/pages/Channels`
Expected: 0 errors / 0 warnings（`pnpm build` 此时仍会因 Task 9/10 未做而失败，属预期）

- [ ] **Step 4: Commit**

```bash
cd D:/projects/personal-homepage
git add src/pages/Channels/components/ChannelFormDrawer.vue
git commit -m "feat(channels): 渠道表单支持 anthropic 格式与对话用途模型"
```

---

### Task 9: AgentFormDrawer 改「渠道 → 对话模型」两级选择器（前端）

**Files:**
- Modify: `D:\projects\personal-homepage\src\pages\Agents\components\AgentFormDrawer.vue`

**Interfaces:**
- Consumes: Task 7 的 `Agent`/`AgentPayload`；`channelsApi.list()` 与 `ModelCapability.Chat`；画布 `NodeConfigContent.vue:51-65` 的查询模式（`useQuery({ queryKey: ['ai-channels'], queryFn: () => channelsApi.list() })`，同 key 共享缓存）。
- Produces: 提交 `AgentPayload { name, description?, channelId, modelName, systemPrompt?, maxTokens, maxIterations, enabledTools }`。

- [ ] **Step 1: 重写 script（保留工具映射/Esc 关闭/高级区逻辑）**

`<script setup lang="ts>` 整段替换为（`BUILTIN_TOOLS` 数组内容不变，照抄原第 21-24 行）：

```vue
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { Agent, AgentPayload, BuiltinToolName } from '../../../types/agent'
import { channelsApi } from '../../../lib/channels-api'
import AppIcon from '../../../components/AppIcon.vue'

const props = defineProps<{
  /** 传入则为编辑模式，否则为创建 */
  agent?: Agent | null
  submitting?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: AgentPayload]
}>()

const isEdit = computed(() => !!props.agent)

// 内置工具展示映射（后端无列表接口，前端硬编码——设计文档 §2）
const BUILTIN_TOOLS: Array<{ name: BuiltinToolName; label: string; desc: string }> = [
  { name: 'web_search', label: '联网搜索', desc: '让 Agent 可以搜索互联网获取实时信息' },
  { name: 'calculator', label: '计算器', desc: '精确数学求值，弥补大模型算数弱项' },
]

const form = reactive({
  name: '',
  description: '',
  channelId: '',
  modelName: '',
  systemPrompt: '',
  maxTokens: 4096,
  maxIterations: 10,
  enabledTools: [] as string[],
})

const showAdvanced = ref(false)
const localError = ref<string | null>(null)

// 渠道列表（与画布生成节点同一 queryKey，共享缓存）
const { data: channels } = useQuery({
  queryKey: ['ai-channels'],
  queryFn: () => channelsApi.list(),
})

/** 可选渠道：启用中且含对话模型 */
const chatChannels = computed(() =>
  (channels.value ?? []).filter(
    (c) => c.isActive && c.models.some((m) => m.capability === 'chat'),
  ),
)

/** 当前选中渠道下的对话模型 */
const chatModels = computed(
  () =>
    chatChannels.value
      .find((c) => c.id === form.channelId)
      ?.models.filter((m) => m.capability === 'chat') ?? [],
)

/** 编辑时原渠道已停用/删除的兜底展示 */
const missingChannel = computed(
  () =>
    isEdit.value &&
    form.channelId &&
    !chatChannels.value.some((c) => c.id === form.channelId),
)

// 编辑模式回填（连接信息来自渠道引用，不回填任何凭据）
watch(
  () => props.agent,
  (agent) => {
    if (!agent) return
    form.name = agent.name
    form.description = agent.description ?? ''
    form.channelId = agent.channelId
    form.modelName = agent.modelName
    form.systemPrompt = agent.systemPrompt ?? ''
    form.maxTokens = agent.maxTokens
    form.maxIterations = agent.maxIterations
    form.enabledTools = [...agent.enabledTools]
  },
  { immediate: true },
)

// 手动切换渠道时清空模型（旧选择多半不属于新渠道；回填时 prev 为空串不触发）
watch(
  () => form.channelId,
  (next, prev) => {
    if (prev && next !== prev) form.modelName = ''
  },
)

const toggleTool = (name: string) => {
  const idx = form.enabledTools.indexOf(name)
  if (idx >= 0) form.enabledTools.splice(idx, 1)
  else form.enabledTools.push(name)
}

// Esc 关闭抽屉
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const handleSubmit = () => {
  localError.value = null
  if (!form.name.trim()) {
    localError.value = '请填写 Agent 名称'
    return
  }
  if (!form.channelId) {
    localError.value = '请选择渠道'
    return
  }
  if (!form.modelName) {
    localError.value = '请选择对话模型'
    return
  }
  // v-model.number 在输入被清空/非法时会留下空字符串，这里兜底校验
  if (!Number.isInteger(form.maxTokens) || form.maxTokens < 1) {
    localError.value = '最大 Token 数需为不小于 1 的整数'
    return
  }
  if (!Number.isInteger(form.maxIterations) || form.maxIterations < 1) {
    localError.value = '最大工具调用轮次需为不小于 1 的整数'
    return
  }

  emit('submit', {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    channelId: form.channelId,
    modelName: form.modelName,
    systemPrompt: form.systemPrompt.trim() || undefined,
    maxTokens: form.maxTokens,
    maxIterations: form.maxIterations,
    enabledTools: form.enabledTools,
  })
}
</script>
```

- [ ] **Step 2: 改模板——删 4 个连接字段，换两级选择器**

删除原模板中的三块：「供应商 + 模型」grid（原第 177-207 行）、「API Key」块（原第 209-236 行）、「Base URL」块（原第 238-249 行），在「描述」之后、「系统提示词」之前插入：

```html
      <template v-if="chatChannels.length">
        <div class="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <div>
            <label class="od-label">渠道 *</label>
            <select
              v-model="form.channelId"
              class="od-input"
            >
              <option
                value=""
                disabled
              >
                选择渠道
              </option>
              <option
                v-for="c in chatChannels"
                :key="c.id"
                :value="c.id"
              >
                {{ c.name }}
              </option>
              <!-- 编辑时原渠道已停用/删除的兜底项 -->
              <option
                v-if="missingChannel"
                :value="form.channelId"
              >
                {{ agent?.channelName ?? '原渠道' }}（已停用或删除）
              </option>
            </select>
          </div>
          <div>
            <label class="od-label">对话模型 *</label>
            <select
              v-model="form.modelName"
              class="od-input"
              :disabled="!form.channelId"
            >
              <option
                value=""
                disabled
              >
                {{ form.channelId ? '选择模型' : '先选择渠道' }}
              </option>
              <option
                v-for="m in chatModels"
                :key="m.name"
                :value="m.name"
              >
                {{ m.name }}
              </option>
              <!-- 编辑时原模型已被移出渠道的兜底项 -->
              <option
                v-if="isEdit && form.modelName && !chatModels.some((m) => m.name === form.modelName)"
                :value="form.modelName"
              >
                {{ form.modelName }}（已不在渠道中）
              </option>
            </select>
          </div>
        </div>
        <p class="text-muted text-xs -mt-2">
          渠道的接口地址与 API Key 在「渠道管理」中统一维护
        </p>
      </template>

      <!-- 无对话渠道的空态引导 -->
      <div
        v-else
        class="border border-dashed border-border rounded-xl px-4 py-5 text-sm text-muted flex flex-col gap-2"
      >
        <p>还没有可用的对话模型渠道（需要渠道下至少一个「对话」用途的模型）</p>
        <router-link
          to="/channels"
          class="text-accent-strong font-medium hover:underline"
        >
          前往渠道管理创建 →
        </router-link>
      </div>
```

- [ ] **Step 3: 构建 + lint**

Run: `cd D:/projects/personal-homepage && pnpm lint -- src/pages/Agents`
Expected: 0 errors（`pnpm build` 仍因 Task 10 未完成可能报 AgentsPage 的错，属预期）。

- [ ] **Step 4: Commit**

```bash
cd D:/projects/personal-homepage
git add src/pages/Agents/components/AgentFormDrawer.vue
git commit -m "feat(agents): Agent 表单改为渠道+对话模型两级选择器"
```

---

### Task 10: AgentsPage 卡片展示更新（前端）

**Files:**
- Modify: `D:\projects\personal-homepage\src\pages\Agents\AgentsPage.vue:68,222-224,233-236`

**Interfaces:**
- Consumes: Task 7 的 `Agent.channelName` / `Agent.modelName`。
- Produces: 无。

- [ ] **Step 1: 改展示**

1. 第 222-224 行 `{{ agent.model }}` → `{{ agent.modelName }}`
2. 第 234-236 行的 provider 标签：

```html
            <span class="px-2 py-1 rounded-md bg-accent-soft text-accent-strong text-xs font-medium">
              {{ agent.channelName ?? '未知渠道' }}
            </span>
```

3. 删除第 68 行附近的 `PROVIDER_LABELS` 常量（及文件顶部对 `AgentProvider` 的 import，如有）。

- [ ] **Step 2: 全量验证**

Run: `cd D:/projects/personal-homepage && pnpm build && pnpm lint`
Expected: 均通过，0 errors / 0 warnings（若还有旧字段引用残留，按报错位置清理）。

- [ ] **Step 3: Commit**

```bash
cd D:/projects/personal-homepage
git add src/pages/Agents/AgentsPage.vue
git commit -m "feat(agents): Agent 卡片展示渠道名与对话模型名"
```

---

### Task 11: ChannelsPage 渠道删除冲突弹窗（前端）

**Files:**
- Modify: `D:\projects\personal-homepage\src\pages\Channels\ChannelsPage.vue`（第 82-96 行删除逻辑 + 模板尾部）

**Interfaces:**
- Consumes: Task 2 的 400 响应形状 `{ message, referencingAgents: Array<{ id: string; name: string }> }`（axios error 的 `error.response.data`）。
- Produces: 无。

- [ ] **Step 1: 改删除逻辑**

`ChannelsPage.vue` 第 82-91 行的删除区块替换为：

```ts
// ---- 删除 ----
const deletingChannel = ref<AiChannelView | null>(null)

/** 删除被 Agent 引用时的冲突清单（后端 400 响应带出） */
const conflictAgents = ref<Array<{ id: string; name: string }> | null>(null)

const deleteMutation = useMutation({
  mutationFn: (id: string) => channelsApi.remove(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['ai-channels'] })
    deletingChannel.value = null
  },
  onError: (e) => {
    const data = (
      e as { response?: { data?: { referencingAgents?: Array<{ id: string; name: string }> } } }
    ).response?.data
    if (data?.referencingAgents?.length) {
      deletingChannel.value = null
      conflictAgents.value = data.referencingAgents
    }
    // 其他错误（网络/权限）复用 ConfirmDeleteModal 自身错误展示，deletingChannel 保持打开
  },
})

const openDelete = (channel: AiChannelView) => {
  deleteMutation.reset()
  deletingChannel.value = channel
}
```

- [ ] **Step 2: 加冲突弹窗模板**

模板尾部（`ConfirmDeleteModal` 之后）追加：

```html
    <!-- 渠道删除冲突：列出引用它的 Agent -->
    <div
      v-if="conflictAgents"
      class="od-modal-overlay"
      @click.self="conflictAgents = null"
    >
      <div class="od-card p-6 w-[min(92vw,420px)] flex flex-col gap-4">
        <h3 class="font-display font-bold text-[16px] text-fg">
          无法删除渠道
        </h3>
        <p class="text-muted text-sm">
          该渠道正被以下 Agent 引用，请先修改它们的模型渠道或删除这些 Agent：
        </p>
        <ul class="flex flex-col gap-2">
          <li
            v-for="a in conflictAgents"
            :key="a.id"
          >
            <router-link
              :to="`/agents/${a.id}`"
              class="text-accent-strong text-sm font-medium hover:underline"
              @click="conflictAgents = null"
            >
              {{ a.name }} →
            </router-link>
          </li>
        </ul>
        <button
          class="od-btn od-btn-ghost"
          @click="conflictAgents = null"
        >
          知道了
        </button>
      </div>
    </div>
```

- [ ] **Step 3: 全量验证**

Run: `cd D:/projects/personal-homepage && pnpm build && pnpm lint`
Expected: 均通过，0 errors / 0 warnings。

- [ ] **Step 4: Commit**

```bash
cd D:/projects/personal-homepage
git add src/pages/Channels/ChannelsPage.vue
git commit -m "feat(channels): 删除被引用渠道时弹出引用 Agent 清单"
```

---

### Task 12: 端到端验收 + 删列 + 活文档 + 文档同步

**Files:**
- Modify: `D:\projects\personal-homepage\CLAUDE.md`（项目结构段 Channels/Agents 两行注释）
- Create: `D:\projects\tuanzi-server-base\CONTEXT.md`
- Create: `D:\projects\tuanzi-server-base\docs\adr\0001-unify-llm-credentials-into-ai-channels.md`

**Interfaces:**
- Consumes: Task 1-11 全部。
- Produces: 无。

- [ ] **Step 1: 后端联调（`pnpm start:dev`，前端 `pnpm dev`），按以下用例手动验收**

| # | 用例 | 预期 |
|---|---|---|
| 1 | 建 OpenAI 兼容渠道，模型清单含一个「对话」用途模型 | 创建成功 |
| 2 | 建 Gemini 渠道，模型选「对话」用途 | 前端拦截提示「当前 API 格式不支持」 |
| 3 | 新建 Agent，选渠道 + 对话模型 | 创建成功，卡片显示渠道名 + 模型名 |
| 4 | 与该 Agent 流式对话 | 正常出流（说明 executor 渠道解析链路通） |
| 5 | 删除被该 Agent 引用的渠道 | 弹窗列出引用 Agent 清单，可点击跳转 |
| 6 | Agent 换模型（改下拉保存）再对话 | 用新模型回答 |
| 7 | 迁移脚本物化出的存量 Agent 直接对话 | 正常（验证迁移正确性） |
| 8 | 无 chat 渠道时打开新建 Agent 抽屉 | 显示「前往渠道管理创建」空态 |
| 9 | 画布生图节点选模型生成 | 不受影响（回归确认） |
| 10 | 同凭据多 Agent 的迁移渠道 | models 含全部去重后的模型（验证 Phase B 追加逻辑） |

- [ ] **Step 2: 删列（验收全部通过后执行，不可逆！）**

```bash
cd D:/projects/tuanzi-server-base && npx ts-node -r tsconfig-paths/register scripts/migrate-agent-channels.ts --drop-legacy
```

Expected 输出：`已删除旧列：provider, model, api_key_encrypted, base_url`。执行后重跑后端 `pnpm build && pnpm test` 确认无回归，并再验一遍用例 4（流式对话）。

- [ ] **Step 3: 核对 CONTEXT.md（词汇表）**

`D:\projects\tuanzi-server-base\CONTEXT.md` 已随 grilling 会话创建（术语：AiChannel / 用途 / Agent）。核对内容与实际实现一致即可；若实现中术语有漂移，按「用途」统一后更新该文件。

- [ ] **Step 4: 核对 ADR**

`D:\projects\tuanzi-server-base\docs\adr\0001-unify-llm-credentials-into-ai-channels.md` 已随 grilling 会话创建（含三个被否方案与删列后果）。核对最终实施与 ADR 描述一致；若实施中偏离（如校验规则变化），就地修订 ADR。

- [ ] **Step 5: CLAUDE.md 文档同步**

`D:\projects\personal-homepage\CLAUDE.md`：
- 结构段 `├── Channels/  # AI 渠道管理（卡片 + 抽屉表单，apiKey 只写不读）` 改为 `├── Channels/  # AI 渠道管理（全站唯一凭据入口：对话/图片/视频/音频用途模型 + apiKey 只写不读）`
- Agents 段落 `AgentFormDrawer.vue  # 创建/编辑抽屉（Esc 关闭，高级配置默认折叠）` 改为 `AgentFormDrawer.vue  # 创建/编辑抽屉（渠道+对话模型两级选择，高级配置默认折叠）`
- 「后端连接」端点清单中 `/api/agents/*`（CRUD）改为 `/api/agents/*`（CRUD，模型凭据引用 ai-channels）
- 版本号升 v3.7，日期更新为当天。

- [ ] **Step 6: 全量回归 + Commit**

```bash
cd D:/projects/tuanzi-server-base && pnpm test && pnpm build && pnpm lint
cd D:/projects/tuanzi-server-base
git add CONTEXT.md docs/adr scripts/migrate-agent-channels.ts
git commit -m "docs: 沉淀渠道统一化词汇表与 ADR-0001"

cd D:/projects/personal-homepage && pnpm build && pnpm lint
git add CLAUDE.md
git commit -m "docs: 同步渠道统一化后的 CLAUDE.md 至 v3.7"
```

---

## 自审记录

- **Spec coverage**：枚举扩展(T1) / chat 格式校验(T1,T8) / resolveChatModel(T2) / 删除引用保护+引用者清单(T2,T11) / 存量迁移+合并追加(T3) / 实体(T4) / executor(T5) / CRUD(T6) / 前端类型(T7) / 渠道表单(T8) / Agent 表单(T9) / 卡片(T10) / 验收+删列+活文档(T12) —— 全覆盖。grilling 六项拍板（最小校验/按凭据合并/「用途」术语/拦截+列引用者/验收后删列/CONTEXT+ADR）均已落到对应任务。
- **占位符扫描**：无 TBD/TODO；所有代码步骤含完整代码。
- **类型一致性**：`ResolvedChatModel`（T2 定义，T5 消费）、`resolveChatModel(userId, channelId, modelName)` 签名（T2/T5/T6 一致）、`getById`（T2 定义，T6 消费）、`referencingAgents` 响应形状（T2 定义，T11 消费）、`AgentResponseDto` ↔ 前端 `Agent`（T6/T7 字段一一对应）、`queryKey: ['ai-channels']`（T9 与 NodeConfigContent 一致）。
