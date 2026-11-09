#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null || ! command -v npm >/dev/null; then echo 'Necesitas Node.js >=22.12'; exit 1; fi
if [ ! -d node_modules/electron ]; then npm install; fi
npm run dev
