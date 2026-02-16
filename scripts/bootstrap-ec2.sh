#!/usr/bin/env bash
# EC2 User-Data bootstrap — Amazon Linux 2023 / Ubuntu 22.04
# Paste this as User Data when launching your EC2 instance.
# Prerequisites: IAM role with ec2-role-policy.json attached, DynamoDB tables created.
set -euo pipefail
APP_DIR="/opt/fintrack"
APP_USER="appuser"
REPO_URL="${REPO_URL:-https://github.com/sammalik111/financial-tracker.git}"
BRANCH="${BRANCH:-main}"
REGION="${AWS_REGION:-us-east-1}"
log() { echo "[bootstrap] $(date -u +%T) $*"; }

# 1. Node.js 20
log "Installing Node.js 20…"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null || true
apt-get install -y nodejs 2>/dev/null || dnf install -y nodejs

# 2. PM2
npm install -g pm2

# 3. CloudWatch agent
wget -q https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb \
  -O /tmp/cwa.deb && dpkg -i /tmp/cwa.deb 2>/dev/null || true

# 4. App user
id -u "$APP_USER" &>/dev/null || useradd -r -m -s /bin/bash "$APP_USER"
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# 5. Clone & build
sudo -u "$APP_USER" bash -c "
  cd $APP_DIR
  git clone --branch $BRANCH --depth 1 $REPO_URL . 2>/dev/null || git pull
  npm ci
  npm run build
"

# 6. Write env
cat > "$APP_DIR/.env.production" <<EOF
NODE_ENV=production
AWS_REGION=$REGION
DYNAMODB_TABLE_TRANSACTIONS=ft-transactions
DYNAMODB_TABLE_ACCOUNTS=ft-accounts
DYNAMODB_TABLE_EVENTS=ft-events
CLOUDWATCH_LOG_GROUP=/financial-tracker/app
NEXT_PUBLIC_APP_NAME=FinTrack
NEXT_PUBLIC_CURRENCY=USD
EOF
chown "$APP_USER:$APP_USER" "$APP_DIR/.env.production"

# 7. PM2
cat > "$APP_DIR/ecosystem.config.js" <<'EOF'
module.exports = { apps: [{ name: 'fintrack', script: 'node_modules/.bin/next',
  args: 'start -p 3000', cwd: '/opt/fintrack', instances: 'max',
  exec_mode: 'cluster', env_file: '/opt/fintrack/.env.production',
  out_file: '/opt/fintrack/logs/app.log', error_file: '/opt/fintrack/logs/error.log',
  merge_logs: true, max_restarts: 10, restart_delay: 3000 }] };
EOF

sudo -u "$APP_USER" bash -c "cd $APP_DIR && pm2 start ecosystem.config.js && pm2 save"
pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" | tail -1 | bash || true

log "✓ FinTrack running on port 3000"
