/* 验证用 mock API：仅覆盖 Agent 聊天页所需端点，SSE 逐 delta 滴送模拟真实流式 */
import http from 'node:http';

const PORT = 3100;

const cors = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const json = (res, body, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const agent = {
  id: 'agent-1',
  name: '渲染验证 Agent',
  description: 'mock',
  channelId: 'ch-1',
  channelName: 'mock-channel',
  apiFormat: 'openai',
  modelName: 'mock-model',
  systemPrompt: null,
  maxTokens: 4096,
  maxIterations: 5,
  enabledTools: [],
  mcpServers: [],
  isActive: true,
  createdAt: '2026-08-15T00:00:00.000Z',
  updatedAt: '2026-08-15T00:00:00.000Z',
};

const conversation = {
  id: 'conv-1',
  agentConfigId: 'agent-1',
  title: '历史会话',
  status: 'active',
  createdAt: '2026-08-15T00:00:00.000Z',
  updatedAt: '2026-08-15T00:00:00.000Z',
};

const historyAssistant = [
  '这是**历史消息**的 markdown 渲染：',
  '',
  '```ts',
  'const greet = (name: string) => `你好，${name}`;',
  '```',
  '',
  '- 列表项一',
  '- 列表项二',
].join('\n');

// DESC：最新在前
const baseMessages = [
  {
    id: 'm2',
    role: 'assistant',
    content: historyAssistant,
    toolCalls: null,
    toolCallId: null,
    totalTokens: 1234,
    createdAt: '2026-08-15T00:01:00.000Z',
  },
  {
    id: 'm1',
    role: 'user',
    content: '给我一段代码和一个列表',
    toolCalls: null,
    toolCallId: null,
    totalTokens: null,
    createdAt: '2026-08-15T00:00:30.000Z',
  },
];

/** 已发送的用户消息（POST 后并入后续 GET，模拟后端落库） */
const postedMessages = [];

function messagesPayload() {
  const items = [...postedMessages.slice().reverse(), ...baseMessages];
  return { items, total: items.length, page: 1, limit: 30, totalPages: 1 };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 流式回答全文（含多段落 / 代码围栏 / 列表 / 行内代码） */
const reply = [
  '好的，这是一段**流式输出**的长回答，用来验证块级增量渲染。',
  '',
  '第一段先给一点行内样式：`const x = 1` 和 *斜体* 与 **粗体**。',
  '',
  '```ts',
  '// 代码块在流式期间逐行到达',
  'function fib(n: number): number {',
  '  return n <= 1 ? n : fib(n - 1) + fib(n - 2);',
  '}',
  '```',
  '',
  '代码块之后再来一个列表：',
  '',
  '- 第一项：段落闭合后 DOM 不再重建',
  '- 第二项：只有尾块在重渲染',
  '- 第三项：流结束后整文重渲一次',
  '',
  '最后一段收尾，验证 end 后内容完整。',
].join('\n');

async function streamReply(res, userContent) {
  let aborted = false;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.on('close', () => { aborted = true; }); // 客户端断流（停止生成）后停止写入
  const send = async (event, data) => {
    if (aborted) return;
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch { /* 客户端已断开 */ }
    await sleep(80);
  };
  await send('message_start', { role: 'assistant' });
  // 小步滴送：每次 5-9 个字符，模拟真实 token 流
  for (let i = 0; i < reply.length; i += 7) {
    await send('text_delta', { text: reply.slice(i, i + 7) });
  }
  await send('message_end', {
    content: reply,
    toolCalls: null,
    totalTokens: 5678,
    conversationId: 'conv-1',
  });
  // 模拟后端落库：后续 GET 能拉到这对消息
  const now = new Date().toISOString();
  postedMessages.push(
    { id: `u${now}`, role: 'user', content: userContent, toolCalls: null, toolCallId: null, totalTokens: null, createdAt: now },
    { id: `a${now}`, role: 'assistant', content: reply, toolCalls: null, toolCallId: null, totalTokens: 5678, createdAt: now },
  );
  res.end();
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  if (path === '/api/auth/profile') {
    return json(res, { id: 'u1', email: 'mock@test.com', username: 'MockUser' });
  }
  if (path === '/api/agents/agent-1') {
    return json(res, agent);
  }
  if (path === '/api/agents/agent-1/conversations') {
    return json(res, { items: [conversation], total: 1, page: 1, limit: 20, totalPages: 1 });
  }
  if (path === '/api/conversations/conv-1/messages' && req.method === 'GET') {
    return json(res, messagesPayload());
  }
  if (path === '/api/conversations/conv-1/messages' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const userContent = JSON.parse(body || '{}').content ?? '';
    return streamReply(res, userContent);
  }
  json(res, { message: `no mock for ${req.method} ${path}` }, 404);
});

server.listen(PORT, () => console.log(`mock api on :${PORT}`));
