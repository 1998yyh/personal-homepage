import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import net from 'node:net'

// macOS 的 BSD socket 大坑：别人绑 127.0.0.1:PORT（如 vite 默认 host）时，
// 我们再绑 0.0.0.0:PORT 内核居然不报错——Vite 自带的端口检测按自己的 host 试绑，
// 测不出这种「半占用」，于是不顺延。但 localhost 流量按「具体绑定优先」全进了
// 隔壁项目，你打开 localhost:5173 看到的根本不是本项目！
// 所以端口自己探：127.0.0.1 与 0.0.0.0 两个地址族都能绑才算真空闲，否则顺延。
function canBind(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = net.createServer()
    srv.once('error', () => resolve(false))
    srv.once('listening', () => srv.close(() => resolve(true)))
    srv.listen(port, host)
  })
}

async function findFreePort(start: number): Promise<number> {
  for (let port = start; port < start + 100; port++) {
    if ((await canBind(port, '127.0.0.1')) && (await canBind(port, '0.0.0.0'))) {
      return port
    }
  }
  throw new Error(`从 ${start} 起连续 100 个端口全被占了，离谱`)
}

export default defineConfig(async ({ mode, command }) => {
  // 读当前 mode 的 env（如 .env.online），配了 VITE_PROXY_TARGET 就开代理
  const env = loadEnv(mode, __dirname, '')
  const proxyTarget = env.VITE_PROXY_TARGET

  // 仅 dev server 需要探测；build/preview 不掺和
  const port = command === 'serve' ? await findFreePort(5173) : 5173
  if (command === 'serve' && port !== 5173) {
    console.log(`[vite-config] 5173 被占（含 127.0.0.1 半占用），顺延至 ${port}`)
  }

  return {
    plugins: [vue()],
    server: {
      host: '0.0.0.0', // 监听所有网络接口
      port,
      strictPort: true, // 端口上面已探明空闲，禁止 Vite 再自作主张（它测不出半占用）
      ...(proxyTarget
        ? {
            proxy: {
              // /uploads 不在 /api 前缀下（媒体静态目录），两条都得代理
              '/api': { target: proxyTarget, changeOrigin: true },
              '/uploads': { target: proxyTarget, changeOrigin: true },
            },
          }
        : {}),
    },
  }
})
