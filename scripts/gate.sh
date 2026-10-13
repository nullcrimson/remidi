#!/usr/bin/env bash
set -u
root=$(cd "$(dirname "$0")/.." && pwd)
logs="$root/target/gate"
nightly=$(tr -d '[:space:]' <"$root/nightly-toolchain")
mkdir -p "$logs"

RUST=(fmt clippy cargo-test)
APP=(gen-i18n build-wasm eslint tsc vitest)
SITE=(build-site size e2e)

step() {
  local name=$1 dir=$2
  shift 2
  local start=$SECONDS
  if (cd "$root/$dir" && "$@") >"$logs/$name.log" 2>&1; then
    echo "ok      $name $((SECONDS - start))s"
  else
    echo "FAILED  $name $((SECONDS - start))s  target/gate/$name.log"
    [ -z "${CI:-}" ] || cat "$logs/$name.log"
    return 1
  fi
}

check() {
  case $1 in
    fmt) step fmt . cargo +"$nightly" fmt --all -- --check --config newline_style=Auto ;;
    clippy) step clippy . cargo clippy --workspace --all-targets --locked -- -D warnings ;;
    cargo-test) step cargo-test . cargo test --workspace --locked ;;
    gen-i18n) step gen-i18n app npm run gen:i18n ;;
    build-wasm) step build-wasm app npm run build:wasm ;;
    eslint) step eslint app npx eslint . --max-warnings 0 --cache --cache-location "$logs/eslintcache" ;;
    tsc) step tsc app npm run typecheck ;;
    vitest) step vitest app npx vitest run ;;
    build-site) step build-site app npm run build:site ;;
    size) step size app npm run size ;;
    e2e) step e2e app npx playwright test ;;
    *)
      echo "unknown check '$1'; checks: ${RUST[*]} ${APP[*]} ${SITE[*]}; groups: rust app site"
      return 2
      ;;
  esac
}

sequence() {
  local fail=0 name
  for name in "$@"; do
    check "$name" || fail=1
  done
  return $fail
}

summary() {
  local name
  for name in "$@"; do
    case $name in
      cargo-test) grep "test result" "$logs/cargo-test.log" | awk '{p+=$4; f+=$6} END {print "cargo   " p " passed, " f " failed"}' ;;
      vitest) grep -E "Tests " "$logs/vitest.log" ;;
      e2e) grep -E "[0-9]+ (passed|failed|flaky|skipped)" "$logs/e2e.log" | tail -4 ;;
      size) grep -E "^(js|css|fonts|locale)" "$logs/size.log" ;;
    esac
  done
}

start=$SECONDS
fail=0
checks=()
if [ $# -eq 0 ]; then
  checks=("${RUST[@]}" "${APP[@]}" "${SITE[@]}")
  sequence "${RUST[@]}" &
  rust_pid=$!
  sequence "${APP[@]}" &
  app_pid=$!
  wait $rust_pid || fail=1
  wait $app_pid || fail=1
  sequence "${SITE[@]}" || fail=1
else
  for name in "$@"; do
    case $name in
      rust) checks+=("${RUST[@]}") ;;
      app) checks+=("${APP[@]}") ;;
      site) checks+=("${SITE[@]}") ;;
      *) checks+=("$name") ;;
    esac
  done
  sequence "${checks[@]}" || fail=1
fi

echo
summary "${checks[@]}"
echo "gate    $((SECONDS - start))s"
exit $fail
