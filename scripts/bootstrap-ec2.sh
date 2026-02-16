#!/bin/bash
set -euo pipefail

APP_USER="ubuntu"
APP_NAME="jobsignal"
APP_DIR="/home/${APP_USER}/my_app"
APP_PORT="3000"
REPO_URL="https://github.com/sammalik111/financial-tracker.git"
REPO_BRANCH="main"
DOMAIN_NAME=""   # optional

exec > >(tee /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1

echo "=== BOOTSTRAP START ==="

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git ca-certificates

# ---------------- NODE 20 ----------------
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node -v) | NPM: $(npm -v)"

# ---------------- CLONE / PULL ----------------
mkdir -p "${APP_DIR}"
chown -R ${APP_USER}:${APP_USER} "${APP_DIR}"

if [ ! -d "${APP_DIR}/.git" ]; then
  sudo -u ${APP_USER} git clone --depth 1 --branch "${REPO_BRANCH}" "${REPO_URL}" "${APP_DIR}"
else
  sudo -u ${APP_USER} git -C "${APP_DIR}" fetch --all
  sudo -u ${APP_USER} git -C "${APP_DIR}" reset --hard origin/${REPO_BRANCH}
fi

cd "${APP_DIR}"

# ---------------- INSTALL + BUILD ----------------
sudo -u ${APP_USER} npm ci
sudo -u ${APP_USER} npm run build

# ---------------- ENV FILE ----------------
# AWS credentials come from the EC2 IAM role (AdminSDK) automatically.
# Only non-secret config goes here.
ENV_FILE="/etc/${APP_NAME}.env"
cat > "${ENV_FILE}" <<EOF
NODE_ENV=production
PORT=${APP_PORT}
AWS_REGION=us-east-1
DYNAMODB_TABLE_CACHE=jmi-cache
DYNAMODB_TABLE_EVENTS=jmi-events
CLOUDWATCH_LOG_GROUP=/jobsignal/app
CACHE_TTL_SECONDS=600
HTTP_TIMEOUT_MS=8000
HTTP_RETRY_COUNT=3
NEXT_PUBLIC_APP_NAME=JobSignal
EOF

# IMPORTANT: Add your Adzuna credentials here after first boot, then restart:
# echo "ADZUNA_APP_ID=xxx" >> ${ENV_FILE}
# echo "ADZUNA_API_KEY=yyy" >> ${ENV_FILE}
# systemctl restart ${APP_NAME}

chown root:${APP_USER} "${ENV_FILE}"
chmod 640 "${ENV_FILE}"

# ---------------- SYSTEMD ----------------
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=JobSignal — Job Market Intelligence
After=network.target

[Service]
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/npx next start -p ${APP_PORT}
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=false

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ${APP_NAME}
systemctl start ${APP_NAME}

# ---------------- CADDY ----------------
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update -y && apt-get install -y caddy

CADDYFILE="/etc/caddy/Caddyfile"
if [ -n "$DOMAIN_NAME" ]; then
  cat > "$CADDYFILE" <<EOF
$DOMAIN_NAME {
  reverse_proxy localhost:${APP_PORT}
}
EOF
else
  cat > "$CADDYFILE" <<EOF
:80 {
  reverse_proxy localhost:${APP_PORT}
}
EOF
fi

systemctl enable caddy && systemctl restart caddy

echo "=== BOOTSTRAP COMPLETE — JobSignal running on :${APP_PORT} ==="
