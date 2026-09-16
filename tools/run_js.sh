#!/usr/bin/env bash
# Runs the Node pack-script tests. Syntax-checked JS is tested from Python too
# (see tests/test_packs.py), so this is just the dedicated script-level suite.
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null 2>&1; then
  echo "run_js.sh: node is not installed here; falling back to the Python pack checks" >&2
  exit 3
fi
node --test tests/*.test.js "$@"
