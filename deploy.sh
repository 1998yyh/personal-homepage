#!/usr/bin/env bash
# 个人主页一键部署：本地构建 → 上传到服务器 /var/www/personal-homepage
# 用法: bash deploy.sh
set -euo pipefail

SERVER="root@43.140.214.49"
REMOTE_DIR="/var/www/personal-homepage"
# 生产环境接口走 nginx 同源反代，必须用这个值构建
export VITE_API_URL="/api"

cd "$(dirname "$0")"

# Vite 8 要求 Node >= 20.19 / 22.12，当前 shell 版本不够就用 n 管理的 22
NODE22="/usr/local/n/versions/node/22.22.0/bin"
node_major() { node -v 2>/dev/null | sed 's/v//;s/\..*//'; }
if ! command -v node >/dev/null || [ "$(node_major)" -lt 20 ]; then
  if [ -d "$NODE22" ]; then
    export PATH="$NODE22:$PATH"
    echo "==> 切换到 Node $(node -v)"
  else
    echo "ERROR: 需要 Node >= 20.19，且未找到 $NODE22" >&2
    exit 1
  fi
fi

echo "==> 构建 (VITE_API_URL=$VITE_API_URL, Node $(node -v))"
pnpm build

echo "==> 上传 dist -> $SERVER:$REMOTE_DIR"
ssh "$SERVER" "mkdir -p $REMOTE_DIR"
rsync -avz --delete dist/ "$SERVER:$REMOTE_DIR/"

echo "==> 验证"
status=$(curl -s -o /dev/null -w '%{http_code}' http://43.140.214.49/)
if [ "$status" = "200" ]; then
  echo "✅ 部署完成: http://43.140.214.49/ (HTTP $status)"
else
  echo "❌ 部署后访问异常: HTTP $status" >&2
  exit 1
fi
