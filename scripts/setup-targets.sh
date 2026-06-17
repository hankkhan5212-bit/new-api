#!/bin/bash
# ============================================================
# 目标机初始化脚本 (在 JumpServer 上运行)
# 用于在新目标机上安装 Docker + 部署项目文件
#
# 用法: bash scripts/setup-targets.sh [--init-only] [--dist-conf]
#   --init-only   仅安装 Docker（不拷贝项目文件）
#   --dist-conf   仅分发 .env / docker-compose 到目标机
#   (无参数)      完整初始化
# ============================================================

set -euo pipefail

if [ -n "${TARGETS:-}" ]; then
    TARGETS=($TARGETS)
else
    TARGETS=(10.0.3.6 10.0.1.9)
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DOCKER_RPM_DIR="/tmp/docker-rpms"

log() { echo ">>> [$(date '+%H:%M:%S')] $*"; }
err() { echo "!!! [$(date '+%H:%M:%S')] $*" >&2; }

# ---- 1. 在 JumpServer 上下载 Docker RPM 包 ----
download_docker_rpms() {
    log "Downloading Docker RPMs on JumpServer..."

    # 添加 Docker 仓库
    cat > /etc/yum.repos.d/docker-ce.repo << 'REPO'
[docker-ce-stable]
name=Docker CE Stable
baseurl=https://mirrors.aliyun.com/docker-ce/linux/centos/9/$basearch/stable
enabled=1
gpgcheck=1
gpgkey=https://mirrors.aliyun.com/docker-ce/linux/centos/gpg
REPO

    mkdir -p "${DOCKER_RPM_DIR}"
    yum install -y --downloadonly --downloaddir="${DOCKER_RPM_DIR}" \
        docker-ce docker-ce-cli containerd.io docker-compose-plugin 2>/dev/null || true

    # 如果上面不行，用 yumdownloader
    if [ -z "$(ls -A "${DOCKER_RPM_DIR}"/ 2>/dev/null)" ]; then
        log "Trying yumdownloader..."
        yum install -y dnf-utils 2>/dev/null || true
        yumdownloader --destdir="${DOCKER_RPM_DIR}" --resolve \
            docker-ce docker-ce-cli containerd.io docker-compose-plugin 2>/dev/null || true
    fi

    local count
    count=$(find "${DOCKER_RPM_DIR}" -name '*.rpm' | wc -l)
    if [ "${count}" -eq 0 ]; then
        err "Failed to download any Docker RPMs"
        return 1
    fi
    log "Downloaded ${count} RPMs to ${DOCKER_RPM_DIR}"
}

# ---- 2. 分发 RPM 到目标机并安装 ----
install_docker_on_target() {
    local host="$1"
    log "Installing Docker on ${host}..."

    # 挂载 cgroup (TencentOS 可能未自动挂载)
    ssh -o ConnectTimeout=10 root@"${host}" '
        if ! mountpoint -q /sys/fs/cgroup 2>/dev/null; then
            mkdir -p /sys/fs/cgroup
            mount -t cgroup2 none /sys/fs/cgroup 2>/dev/null || true
        fi
    '

    # 分发 RPM 包
    log "  Copying RPMs to ${host}..."
    ssh -o ConnectTimeout=10 root@"${host}" "mkdir -p ${DOCKER_RPM_DIR}"
    scp -o ConnectTimeout=10 "${DOCKER_RPM_DIR}"/*.rpm root@"${host}:${DOCKER_RPM_DIR}/"

    # 安装
    ssh -o ConnectTimeout=10 root@"${host}" "
        cd ${DOCKER_RPM_DIR}
        rpm -ivh --force --nodeps *.rpm 2>/dev/null || true
        yum localinstall -y *.rpm 2>/dev/null || true
        # 如果 yum 也没装上，逐个强制 rpm
        for rpm in *.rpm; do
            rpm -ivh --force --nodeps \"\$rpm\" 2>/dev/null || true
        done
    "

    # 验证
    ssh -o ConnectTimeout=10 root@"${host}" "
        systemctl enable docker --now 2>/dev/null || true
        docker --version && echo 'Docker OK' || echo 'Docker NOT installed'
    "
}

# ---- 3. 分发项目文件到目标机 ----
distribute_project_files() {
    local host="$1"
    log "Setting up project files on ${host}..."

    # 确保目标目录存在（分步可查错）
    ssh -o ConnectTimeout=10 root@"${host}" "mkdir -p /opt/new-api/data /opt/new-api/logs" || {
        err "Failed to create /opt/new-api on ${host}"
        return 1
    }

    log "  Copying docker-compose.prod.yml..."
    scp -o ConnectTimeout=10 "${PROJECT_DIR}/docker-compose.prod.yml" "root@${host}:/opt/new-api/" || {
        err "Failed to copy docker-compose.prod.yml to ${host}"
        return 1
    }

    log "  Copying .env.production..."
    scp -o ConnectTimeout=10 "${PROJECT_DIR}/.env.production" "root@${host}:/opt/new-api/" || {
        err "Failed to copy .env.production to ${host}"
        return 1
    }

    log "  Files copied OK to ${host}"

    # 提醒用户编辑 .env
    echo ""
    echo "  ⚠️  Please edit /opt/new-api/.env on ${host}"
    echo "     ssh root@${host}"
    echo "     cd /opt/new-api"
    echo "     cp .env.production .env"
    echo "     vi .env   # set real passwords and SESSION_SECRET"
    echo ""
}

# ---- 入口 ----

case "${1:-}" in
    --init-only)
        download_docker_rpms
        for host in "${TARGETS[@]}"; do
            install_docker_on_target "${host}"
        done
        ;;
    --dist-conf)
        for host in "${TARGETS[@]}"; do
            distribute_project_files "${host}"
        done
        ;;
    "")
        log "=== Full target machine setup ==="
        download_docker_rpms
        for host in "${TARGETS[@]}"; do
            install_docker_on_target "${host}"
            distribute_project_files "${host}"
        done
        log "Setup completed"
        echo ""
        echo "=== Next steps ==="
        echo "1. Edit /opt/new-api/.env on each target machine"
        echo "2. Run: bash scripts/deploy.sh"
        ;;
    *)
        echo "Usage: $0 [--init-only|--dist-conf]"
        exit 1
        ;;
esac
