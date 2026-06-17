#!/bin/bash
# ============================================================
# 本地构建 + 部署脚本 (在你的 Mac 上运行)
#
# 用法:
#   bash scripts/build-and-deploy.sh
# ============================================================

set -euo pipefail

JUMP_HOST="43.128.122.99"
JUMP_PORT="36000"
TAR_FILE="/tmp/new-api-build.tar"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

log() { echo ">>> [$(date '+%H:%M:%S')] $*"; }
err() { echo "!!! [$(date '+%H:%M:%S')] $*" >&2; }

# ---- 构建 ----
log "Building Docker image..."
cd "${PROJECT_DIR}"

TAG="$(date +'%Y%m%d%H%M%S')-$(git rev-parse --short HEAD)"
docker build -t "new-api:${TAG}" .
log "Image built: new-api:${TAG}"

# ---- 导出 tar ----
log "Exporting to ${TAR_FILE}..."
docker save "new-api:${TAG}" -o "${TAR_FILE}"

file_size=$(du -h "${TAR_FILE}" | cut -f1)
log "Tar size: ${file_size}"

# ---- 上传到 JumpServer ----
log "Uploading to JumpServer..."
scp -P "${JUMP_PORT}" -o ConnectTimeout=30 "${TAR_FILE}" "root@${JUMP_HOST}:/tmp/"

# ---- 触发 JumpServer 分发 ----
log "Triggering deployment..."
ssh -p "${JUMP_PORT}" -o ConnectTimeout=10 root@"${JUMP_HOST}" "
    cd /opt/new-api || { echo 'ERROR: /opt/new-api not found'; exit 1; }
    git checkout main
    git pull origin main
    bash scripts/deploy.sh --dist-from-tar ${TAR_FILE}
"

# ---- 本地清理 ----
rm -f "${TAR_FILE}"
docker rmi "new-api:${TAG}" 2>/dev/null || true

log "Done! Image new-api:${TAG} deployed to 10.0.3.6 and 10.0.1.9"
