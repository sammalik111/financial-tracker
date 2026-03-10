#!/bin/bash
set -euo pipefail

APP_USER="ubuntu"
APP_NAME="jobsignal"
APP_DIR="/home/${APP_USER}/my_app"
APP_PORT="3000"
REPO_URL="https://github.com/sammalik111/financial-tracker.git"
REPO_BRANCH="main"
DOMAIN_NAME=""

exec > >(tee /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1

echo "=============================="
echo "BOOTSTRAP START $(date)"
echo "=============================="

export DEBIAN_FRONTEND=noninteractive

echo "[1] Updating apt..."
apt-get update -y || { echo "APT UPDATE FAILED"; exit 1; }
apt-get upgrade -y || { echo "APT UPGRADE FAILED"; exit 1; }
apt-get install -y curl git rsync ca-certificates gnupg || { echo "APT INSTALL FAILED"; exit 1; }
echo "[1] APT COMPLETE"

# ---------------- NODE 20 ----------------
echo "[2] Installing Node..."
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "Node Version: $(node -v)"
echo "NPM Version:  $(npm -v)"
echo "Node Path: $(which node)"
echo "NPM Path:  $(which npm)"

# ---------------- CLONE / PULL REPO ----------------
echo "[3] Preparing app directory..."
mkdir -p "${APP_DIR}"
chown -R ${APP_USER}:${APP_USER} "${APP_DIR}"
echo "Directory exists? $(ls -ld ${APP_DIR})"

echo "[4] Cloning / Updating Repo..."
if [ ! -d "${APP_DIR}/.git" ]; then
  sudo -u ${APP_USER} git clone --depth 1 --branch "${REPO_BRANCH}" "${REPO_URL}" "${APP_DIR}" \
    || { echo "GIT CLONE FAILED"; exit 1; }
else
  sudo -u ${APP_USER} git -C "${APP_DIR}" fetch --all
  sudo -u ${APP_USER} git -C "${APP_DIR}" reset --hard origin/${REPO_BRANCH}
fi

echo "Repo contents:"
ls -la "${APP_DIR}"

cd "${APP_DIR}"

# ---------------- INSTALL ----------------
# NOTE: Do NOT use --omit=dev — Next.js needs devDependencies to build
# NOTE: Use npm install, not npm ci — repo may not have a package-lock.json
echo "[5] Installing dependencies..."

if [ ! -f "package.json" ]; then
  echo "ERROR: package.json not found — the repo on GitHub still has the old code."
  echo "Push the new jobsignal files to GitHub first, then re-run bootstrap."
  ls -la "${APP_DIR}"
  exit 1
fi

echo "package.json found ✔  ($(grep '"name"' package.json || echo 'no name field'))"
sudo -u ${APP_USER} npm install || { echo "NPM INSTALL FAILED"; exit 1; }
echo "Node Modules Count: $(ls node_modules | wc -l)"

# ---------------- BUILD ----------------
echo "[6] Running Next build..."
sudo -u ${APP_USER} npm run build || { echo "BUILD FAILED"; exit 1; }

if [ -d ".next" ]; then
  echo ".next folder exists ✔"
else
  echo ".next folder MISSING ✘"
  exit 1
fi

# ---------------- ENV FILE ----------------
echo "[7] Creating ENV file..."
ENV_FILE="/etc/${APP_NAME}.env"

cat > "${ENV_FILE}" <<EOF
NODE_ENV=production
PORT=${APP_PORT}
AWS_REGION=us-east-1

# DynamoDB tables (created via scripts/create-tables.sh)
DYNAMODB_TABLE_CACHE=jmi-cache
DYNAMODB_TABLE_EVENTS=jmi-events

# CloudWatch logging
CLOUDWATCH_LOG_GROUP=/jobsignal/app

# Cache and HTTP tuning
CACHE_TTL_SECONDS=600
HTTP_TIMEOUT_MS=8000
HTTP_RETRY_COUNT=3

# App name
NEXT_PUBLIC_APP_NAME=JobSignal

# -------------------------------------------------------
# IMPORTANT: Add your API credentials below.
# After adding them, run: sudo systemctl restart jobsignal
#
# Adzuna (free tier: 250 req/day)  → https://developer.adzuna.com
# JSearch/LinkedIn via RapidAPI    → https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
# -------------------------------------------------------
ADZUNA_APP_ID=
ADZUNA_API_KEY=
RAPIDAPI_KEY=
EOF

# AWS credentials come automatically from the EC2 IAM role (AdminSDK).
# Never put AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY here.

chown root:${APP_USER} "${ENV_FILE}"
chmod 640 "${ENV_FILE}"
echo "ENV FILE CREATED:"
cat "${ENV_FILE}"

# ---------------- SYSTEMD SERVICE ----------------
echo "[8] Creating systemd service..."
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
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/env npx next start -p ${APP_PORT}
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=false

[Install]
WantedBy=multi-user.target
EOF

echo "Service file written:"
cat "${SERVICE_FILE}"

systemctl daemon-reload
systemctl enable ${APP_NAME}
systemctl start ${APP_NAME}

echo "Service status:"
systemctl status ${APP_NAME} --no-pager || echo "SERVICE FAILED — check: journalctl -u ${APP_NAME} -n 50"

# ---------------- CADDY ----------------
echo "[9] Installing Caddy..."
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https

curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
  | tee /etc/apt/sources.list.d/caddy-stable.list

apt-get update -y
apt-get install -y caddy

echo "[10] Writing Caddy config..."
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

echo "Caddyfile:"
cat "$CADDYFILE"

systemctl enable caddy
systemctl restart caddy
systemctl status caddy --no-pager || echo "CADDY FAILED"

# ---------------- DONE ----------------
echo "=============================="
echo "BOOTSTRAP COMPLETE $(date)"
echo "=============================="
echo ""
echo "Next steps:"
echo "  1. Add Adzuna credentials: sudo nano /etc/${APP_NAME}.env"
echo "  2. Restart app:            sudo systemctl restart ${APP_NAME}"
echo "  3. Check logs:             journalctl -u ${APP_NAME} -f"
echo "  4. Health check:           curl http://localhost:${APP_PORT}/api/health"
