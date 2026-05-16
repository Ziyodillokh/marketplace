#!/bin/bash
set -e
APP_DIR="/opt/marketplace"
REPO_URL="https://github.com/Ziyodillokh/marketplace.git"

# Yaratish kerakli papkalar
mkdir -p ${APP_DIR}
mkdir -p ${APP_DIR}/logs
mkdir -p ${APP_DIR}/uploads

# Birinchi clone yoki pull
if [ -d "${APP_DIR}/.git" ]; then
  echo "=== Repo bor — pull qilamiz ==="
  cd ${APP_DIR}
  git fetch origin
  git reset --hard origin/main
else
  echo "=== Repo'ni clone qilamiz ==="
  git clone ${REPO_URL} ${APP_DIR}_tmp
  shopt -s dotglob
  mv ${APP_DIR}_tmp/* ${APP_DIR}/
  rm -rf ${APP_DIR}_tmp
fi

cd ${APP_DIR}
echo "=== Repo:"
git log --oneline -3
ls -la
