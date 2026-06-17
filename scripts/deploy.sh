#!/bin/bash
# ============================================================
# New-API 部署脚本 (运行在 JumpServer 上)
#
# 用法:
#   ./deploy.sh              # 完整部署：构建 + 分发 + 重启
#   ./deploy.sh --build-only # 仅构建镜像
#   ./deploy.sh --dist-only  # 仅分发已有镜像
#   ./deploy.sh --restart    # 仅重启目标服务
#   ./deploy.sh --rollback   # 回滚到上一个版本
# ============================================================

set -euo pipefail

# ---- 配置 ----
PROJECT_DIR="/opt/new-api"
BACKUP_FILE="${PROJECT_DIR}/.prev_image_tag"
TARGETS=("10.0.3.6" "10.0.1.9")

# ---- 函数 ----

log() { echo ">>> [$(date '+%H:%M:%S')] $*"; }
err() { echo "!!! [$(date '+%H:%M:%S')] $*" >&2; }

build_image() {
    cd "${PROJECT_DIR}"

    log "Pulling latest code..."
    git checkout main
    git pull origin main

    TAG="$(date +'%Y%m%d%H%M%S')-$(git rev-parse --short HEAD)"
    IMAGE="new-api:${TAG}"
    log "Building image: ${IMAGE}"

    docker build -t "${IMAGE}" .

    # 保存当前 tag，供回滚使用 (覆盖)
    echo "${IMAGE}" > "${BACKUP_FILE}"
    log "Image built: ${IMAGE}"
}

distribute_image() {
    local IMAGE
    IMAGE=$(cat "${BACKUP_FILE}")
    log "Distributing: ${IMAGE}"

    for host in "${TARGETS[@]}"; do
        log "--- Distributing to ${host} ---"
        docker save "${IMAGE}" | ssh -o ConnectTimeout=10 root@"${host}" "docker load"
    done
}

restart_services() {
    local IMAGE
    IMAGE=$(cat "${BACKUP_FILE}")
    local TAG="${IMAGE#new-api:}"

    for host in "${TARGETS[@]}"; do
        log "--- Restarting on ${host} ---"
        ssh -o ConnectTimeout=10 root@"${host}" "
            cd /opt/new-api || exit 1
            sed -i \"s|^IMAGE_TAG=.*|IMAGE_TAG=${TAG}|\" .env
            docker compose -f docker-compose.prod.yml up -d
            docker image prune -f
        "
        log "--- ${host} OK ---"
    done
}

rollback() {
    log "Rolling back to previous image..."
    for host in "${TARGETS[@]}"; do
        log "--- Rolling back ${host} ---"
        ssh -o ConnectTimeout=10 root@"${host}" "
            cd /opt/new-api || exit 1
            # 取得上一次的镜像（当前运行中的镜像之前的那个）
            CURRENT_TAG=\$(grep '^IMAGE_TAG=' .env | cut -d= -f2)
            ALL_IMAGES=\$(docker images --format '{{.Repository}}:{{.Tag}}' | grep '^new-api:' | grep -v \"\$CURRENT_TAG\" | sort -r | head -1)
            if [ -z \"\$ALL_IMAGES\" ]; then
                echo 'No previous image found for rollback'
                exit 1
            fi
            PREV_TAG=\"\${ALL_IMAGES#new-api:}\"
            sed -i \"s|^IMAGE_TAG=.*|IMAGE_TAG=\${PREV_TAG}|\" .env
            docker compose -f docker-compose.prod.yml up -d
        "
    done
    log "Rollback completed"
}

# ---- 入口 ----

case "${1:-}" in
    --build-only)
        build_image
        ;;
    --dist-only)
        if [ ! -f "${BACKUP_FILE}" ]; then
            err "No previous build found. Run with --build-only first."
            exit 1
        fi
        distribute_image
        ;;
    --restart)
        if [ ! -f "${BACKUP_FILE}" ]; then
            err "No previous build found. Run with --build-only first."
            exit 1
        fi
        restart_services
        ;;
    --rollback)
        rollback
        ;;
    "")
        log "Full deployment started"
        build_image
        distribute_image
        restart_services
        log "Full deployment completed"
        ;;
    *)
        echo "Usage: $0 [--build-only|--dist-only|--restart|--rollback]"
        exit 1
        ;;
esac
