# Samvyo Desktop — Production Deployment Guide

> This document explains everything required to take the Electron desktop app
> from a working build to a fully signed, production-ready application
> distributed to real users on Windows, macOS, and Linux.

---

## Table of Contents

1. [Current State](#1-current-state)
2. [Why Signing Matters](#2-why-signing-matters)
3. [Certificates Required](#3-certificates-required)
4. [Cost Breakdown](#4-cost-breakdown)
5. [Step-by-Step Production Process](#5-step-by-step-production-process)
6. [GitHub Actions — What Changes](#6-github-actions--what-changes)
7. [Distribution Channels](#7-distribution-channels)
8. [Auto-Update Flow](#8-auto-update-flow)
9. [Timeline](#9-timeline)
10. [Production Checklist](#10-production-checklist)

---

## 1. Current State

What is already built and working:

| Feature | Status |
|---|---|
| Electron wrapper around React UI | ✅ Done |
| IPC bridge (contextBridge security) | ✅ Done |
| System tray | ✅ Done |
| OS notifications | ✅ Done |
| Deep links (`samvyo://`) | ✅ Done |
| Disk persistence | ✅ Done |
| electron-builder packaging (all 3 platforms) | ✅ Done |
| GitHub Actions CI/CD pipeline | ✅ Done |
| Auto-updater (electron-updater) | ✅ Done |
| Download landing page (GitHub Pages) | ✅ Done |
| **Code signing** | ❌ Not yet (needs certificates) |

The only thing separating the current build from a production release is
**code signing certificates**. No code rebuild is required — only configuration.

---

## 2. Why Signing Matters

When a user downloads and runs an **unsigned** app:

### Windows — SmartScreen Warning
```
┌─────────────────────────────────────────────────┐
│  Windows protected your PC                      │
│                                                 │
│  Microsoft Defender SmartScreen prevented an   │
│  unrecognised app from starting.               │
│                                                 │
│  [ Don't run ]          [ More info ]           │
└─────────────────────────────────────────────────┘
```
User must click **More info → Run anyway**. Most non-technical users stop here.

### macOS — Gatekeeper Warning
```
┌─────────────────────────────────────────────────┐
│  "Samvyo" cannot be opened because the          │
│  developer cannot be verified.                  │
│                                                 │
│  macOS cannot verify that this app is free      │
│  from malware.                                  │
│                                                 │
│  [ Move to Trash ]        [ Cancel ]            │
└─────────────────────────────────────────────────┘
```
User must right-click → Open → Open. Many users think the app is unsafe.

### Linux — No warning ✅
Linux has no signing requirement. Works perfectly as-is.

### After signing — zero warnings
```
Windows: App installs silently. No SmartScreen. No warnings.
macOS:   App opens normally. No Gatekeeper. No warnings.
Linux:   Already works. No change.
```

---

## 3. Certificates Required

### macOS — Apple Developer Program

**Where to buy:** https://developer.apple.com/programs/enroll/

**Cost:** $99 / year

**What it includes:**
- Code signing certificate (Developer ID Application)
- Notarization access (Apple scans the app for malware and stamps it clean)
- Optional: Mac App Store distribution
- Valid for all macOS apps you build under this account

**What notarization means:**
After signing, you submit the `.dmg` to Apple's notarization service.
Apple runs automated security checks (~2-5 minutes).
If it passes, Apple attaches a "notarization ticket" to the app.
From that point, macOS trusts the app on any machine — no warnings ever.

> **Note:** electron-builder handles notarization automatically during the
> build process. No manual submission needed once configured.

---

### Windows — EV Code Signing Certificate

**Where to buy:** DigiCert, Sectigo, SSL.com (see cost table below)

**Cost:** $250–500 / year

> ⚠️ You must buy an **EV (Extended Validation)** certificate, NOT a standard OV certificate.
> Only EV certificates remove the SmartScreen warning immediately.
> Standard certificates still show the warning for new publishers until the app
> builds "reputation" over months of downloads.

**What EV validation requires:**
The certificate authority verifies that your company is a real, registered
legal entity. They will:
- Check company registration documents
- Verify company address
- Sometimes call the registered phone number
- Takes 1–3 business days

**Hardware token (important):**
EV certificates are delivered on a **physical USB security token** (e.g. YubiKey).
The signing key never leaves the device — this is a Microsoft security requirement.
For CI/CD automation, you export the certificate to a `.p12` file and store it
as a GitHub secret.

---

### Linux — No certificate needed

Linux has no signing requirement and no OS-level warnings.
AppImage and .deb packages distribute without any certificates.
**Cost: $0**

---

### Optional: Store Distribution

| Store | Fee | Removes warning? | Review time |
|---|---|---|---|
| Microsoft Store | $19 one-time | ✅ Yes | 1–3 days |
| Mac App Store | Included in $99/yr | ✅ Yes | 1–3 days |
| Snap Store (Linux) | Free | N/A | Manual review |
| Flathub (Linux) | Free | N/A | Manual review |

> Apple takes **30% commission** on paid Mac App Store sales.
> Free apps and enterprise distribution have no commission.

---

## 4. Cost Breakdown

### Minimum (direct download, no stores)

| Item | Cost |
|---|---|
| Apple Developer Program | $99 / year |
| Windows EV Certificate (Sectigo) | ~$300 / year |
| GitHub Actions (private repo) | $4 / month ($48 / year) |
| GitHub Pages hosting | Free |
| GitHub Releases storage | Free |
| **Total** | **~$450 / year** |

### With store distribution

| Item | Cost |
|---|---|
| Everything above | $450 / year |
| Microsoft Store registration | $19 one-time |
| Mac App Store | Included in Apple $99 |
| **Total first year** | **~$470** |
| **Total recurring** | **~$450 / year** |

### Certificate providers comparison

| Provider | EV Certificate | Notes |
|---|---|---|
| DigiCert | ~$499 / year | Most trusted, fastest support |
| Sectigo | ~$300 / year | Good balance of price and trust |
| SSL.com | ~$249 / year | Cheapest option |
| GlobalSign | ~$400 / year | Enterprise preferred |

---

## 5. Step-by-Step Production Process

### Step 1 — Get Apple Developer Program

1. Go to https://developer.apple.com/programs/enroll/
2. Sign in with your Apple ID (or create one)
3. Choose **"Enroll as an Organization"** for Samvyo Technologies
4. Pay $99 — instant approval for individuals, 2–3 days for companies
5. In the developer portal, go to **Certificates → Create Certificate**
6. Choose **"Developer ID Application"** (for distribution outside App Store)
7. Download the `.cer` file and install it in Keychain Access
8. Export as `.p12` file with a strong password — this is what electron-builder uses

---

### Step 2 — Get Windows EV Certificate

1. Go to https://www.sectigo.com/ssl-certificates-tls/code-signing (or DigiCert)
2. Purchase **EV Code Signing Certificate**
3. Submit company verification documents:
   - Certificate of Incorporation
   - Business registration number
   - Company address proof
4. Wait 1–3 business days for approval
5. Receive the certificate on a **USB hardware token** by mail
6. Export the certificate to a `.p12` file for CI/CD use

---

### Step 3 — Add secrets to GitHub

Go to: **Settings → Secrets and variables → Actions → New repository secret**

Add each of these secrets:

| Secret name | Value | Platform |
|---|---|---|
| `MAC_CERT_P12_BASE64` | Base64-encoded `.p12` file | macOS |
| `MAC_CERT_PASSWORD` | Password for the `.p12` file | macOS |
| `APPLE_ID` | Your Apple ID email | macOS notarization |
| `APPLE_APP_PWD` | App-specific password from appleid.apple.com | macOS notarization |
| `APPLE_TEAM_ID` | 10-character team ID from developer portal | macOS notarization |
| `WIN_CERT_P12_BASE64` | Base64-encoded Windows `.p12` file | Windows |
| `WIN_CERT_PASSWORD` | Password for the Windows `.p12` file | Windows |

**How to convert `.p12` to base64 (run once on your machine):**
```bash
base64 -i certificate.p12 | tr -d '\n'
```
Copy the output and paste it as the secret value.

---

### Step 4 — Update the GitHub Actions workflow

Open `.github/workflows/release.yml` and make this one change:

**Remove this line:**
```yaml
CSC_IDENTITY_AUTO_DISCOVERY: false
```

**Add these lines:**
```yaml
# macOS signing + notarization
CSC_LINK: ${{ secrets.MAC_CERT_P12_BASE64 }}
CSC_KEY_PASSWORD: ${{ secrets.MAC_CERT_PASSWORD }}
APPLE_ID: ${{ secrets.APPLE_ID }}
APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_PWD }}
APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}

# Windows signing
WIN_CSC_LINK: ${{ secrets.WIN_CERT_P12_BASE64 }}
WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CERT_PASSWORD }}
```

That is the **only code change** required. electron-builder reads these
environment variables automatically and handles signing and notarization.

---

### Step 5 — Test the signed build

Before releasing to users, test locally on each platform:

```bash
# macOS — build and sign locally
npm run dist:mac

# Verify signature
codesign --verify --deep --strict "release/mac/Samvyo.app"
spctl --assess --type exec "release/mac/Samvyo.app"

# Windows — build and sign locally (on a Windows machine)
npm run dist:win

# Verify signature
signtool verify /pa "release\Samvyo Setup.exe"
```

If both commands return no errors — the app is properly signed.

---

### Step 6 — Release

The release process is identical to the current process:

```bash
# Bump version
npm version patch   # 1.0.0 → 1.0.1
# or
npm version minor   # 1.0.0 → 1.1.0
# or
npm version major   # 1.0.0 → 2.0.0

# Push code
git push origin main

# Tag and trigger the pipeline
git push origin v1.0.1
```

GitHub Actions runs → builds signed installers on all 3 platforms →
uploads to GitHub Releases → download page auto-updates → users get
zero-warning installs → auto-updater notifies existing users.

---

## 6. GitHub Actions — What Changes

Current workflow (unsigned — what we have now):
```yaml
- name: Build & publish installers
  run: npx electron-builder --publish always
  env:
    GH_TOKEN: ${{ secrets.GH_TOKEN }}
    CSC_IDENTITY_AUTO_DISCOVERY: false      # ← skips signing
```

Production workflow (signed):
```yaml
- name: Build & publish installers
  run: npx electron-builder --publish always
  env:
    GH_TOKEN: ${{ secrets.GH_TOKEN }}
    # macOS signing + notarization
    CSC_LINK: ${{ secrets.MAC_CERT_P12_BASE64 }}
    CSC_KEY_PASSWORD: ${{ secrets.MAC_CERT_PASSWORD }}
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_PWD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
    # Windows signing
    WIN_CSC_LINK: ${{ secrets.WIN_CERT_P12_BASE64 }}
    WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CERT_PASSWORD }}
```

**That is literally the only change to the entire codebase.**

---

## 7. Distribution Channels

### Channel A — Direct download (GitHub Pages) ← already live
```
User visits: https://sai-prasad05.github.io/electron-todo
OS is auto-detected → correct download button highlighted
User clicks Download → file downloads in Chrome
User installs → zero warnings (after signing)
```
Cost: Free | Setup: Done

---

### Channel B — Microsoft Store
```
User opens Microsoft Store on Windows
Searches "Samvyo" → clicks Install
App installs like any Microsoft app — no warnings, no downloads
```
Cost: $19 one-time | Setup: 1–3 days review

---

### Channel C — Mac App Store
```
User opens App Store on Mac
Searches "Samvyo" → clicks Get
App installs like any Apple app — no warnings
```
Cost: Included in $99/yr | Setup: 1–3 days review | Apple takes 30% of paid sales

---

### Channel D — Enterprise / MDM (for company-wide deployment)
```
IT admin deploys the app silently to all company machines
No user interaction needed
Uses tools like Jamf (macOS) or Intune (Windows)
```
Cost: Depends on MDM tool | Requires signed builds

---

## 8. Auto-Update Flow

Once a new version is released, existing installed users receive it
**automatically without downloading anything manually:**

```
1. User launches Samvyo desktop app (any version)
       ↓
2. electron-updater silently fetches latest.yml from GitHub Releases
   (a tiny metadata file — just version number and file hash)
       ↓
3. Compares: installed version vs latest version
       ↓
4. If newer version exists:
   → Downloads new installer silently in background
   → Shows UpdateBanner in the UI:
     ┌─────────────────────────────────────────────┐
     │  A new version is ready. Restart to update. │
     │                        [ Restart & Update ] │
     └─────────────────────────────────────────────┘
       ↓
5. User clicks "Restart & Update"
   → App closes
   → Installer runs silently
   → App reopens on new version
   → No browser, no download page, no manual steps
```

This is already fully wired in the codebase. No additional work needed.

---

## 9. Timeline

| Task | Owner | Time |
|---|---|---|
| Apply for Apple Developer Program | Manager / Company account | 1 day (individual) / 3 days (company) |
| Purchase EV Code Signing Certificate | Manager / Finance | 1–3 days (identity verification) |
| Configure GitHub secrets | Developer | 1 hour |
| Update workflow file (remove one line, add seven) | Developer | 15 minutes |
| Test signed builds on each platform | Developer | 1 day |
| Submit to Microsoft Store (optional) | Developer | 30 min submission + 1–3 days review |
| Submit to Mac App Store (optional) | Developer | 1 hour submission + 1–3 days review |
| **Total** | | **~1 week** |

---

## 10. Production Checklist

### Before release

- [ ] Apple Developer Program purchased and active
- [ ] macOS Developer ID certificate created and exported as `.p12`
- [ ] Windows EV certificate purchased and exported as `.p12`
- [ ] All 7 GitHub secrets added to the repository
- [ ] `CSC_IDENTITY_AUTO_DISCOVERY: false` removed from workflow
- [ ] Signing environment variables added to workflow
- [ ] Version bumped in `package.json`
- [ ] Signed build tested locally on macOS (`codesign --verify`)
- [ ] Signed build tested locally on Windows (`signtool verify`)
- [ ] macOS notarization verified (no Gatekeeper warning on clean machine)
- [ ] Windows SmartScreen verified (no warning on clean machine)

### After release

- [ ] GitHub Release created with all artifacts
- [ ] Download page shows new version
- [ ] Auto-update tested (install old version → verify UpdateBanner appears)
- [ ] App works on fresh machine with no developer tools installed

---

## Summary for Management

| Question | Answer |
|---|---|
| Is the app built and working? | Yes — fully functional on all 3 platforms |
| What's missing for production? | Code signing certificates only |
| How much does it cost? | ~$450/year (Apple $99 + Windows EV ~$300 + GitHub $48) |
| How much developer work is left? | ~1 day of configuration, no rebuilding |
| How long until production-ready? | ~1 week (mostly waiting for certificate approval) |
| How do updates reach users? | Automatically — no user action needed |
| Where is the app hosted? | GitHub (free) — no servers to maintain |

---

*Last updated: June 2026 — Samvyo Technologies*
