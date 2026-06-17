#!/bin/bash
# ============================================================
# 部署脚本 (运行在 JumpServer 上，不负责构建)
# 构建移到 Mac 或 GitHub Actions 完成
#
# 用法:
#   bash scripts/deploy.sh --dist-from-tar /tmp/new-api.tar   # 从 tar 分发 + 重启
#   bash scripts/deploy.sh --restart TAG                      # 重启指定版本
#   bash scripts/deploy.sh --rollback                         # 回滚
# ============================================================

set -euo pipefail

PROJECT_DIR="/opt/new-api"
BACKUP_FILE="${PROJECT_DIR}/.prev_image_tag"
TARGETS=(10.0.3.6 10.0.1.9)

log() { echo ">>> [$(date '+%H:%M:%S')] $*"; }
err() { echo "!!! [$(date '+%H:%M:%S')] $*" >&2; }

# ---- 从 tar 文件加载镜像，打 tag，分发，重启 ----
deploy_from_tar() {
    local tar_file="$1"

    [[ -f "${tar_file}" ]] || { err "Tar file not found: ${tar_file}"; exit 1; }

    log "Loading image from ${tar_file}..."

    # 一次性加载并提取镜像名
    local load_output
    load_output=$(docker load -i "${tar_file}" 2>&1)
    local src_image
    src_image=$(echo "${load_output}" | grep 'Loaded image:' | sed 's/Loaded image: //' | head -1)

    TAG="$(date +'%Y%m%d%H%M%S')-loaded"
    log "Loaded: ${src_image} -> new-api:${TAG}"

    docker tag "${src_image}" "new-api:${TAG}"
    echo "new-api:${TAG}" > "${BACKUP_FILE}"

    distribute_image "new-api:${TAG}"
    restart_services "${TAG}"

    # 清理
    rm -f "${tar_file}"
    log "Deployment completed"
}

# ---- 分发镜像到目标机 ----
distribute_image() {
    local image="$1"
    log "Distributing ${image} to targets..."

    for host in "${TARGETS[@]}"; do
        log "--- ${host} ---"
        docker save "${image}" | ssh -o ConnectTimeout=10 root@"${host}" "docker load"
    done
}

# ---- 重启目标服务 ----
restart_services() {
    local tag="$1"

    for host in "${TARGETS[@]}"; do
        log "--- Restarting on ${host} ---"
        ssh -o ConnectTimeout=10 root@"${host}" "
            cd /opt/new-api || exit 1
            sed -i \"s|^IMAGE_TAG=.*|IMAGE_TAG=${tag}|\" .env
            docker compose -f docker-compose.prod.yml up -d
            docker image prune -f
        "
        log "--- ${host} OK ---"
    done
}

# ---- 回滚 ----
rollback() {
    log "Rolling back..."
    for host in "${TARGETS[@]}"; do
        log "--- Rolling back ${host} ---"
        ssh -o ConnectTimeout=10 root@"${host}" "
            cd /opt/new-api || exit 1
            CURRENT_TAG=\$(grep '^IMAGE_TAG=' .env | cut -d= -f2)
            PREV_IMAGE=\$(docker images --format '{{.Repository}}:{{.Tag}}' | grep '^new-api:' | grep -v \"\$CURRENT_TAG\" | sort -r | head -1)
            if [ -z \"\$PREV_IMAGE\" ]; then
                echo 'No previous image for rollback'
                exit 1
            fi
            PREV_TAG=\"\${PREV_IMAGE#new-api:}\"
            sed -i \"s|^IMAGE_TAG=.*|IMAGE_TAG=\${PREV_TAG}|\" .env
            docker compose -f docker-compose.prod.yml up -d
        "
    done
    log "Rollback completed"
}

# ---- 入口 ----
case "${1:-}" in
    --dist-from-tar)
        [[ -n "${2:-}" ]] || { echo "Usage: $0 --dist-from-tar <tar_file>"; exit 1; }
        deploy_from_tar "$2"
        ;;
    --restart)
        [[ -n "${2:-}" ]] || { echo "Usage: $0 --restart <TAG>"; exit 1; }
        restart_services "$2"
        ;;
    --rollback)
        rollback
        ;;
    *)
        echo "Usage: $0 [--dist-from-tar <tar>|--restart <tag>|--rollback]"
        exit 1
        ;;
esac
