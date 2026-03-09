#!/usr/bin/env bash
#
# Orchestrator: capture App Store screenshots across locales.
#
# Prerequisites:
#   - Maestro CLI installed (curl -Ls "https://get.maestro.mobile.dev" | bash)
#   - iOS 17 runtime with iPhone 15 Pro Max simulator
#   - Dev client built and installed on the simulator
#   - Seeded DB generated (node screenshots/seed-db.mjs)
#
# Usage: bash screenshots/take-screenshots.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/output"
FLOWS_DIR="$SCRIPT_DIR/flows"

DEVICE_NAME="iPhone 15 Pro Max"

# ── Locale-aware strings ──

locale_strings() {
  local locale="$1"
  case "$locale" in
    en)
      TAB_SEARCH="Search"
      TAB_RANDOM="Random"
      SEARCH_PLACEHOLDER="Search artists, albums, labels..."
      PICK_RANDOM="Pick Random"
      ;;
    fr)
      TAB_SEARCH="Recherche"
      TAB_RANDOM="Au hasard"
      SEARCH_PLACEHOLDER="Artistes, albums, labels..."
      PICK_RANDOM="Piocher au hasard"
      ;;
    *)
      echo "Unknown locale: $locale"; exit 1 ;;
  esac
}

# ── Helpers ──

boot_simulator() {
  local device_name="$1"
  local udid

  udid=$(xcrun simctl list devices available -j \
    | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data['devices'].items():
    for d in devices:
        if d['name'] == '$device_name' and d['isAvailable']:
            print(d['udid'])
            sys.exit(0)
sys.exit(1)
") || {
    echo "Error: simulator '$device_name' not found." >&2
    echo "" >&2
    echo "Install iOS 17 runtime and create the simulator:" >&2
    echo "  xcodebuild -downloadPlatform iOS -buildVersion 17.5" >&2
    echo "  xcrun simctl create \"$device_name\" \"$device_name\" com.apple.CoreSimulator.SimRuntime.iOS-17-5" >&2
    exit 1
  }

  # Boot if not already booted
  local state
  state=$(xcrun simctl list devices -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data['devices'].items():
    for d in devices:
        if d['udid'] == '$udid':
            print(d['state'])
            sys.exit(0)
")
  if [ "$state" != "Booted" ]; then
    echo "Booting $device_name ($udid)..." >&2
    xcrun simctl boot "$udid"
    sleep 5
  else
    echo "Simulator $device_name ($udid) already booted" >&2
  fi

  echo "$udid"
}

set_locale() {
  local udid="$1"
  local locale="$2"

  local lang region
  case "$locale" in
    en) lang="en"; region="en_US" ;;
    fr) lang="fr"; region="fr_FR" ;;
    *) echo "Unknown locale: $locale"; exit 1 ;;
  esac

  xcrun simctl spawn "$udid" defaults write "Apple Global Domain" AppleLanguages -array "$lang"
  xcrun simctl spawn "$udid" defaults write "Apple Global Domain" AppleLocale -string "$region"
}

push_db() {
  local udid="$1"
  bash "$SCRIPT_DIR/push-db.sh" "$udid"
}

run_flows() {
  local udid="$1"
  local locale="$2"
  local out_dir="$OUTPUT_DIR/$locale"

  mkdir -p "$out_dir"

  # Set locale-dependent env vars
  locale_strings "$locale"

  # Run screenshot flows (01-05)
  for flow in "$FLOWS_DIR"/0{1,2,3,4,5}-*.yaml; do
    local name
    name=$(basename "$flow" .yaml)
    echo "  Running $name..."

    maestro --udid "$udid" test \
      -e "TAB_SEARCH=$TAB_SEARCH" \
      -e "TAB_RANDOM=$TAB_RANDOM" \
      -e "SEARCH_PLACEHOLDER=$SEARCH_PLACEHOLDER" \
      -e "PICK_RANDOM=$PICK_RANDOM" \
      "$flow" || {
      echo "  Warning: $name failed, skipping"
      continue
    }

    # Move screenshot from Maestro's output (saved in cwd)
    if [ -f "$PROJECT_DIR/${name}.png" ]; then
      mv "$PROJECT_DIR/${name}.png" "$out_dir/${name}.png"
      echo "  Saved $out_dir/${name}.png"
    fi
  done
}

# ── Main ──

echo "=== App Store Screenshot Automation ==="
echo ""

# Check prerequisites
command -v maestro >/dev/null 2>&1 || {
  echo "Error: maestro not found."
  echo "Install with: curl -Ls \"https://get.maestro.mobile.dev\" | bash"
  exit 1
}

if [ ! -f "$SCRIPT_DIR/fixtures/discogs.db" ]; then
  echo "Seeded database not found. Generating..."
  node "$SCRIPT_DIR/seed-db.mjs"
fi

# Clean previous output
rm -rf "$OUTPUT_DIR"

echo "── Device: $DEVICE_NAME (6.7\") ──"

udid=$(boot_simulator "$DEVICE_NAME")

# Override status bar: show cellular, full battery, Wi-Fi, and a clean time
xcrun simctl status_bar "$udid" override \
  --time "9:41" \
  --dataNetwork "wifi" \
  --wifiMode "active" \
  --wifiBars 3 \
  --cellularMode "active" \
  --cellularBars 4 \
  --batteryState "charged" \
  --batteryLevel 100

# ── Helpers: Metro lifecycle ──

start_metro() {
  echo "Starting Expo dev server (SCREENSHOT_MODE=true)..."
  env EXPO_PUBLIC_SCREENSHOT_MODE=true npx expo start --no-dev --minify --clear &
  EXPO_PID=$!

  echo "Waiting for Metro bundler..."
  for i in $(seq 1 30); do
    if curl -s http://localhost:8081/status 2>/dev/null | grep -q "packager-status:running" 2>/dev/null; then
      echo "Metro bundler ready."
      return 0
    fi
    if [ "$i" -eq 30 ]; then
      echo "Error: Metro bundler failed to start after 30s"
      kill "$EXPO_PID" 2>/dev/null || true
      return 1
    fi
    sleep 1
  done
}

stop_metro() {
  kill "$EXPO_PID" 2>/dev/null || true
  wait "$EXPO_PID" 2>/dev/null || true
  # Kill any remaining Metro process on port 8081
  local metro_pid
  metro_pid=$(lsof -ti:8081 2>/dev/null) && kill "$metro_pid" 2>/dev/null || true
  sleep 1
}

EXPO_PID=""
cleanup() {
  echo "Stopping Expo dev server..."
  stop_metro
  xcrun simctl status_bar "$udid" clear 2>/dev/null || true
}
trap cleanup EXIT

start_metro

# ── Collection screenshots ──

echo ""
echo "── Collection screenshots ──"

for locale in en fr; do
  echo ""
  echo "  Locale: $locale"

  # Set simulator locale and reboot to apply
  set_locale "$udid" "$locale"
  xcrun simctl shutdown "$udid" 2>/dev/null || true
  sleep 1
  xcrun simctl boot "$udid"
  sleep 5

  # Terminate app and push seeded database so it loads fresh on next launch
  xcrun simctl terminate "$udid" fr.lustin.digs 2>/dev/null || true
  push_db "$udid"

  # Warm up: launch app once to download & cache the JS bundle, then re-push DB
  echo "  Warming up (caching JS bundle)..."
  xcrun simctl launch "$udid" fr.lustin.digs
  sleep 8
  xcrun simctl terminate "$udid" fr.lustin.digs 2>/dev/null || true
  push_db "$udid"

  # Run all flows
  run_flows "$udid" "$locale"
done

# Shut down simulator
xcrun simctl shutdown "$udid" 2>/dev/null || true

echo ""
echo "=== Done! Screenshots saved to $OUTPUT_DIR ==="
echo ""
echo "Directory structure:"
find "$OUTPUT_DIR" -name "*.png" | sort
