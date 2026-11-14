# Building on your Mac (M6) — Direct .dmg + Mac App Store

This project builds on Windows (installed for you) **and** on your Mac. Your Apple
Developer account unlocks two Mac distribution channels:

| Channel | What | Signing certificate | Output |
|---|---|---|---|
| Direct download | .dmg from your website/GitHub | **Developer ID Application** | signed + notarized .dmg |
| Mac App Store | sold/distributed by Apple | **Apple Distribution** + **Mac Installer Distribution** | .pkg for App Store Connect |

## 1. One-time setup on the Mac

```bash
# Install Node.js (https://nodejs.org, or: brew install node)
git clone https://github.com/pappak/weavers-yarn-tools.git
cd weavers-yarn-tools
npm install
```

## 2. Certificates (Apple Developer portal → Certificates)

Create/download these and double-click to import into **Keychain Access**:

- **Developer ID Application** — for the .dmg channel
- **Apple Distribution** — for the App Store build
- **Mac Installer Distribution** — signs the .pkg for the App Store

Also create an **App-specific password** at appleid.apple.com (for notarization)
and note your **Team ID** from developer.apple.com → Membership.

## 3. Direct .dmg (signed + notarized)

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
npm run dist:mac
```

Output: `dist/Weavers Yarn Tools-1.0.0.dmg` — signed with Developer ID,
notarized by Apple, opens cleanly on any customer Mac (no right-click needed).

## 4. Mac App Store package

```bash
npm run dist:mas
```

Output: `dist/Weavers Yarn Tools.pkg` — signed for the App Store.

Upload it via **Transporter** (from the Mac App Store) or Xcode Organizer to
App Store Connect.

## 5. App Store Connect one-time setup

1. **Identifiers** — register App ID `ca.weaverscanvas.yarntools` with the
   App Store capability enabled.
2. **App Store Connect → My Apps → +** — create the app with that bundle ID,
   a SKU (e.g. `WYT001`), and fill in: description, screenshots (run the app,
   screenshot the three tabs), keywords, **privacy policy URL**
   (host one page on your website — the app only contacts an exchange-rate API).
3. **Export compliance**: the app uses standard HTTPS only → answer
   "uses encryption? yes → exempt" (France-only rule does not apply).
4. **Review notes** for Apple: "Free utility for handweavers; calculates yarn
   requirements. Open the app, pick a tab, all features work without an account."

## Apple notes baked into this project

- `build/entitlements.mas.plist` — sandboxed App Store build (network client for
  exchange rates; JIT allowed, which Electron needs).
- `build/entitlements.mac.plist` — hardened-runtime entitlements for the .dmg.
- `build/notarize.js` — automatic notarization for the .dmg when the three
  APPLE_* variables are set; silently skipped otherwise.
- App Store rules obeyed: no auto-updater, no external code loading, sandbox on.

## Price model

Free is easiest (no pricing agreements needed). Paid requires setting a price
tier and signing the Paid Applications agreement in App Store Connect.
