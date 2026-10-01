#!/usr/bin/env bash
set -u
root=$(cd "$(dirname "$0")/.." && pwd)
logs="$root/target/gate"
mkdir -p "$logs"
cd "$root"

step() {
  local name=$1
  shift
  local start=$SECONDS
  if "$@" >"$logs/$name.log" 2>&1; then
    echo "ok      $name $((SECONDS - start))s"
  else
    echo "FAILED  $name $((SECONDS - start))s  target/gate/$name.log"
    return 1
  fi
}

rust_checks() {
  local fail=0
  step fmt cargo +nightly fmt --all -- --check --config newline_style=Auto || fail=1
  step clippy cargo clippy --workspace --all-targets -- -D warnings || fail=1
  step cargo-test cargo test --workspace || fail=1
  return $fail
}

app_checks() {
  local fail=0
  cd "$root/app"
  step gen-i18n npm run gen:i18n || fail=1
  step build-wasm npm run build:wasm || fail=1
  step eslint npx eslint . --max-warnings 0 --cache --cache-location "$logs/eslintcache" || fail=1
  step tsc npm run typecheck || fail=1
  step vitest npx vitest run || fail=1
  return $fail
}

start=$SECONDS
fail=0
rust_checks &
rust_pid=$!
app_checks &
app_pid=$!
wait $rust_pid || fail=1
wait $app_pid || fail=1

cd "$root/app"
step build-site npm run build:site || fail=1
step size npm run size || fail=1
step e2e npx playwright test || fail=1

echo
grep "test result" "$logs/cargo-test.log" | awk '{p+=$4; f+=$6} END {print "cargo   " p " passed, " f " failed"}'
grep -E "Tests " "$logs/vitest.log"
grep -E "[0-9]+ (passed|failed|flaky|skipped)" "$logs/e2e.log" | tail -4
grep -E "^(js|css|fonts|locale)" "$logs/size.log"
echo "gate    $((SECONDS - start))s"
exit $fail
