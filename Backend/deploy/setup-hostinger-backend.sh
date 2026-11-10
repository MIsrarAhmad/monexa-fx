#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this setup script as root from the Hostinger VPS."
  exit 1
fi

APP_ROOT="/var/www/monexafx"
BACKEND_ROOT="${APP_ROOT}/Backend"
DEPLOY_ROOT="${APP_ROOT}/backend-deploy"
SERVICE_NAME="monexa-backend.service"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}"
SUDOERS_FILE="/etc/sudoers.d/monexa-backend-deploy"
ENV_FILE="/etc/monexa-fx/backend.env"
BACKUP_DIR="/var/backups/monexa-fx"

for required in \
  "${BACKEND_ROOT}/server.js" \
  "${BACKEND_ROOT}/.env" \
  "${BACKEND_ROOT}/package-lock.json"
do
  if [[ ! -f "${required}" ]]; then
    echo "Required backend file is missing: ${required}"
    exit 1
  fi
done

for command_name in node npm pm2 systemctl visudo curl install groupadd useradd usermod; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Required command is missing: ${command_name}"
    exit 1
  fi
done

NODE_BIN="$(command -v node)"
PM2_BIN="$(command -v pm2)"

if ! curl --fail --silent --show-error --max-time 5 http://127.0.0.1:5000/ >/dev/null; then
  echo "The existing backend health check failed; no migration was performed."
  exit 1
fi

mapfile -t PM2_IDS < <(
  PM2_BIN="${PM2_BIN}" TARGET="${BACKEND_ROOT}/server.js" "${NODE_BIN}" -e '
    const { execFileSync } = require("node:child_process");
    const path = require("node:path");
    const apps = JSON.parse(execFileSync(process.env.PM2_BIN, ["jlist"], { encoding: "utf8" }));
    const target = path.resolve(process.env.TARGET);
    for (const app of apps) {
      const env = app.pm2_env || {};
      const script = path.resolve(env.pm_cwd || "/", env.pm_exec_path || "");
      if (script === target) console.log(String(app.pm_id));
    }
  '
)

if [[ "${#PM2_IDS[@]}" -ne 1 ]]; then
  echo "Expected exactly one PM2 process for ${BACKEND_ROOT}/server.js; found ${#PM2_IDS[@]}."
  echo "No process was stopped. Inspect the VPS PM2 process list before retrying."
  exit 1
fi

if getent passwd monexa-backend >/dev/null 2>&1; then
  echo "The monexa-backend account already exists; inspect it before rerunning this setup."
  exit 1
fi

if [[ -e "${DEPLOY_ROOT}" || -L "${DEPLOY_ROOT}" ]]; then
  echo "${DEPLOY_ROOT} already exists; inspect it before rerunning this setup."
  exit 1
fi

if [[ -e "${ENV_FILE}" || -L "${ENV_FILE}" ]]; then
  echo "${ENV_FILE} already exists; refusing to overwrite the existing environment file."
  exit 1
fi

if [[ -e "${SERVICE_FILE}" || -L "${SERVICE_FILE}" ]]; then
  echo "${SERVICE_FILE} already exists; inspect it before rerunning this setup."
  exit 1
fi

if [[ -e "${SUDOERS_FILE}" || -L "${SUDOERS_FILE}" ]]; then
  echo "${SUDOERS_FILE} already exists; inspect it before rerunning this setup."
  exit 1
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
install -d -o root -g root -m 0700 "${BACKUP_DIR}"
if ! git -c safe.directory="${APP_ROOT}" -C "${APP_ROOT}" diff --quiet -- Backend/server.js; then
  cp -a "${BACKEND_ROOT}/server.js" "${BACKUP_DIR}/server.js.vps-local-${timestamp}"
  chmod 0600 "${BACKUP_DIR}/server.js.vps-local-${timestamp}"
  echo "Backed up the VPS-only server.js change to ${BACKUP_DIR}."
fi

if ! getent group monexa-backend >/dev/null 2>&1; then
  groupadd --system monexa-backend
fi
useradd --system --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin --gid monexa-backend monexa-backend
usermod --append --groups monexa-deploy monexa-backend
install -d -o root -g monexa-backend -m 0750 /etc/monexa-fx
install -o root -g monexa-backend -m 0640 "${BACKEND_ROOT}/.env" "${ENV_FILE}"
chown root:monexa-backend "${BACKEND_ROOT}/.env"
chmod 0640 "${BACKEND_ROOT}/.env"

install -d -o monexa-deploy -g monexa-deploy -m 2750 "${DEPLOY_ROOT}"
ln -s "${BACKEND_ROOT}" "${DEPLOY_ROOT}/current"

cat >"${SERVICE_FILE}" <<EOF
[Unit]
Description=Monexa FX backend API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=monexa-backend
Group=monexa-backend
SupplementaryGroups=monexa-deploy
WorkingDirectory=${DEPLOY_ROOT}/current
Environment=NODE_ENV=production
ExecStart=${NODE_BIN} server.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=full
UMask=0027

[Install]
WantedBy=multi-user.target
EOF
chmod 0644 "${SERVICE_FILE}"

sudoers_tmp="$(mktemp)"
cat >"${sudoers_tmp}" <<'EOF'
monexa-deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart monexa-backend.service, /usr/bin/systemctl is-active monexa-backend.service
EOF
chmod 0440 "${sudoers_tmp}"
if ! visudo -cf "${sudoers_tmp}"; then
  rm -f "${sudoers_tmp}"
  echo "The restricted sudo rule did not validate; no service migration was performed."
  exit 1
fi
install -o root -g root -m 0440 "${sudoers_tmp}" "${SUDOERS_FILE}"
rm -f "${sudoers_tmp}"

systemctl daemon-reload
if ! pm2 stop "${PM2_IDS[0]}"; then
  rm -f "${SERVICE_FILE}" "${SUDOERS_FILE}"
  systemctl daemon-reload
  pm2 restart "${PM2_IDS[0]}" >/dev/null || true
  echo "Could not stop the existing PM2 backend; its files and environment were left intact."
  exit 1
fi
if ! pm2 save; then
  pm2 restart "${PM2_IDS[0]}" >/dev/null || true
  pm2 save >/dev/null 2>&1 || true
  rm -f "${SERVICE_FILE}" "${SUDOERS_FILE}"
  systemctl daemon-reload
  echo "Could not save the PM2 state; the previous backend was restored."
  exit 1
fi

rollback_to_pm2() {
  systemctl stop "${SERVICE_NAME}" >/dev/null 2>&1 || true
  pm2 restart "${PM2_IDS[0]}" >/dev/null
  pm2 save >/dev/null
}

if ! systemctl start "${SERVICE_NAME}"; then
  rollback_to_pm2
  echo "The systemd backend did not start; the previous PM2 backend was restored."
  exit 1
fi

healthy=false
for _ in $(seq 1 20); do
  if curl --fail --silent --show-error --max-time 3 http://127.0.0.1:5000/ >/dev/null; then
    healthy=true
    break
  fi
  sleep 2
done

if [[ "${healthy}" != "true" ]]; then
  rollback_to_pm2
  echo "The systemd health check failed; the previous PM2 backend was restored."
  exit 1
fi

if ! systemctl enable "${SERVICE_NAME}"; then
  systemctl disable "${SERVICE_NAME}" >/dev/null 2>&1 || true
  rollback_to_pm2
  echo "Could not enable the systemd backend at boot; the previous PM2 backend was restored."
  exit 1
fi

systemctl is-active "${SERVICE_NAME}"
echo "Backend now runs under the monexa-backend systemd account."
echo "Its existing environment is protected at ${ENV_FILE}; it was not printed or edited."
echo "The GitHub deploy account can only restart/check this fixed service."
