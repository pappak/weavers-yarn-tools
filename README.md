# 🧶 Weavers Yarn Tools

Standalone desktop app for handweavers, extracted from [WeaversCanvas](https://github.com/pappak/weaverscanvas_code_review):

- **🧶 Yarn Calculator** — project dimensions, per-colour splits, skein math, cost estimates with live exchange rates (CAD base, works offline with fallback rates), printable estimate
- **📐 Sett Advisor** — recommended sett (EPI) from wraps-per-inch and weave structure, with common yarn-weight presets
- **📚 Yarn Library** — 480+ yarns from the Handwoven Magazine *Master Yarn Chart 2014*, searchable, filterable by fiber family, with favorites

The three tools work together: pick a yarn in the Library → **Use for Sett** to confirm the sett → **Apply Balanced EPI** or **Use for Yarn Calc** to size the project.

Built with Electron. No account, no server, works fully offline (exchange rates fall back to cached values).

## Install

| Platform | How |
|---|---|
| Windows | Download `Weavers Yarn Tools Setup x.y.z.exe` from Releases (installer) or the portable `.exe` |
| macOS | `Weavers Yarn Tools-x.y.z.dmg` from Releases (signed + notarized), or the Mac App Store build |

## Build from source

```bash
npm install
npm run dist        # Windows installer + portable exe
```

On a Mac (Apple Developer account required for signing/notarization):

```bash
npm install
npm run dist:mac    # signed + notarized .dmg (Developer ID)
npm run dist:mas    # .pkg for App Store Connect
```

See **BUILD-MAC.md** for the full Apple checklist — certificates, App Store
Connect setup, entitlements, and notarization are all pre-wired.

## Rebuilding the UI from WeaversCanvas

`node build-app.mjs` regenerates `app/index.html` by slicing the three tools
from the current WeaversCanvas source, so improvements made there flow into
this app with one command.

---

Yarn data courtesy of Handwoven Magazine — Master Yarn Chart, 2014.
App © Eldon · WeaversCanvas
