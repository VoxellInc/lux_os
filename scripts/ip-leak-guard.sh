#!/usr/bin/env bash
# IP leak-guard — fail if proprietary "featherweight" (private broker) artifacts
# leak into this OPEN repo. The moat (Go broker, patent-pending lock-free limiter,
# marketplace billing, FMEA datagen) must live ONLY in the private featherweight
# repo. Open repos = commodity client + edge relay.
set -euo pipefail

fail=0

# 1. No server (Go) source belongs in an open client/edge repo.
if git ls-files '*.go' | grep -q .; then
  echo "::error:: IP-LEAK — Go source present in open repo:"
  git ls-files '*.go'
  fail=1
fi

# 2. No proprietary implementation / billing identifiers in tracked files.
PATTERNS='lock-free|35 ?ns/op|C Buckets|BatchMeterUsage|ResolveCustomer|marketplacemetering|gcp-sync-broker|FMEA'
matches=$(git grep -nEI "$PATTERNS" -- ':!scripts/ip-leak-guard.sh' ':!package-lock.json' || true)
if [ -n "$matches" ]; then
  echo "::error:: IP-LEAK — proprietary terms in open repo:"
  echo "$matches"
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  echo "Move moat code/terms to the PRIVATE featherweight repo. Open repos = commodity only."
  exit 1
fi
echo "IP leak-guard: clean — no moat artifacts in the open repo."
