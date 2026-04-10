#!/usr/bin/env sh
set -eu

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18+ is required but was not found in PATH." >&2
  exit 1
fi

node_major="$(node -p "process.versions.node.split('.')[0]")"
if [ "$node_major" -lt 18 ]; then
  echo "Node.js 18+ is required. Found $(node -v)." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found in PATH." >&2
  exit 1
fi

install_cmd="npm install"
if [ -f package-lock.json ]; then
  install_cmd="npm ci"
fi

echo "Installing dependencies..."
$install_cmd

echo "Building HERC..."
npm run build

echo "Linking herc into your local npm bin..."
npm link

echo "Done. Run 'herc version' to verify the install."
