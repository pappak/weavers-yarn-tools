#!/bin/bash
# Runs Weavers Yarn Tools from Terminal.
#
# macOS won't run Electron's runtime off the NAS (crashes with
# "icudtl.dat not found in bundle"), so the runtime is kept in a local
# cache and the app always launches from a local mirror of the project
# (Finder-launched apps are also blocked from reading network volumes).
#
# Run this after editing code on the NAS: it refreshes the mirror that
# the "Weavers Yarn Tools" desktop app uses, then launches the app.

set -e
cd "$(dirname "$0")"

PROJECT="$(pwd)"
CACHE="$HOME/Library/Caches/weavers-yarn-tools"
MIRROR="$CACHE/app"

# --- Local Electron runtime --------------------------------------------------
ELECTRON_VERSION=$(node -p "require('./node_modules/electron/package.json').version")
LOCAL="$CACHE/electron-$ELECTRON_VERSION-dist"
if [ ! -x "$LOCAL/Electron.app/Contents/MacOS/Electron" ]; then
  echo "Syncing Electron $ELECTRON_VERSION runtime to local disk (first run only)..."
  rm -rf "$LOCAL"
  mkdir -p "$LOCAL"
  ditto "./node_modules/electron/dist" "$LOCAL"
fi

# --- Refresh the local app mirror used by the desktop app --------------------
mkdir -p "$MIRROR/build"
rsync -a --delete "./main.js" "./package.json" "$MIRROR/"
rsync -a --delete "./app/" "$MIRROR/app/"
rsync -a "./build/icon.png" "$MIRROR/build/"

# --- Launch ------------------------------------------------------------------
ELECTRON_OVERRIDE_DIST_PATH="$LOCAL" npm start
