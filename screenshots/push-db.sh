#!/usr/bin/env bash
#
# Push the seeded SQLite database into the iOS simulator app container.
#
# Usage: bash screenshots/push-db.sh [device_udid]
#   device_udid — defaults to the booted simulator

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SEEDED_DB="$SCRIPT_DIR/fixtures/discogs.db"
BUNDLE_ID="fr.lustin.digs"

if [ ! -f "$SEEDED_DB" ]; then
  echo "Error: seeded database not found at $SEEDED_DB"
  echo "Run 'node screenshots/seed-db.mjs' first."
  exit 1
fi

DEVICE="${1:-booted}"

# Get the app container path
APP_CONTAINER=$(xcrun simctl get_app_container "$DEVICE" "$BUNDLE_ID" data 2>/dev/null) || {
  echo "Error: could not find app container for $BUNDLE_ID on device $DEVICE"
  echo "Make sure the app has been installed on the simulator first."
  exit 1
}

# expo-sqlite stores databases in Documents/SQLite/
DB_DIR="$APP_CONTAINER/Documents/SQLite"
mkdir -p "$DB_DIR"

# Remove existing DB files (WAL may contain stale state that overrides our data)
rm -f "$DB_DIR/discogs.db" "$DB_DIR/discogs.db-wal" "$DB_DIR/discogs.db-shm"

# Copy seeded database
cp "$SEEDED_DB" "$DB_DIR/discogs.db"

echo "Pushed seeded database to $DB_DIR/discogs.db"
