#!/usr/bin/env bash
# One-time Lightsail (Ubuntu 22.04) provisioning. Run as the default sudo user (ubuntu):
#   sudo bash provision.sh <static-ip-with-dashes e.g. 13-233-10-5> <letsencrypt-email>
# Hosts become app.<ip>.sslip.io and api.<ip>.sslip.io. Safe to re-run.
set -euo pipefail

IP_DASHED="${1:?usage: provision.sh <ip-with-dashes> <email>}"
EMAIL="${2:?usage: provision.sh <ip-with-dashes> <email>}"
APP_HOST="app.${IP_DASHED}.sslip.io"
API_HOST="api.${IP_DASHED}.sslip.io"
DEPLOY_USER="${SUDO_USER:-ubuntu}"
DB_NAME=arth
DB_USER=arth

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git nginx certbot python3-certbot-nginx ufw postgresql postgresql-contrib build-essential

# Node 22 + pm2
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
command -v pm2 >/dev/null || npm install -g pm2

# Swap (small instances run out of memory during npm ci / prisma generate)
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q /swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Firewall
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable

# Postgres: DB + role. Password is generated once and stored in the shared env dir.
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" /srv/arth /srv/arth/releases /srv/arth/shared /srv/arth/shared/uploads
if [ ! -f /srv/arth/shared/.db_password ]; then
  head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32 > /srv/arth/shared/.db_password
  chown "$DEPLOY_USER" /srv/arth/shared/.db_password && chmod 600 /srv/arth/shared/.db_password
fi
DB_PASS="$(cat /srv/arth/shared/.db_password)"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}'"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}"

# Env file skeletons (never overwritten). Fill in secrets by hand: nano /srv/arth/shared/.env.api
if [ ! -f /srv/arth/shared/.env.api ]; then
  cat > /srv/arth/shared/.env.api <<EOF
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}
JWT_ACCESS_SECRET=$(head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 48)
OWM_API_KEY=CHANGE_ME
UPLOAD_DIR=/srv/arth/shared/uploads
CORS_ORIGIN=https://${APP_HOST}
WEB_URL=https://${APP_HOST}
APPROVED_PLANTING_LOCATION_CHECK_ENABLED=true
DUPLICATE_PLANTING_CHECK_ENABLED=true
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=
# RESEND_API_KEY=
# EMAIL_FROM=
# GEMINI_API_KEY=
EOF
fi
if [ ! -f /srv/arth/shared/.env.web ]; then
  cat > /srv/arth/shared/.env.web <<EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}
API_URL=http://127.0.0.1:4000
# NEXT_PUBLIC_* are baked in at build time by CI (GitHub repo variables); listed here for reference only.
# RESEND_API_KEY=
# EMAIL_FROM=
EOF
fi
chown "$DEPLOY_USER" /srv/arth/shared/.env.* && chmod 600 /srv/arth/shared/.env.*

# Nginx (HTTP first; certbot adds TLS and the redirect)
sed -e "s/__APP_HOST__/${APP_HOST}/g" -e "s/__API_HOST__/${API_HOST}/g" "$(dirname "$0")/nginx.conf" > /etc/nginx/sites-available/arth
ln -sf /etc/nginx/sites-available/arth /etc/nginx/sites-enabled/arth
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
certbot --nginx --non-interactive --agree-tos -m "$EMAIL" --redirect -d "$APP_HOST" -d "$API_HOST"

# Nightly backups: DB dump + uploads, 7-day retention
install -d -o postgres -g postgres /var/backups/arth
cat > /etc/cron.d/arth-backup <<'EOF'
15 3 * * * postgres pg_dump -Fc arth > /var/backups/arth/db-$(date +\%F).dump
25 3 * * * root tar -czf /var/backups/arth/uploads-$(date +\%F).tgz -C /srv/arth/shared uploads
35 3 * * * root find /var/backups/arth -type f -mtime +7 -delete
EOF

# pm2 on boot as the deploy user
sudo -u "$DEPLOY_USER" pm2 startup systemd -u "$DEPLOY_USER" --hp "/home/${DEPLOY_USER}" | tail -1 | bash || true

echo
echo "Done. App: https://${APP_HOST}   API: https://${API_HOST}"
echo "Next: edit /srv/arth/shared/.env.api (OWM_API_KEY, Stripe, Resend, Gemini), then trigger the Deploy workflow."
