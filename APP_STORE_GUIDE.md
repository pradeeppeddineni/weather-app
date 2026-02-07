# Publishing a PWA to the App Store Without Xcode

A complete guide documenting how TempTracker India (a vanilla HTML/CSS/JS PWA) was published to the iOS App Store using **Capacitor** for native wrapping and **Codemagic** for cloud builds — all without having Xcode installed locally.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Install Capacitor & Initialize iOS Project](#2-install-capacitor--initialize-ios-project)
3. [Apple Developer Portal Setup](#3-apple-developer-portal-setup)
4. [Codemagic CI/CD Setup](#4-codemagic-cicd-setup)
5. [Build Configuration (codemagic.yaml)](#5-build-configuration-codemagicyaml)
6. [First Build & Fixing Issues](#6-first-build--fixing-issues)
7. [TestFlight](#7-testflight)
8. [App Store Connect — Create the App](#8-app-store-connect--create-the-app)
9. [App Store Metadata](#9-app-store-metadata)
10. [Screenshots](#10-screenshots)
11. [Pricing & Availability](#11-pricing--availability)
12. [Privacy Policy](#12-privacy-policy)
13. [Age Rating & Content Rights](#13-age-rating--content-rights)
14. [App Review Information](#14-app-review-information)
15. [Submit for Review](#15-submit-for-review)
16. [Common Issues & Fixes](#16-common-issues--fixes)

---

## 1. Prerequisites

What you need before starting:

- **Apple Developer Account** ($99/year) — enrolled at [developer.apple.com](https://developer.apple.com)
- **Node.js** installed (we used v22)
- **A working PWA** — your HTML/CSS/JS app with a `manifest.json` and service worker
- **Codemagic account** — free tier at [codemagic.io](https://codemagic.io) (sign up with GitHub)
- **GitHub repo** — your code pushed to a GitHub repository
- **No Xcode needed** — Codemagic handles all building in the cloud

---

## 2. Install Capacitor & Initialize iOS Project

Capacitor wraps your web app in a native iOS WebView container.

### 2a. Install Capacitor

```bash
npm init -y   # if no package.json exists
npm install @capacitor/core @capacitor/ios
npm install -D @capacitor/cli
```

### 2b. Initialize Capacitor

```bash
npx cap init
```

This asks for:
- **App name**: `Temperature Tracker`
- **App ID (bundle identifier)**: `com.temptracker.app` (reverse domain format, must be unique)
- **Web asset directory**: `www` (or wherever your HTML files are)

This creates `capacitor.config.json`:

```json
{
  "appId": "com.temptracker.app",
  "appName": "Temperature Tracker",
  "webDir": "www",
  "ios": {
    "backgroundColor": "#0b0d14",
    "contentInset": "always",
    "allowsLinkPreview": false,
    "scrollEnabled": true
  },
  "server": {
    "iosScheme": "capacitor",
    "hostname": "localhost"
  }
}
```

### 2c. Set Up Web Directory

If your files are in the root (not a `www/` folder), create a build script. In `package.json`:

```json
{
  "scripts": {
    "build": "rm -rf www && mkdir -p www && cp -r index.html style.css app.js cities.js manifest.json sw.js icons www/"
  }
}
```

### 2d. Add iOS Platform

```bash
npm run build
npx cap add ios
```

This creates the entire `ios/` directory with a native Xcode project. You don't need Xcode to generate this — Capacitor CLI does it.

### 2e. Sync Web Assets to iOS

Whenever you change your web code:

```bash
npm run build
npx cap sync ios
```

### 2f. Add App Icon

Place your 1024x1024 app icon at `ios/App/App/Assets.xcassets/AppIcon.appiconset/`. You need the icon file and an updated `Contents.json` referencing it. The App Store requires a 1024x1024 icon.

### 2g. iOS-Specific Tweaks

In `ios/App/App/Info.plist`, add this to avoid the export compliance question on every TestFlight upload:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

Also set supported orientations, display name, etc. in Info.plist.

### 2h. Commit the iOS Directory

```bash
git add ios/
git commit -m "Add iOS Capacitor setup"
git push
```

---

## 3. Apple Developer Portal Setup

Go to [developer.apple.com](https://developer.apple.com) → Account → Certificates, Identifiers & Profiles.

### 3a. Register App ID (Bundle Identifier)

1. Go to **Identifiers** → click **+**
2. Select **App IDs** → **App**
3. Enter description: `TempTracker`
4. Bundle ID: **Explicit** → `com.temptracker.app`
5. No special capabilities needed for a basic web-wrapped app
6. Click **Register**

### 3b. Create Distribution Certificate

1. Go to **Certificates** → click **+**
2. Select **Apple Distribution**
3. You need a Certificate Signing Request (CSR):
   - On your Mac: open **Keychain Access** → Certificate Assistant → Request a Certificate from a Certificate Authority
   - Enter your email, select "Saved to disk"
   - This generates a `.certSigningRequest` file
4. Upload the CSR to Apple → Download the `.cer` file
5. Double-click the `.cer` to add it to your Keychain
6. In Keychain Access, find the certificate → right-click → **Export** as `.p12`
   - Set a strong password and save it somewhere safe (you'll need it later for Codemagic)
   - This `.p12` file contains both the certificate and private key

### 3c. Create Provisioning Profile

1. Go to **Profiles** → click **+**
2. Select **App Store Connect** (under Distribution)
3. Select your App ID: `com.temptracker.app`
4. Select your Distribution Certificate
5. Name it: `TempTracker App Store`
6. Download the `.mobileprovision` file

### 3d. Create App Store Connect API Key

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → Users and Access → **Integrations** → **App Store Connect API**
2. Click **+** to generate a new key
3. Name: give it a descriptive name (e.g., `mydevkey`)
4. Access: **Admin**
5. Download the `.p8` file (you can only download this ONCE — save it securely)
6. Note the **Key ID** and **Issuer ID** (you'll need both for Codemagic)

---

## 4. Codemagic CI/CD Setup

Codemagic builds your iOS app in the cloud on a Mac. No local Xcode needed.

### 4a. Connect GitHub

1. Go to [codemagic.io](https://codemagic.io) → sign up/log in
2. Connect your GitHub account
3. Add your repository

### 4b. Add App Store Connect API Key to Codemagic

1. In Codemagic, go to **Teams** → your team → **Integrations**
2. Under **App Store Connect**, click **Add Key**
3. Enter:
   - **Name**: `pradeepdevkey` (must match what you reference in codemagic.yaml)
   - **Issuer ID**: from Apple
   - **Key ID**: `FD9J752NM4`
   - **Upload the .p8 file**

### 4c. Add Code Signing Credentials to Codemagic

1. In Codemagic → Teams → **Code signing identities**
2. **Certificates** tab: Upload your `.p12` distribution certificate + enter its password
3. **Provisioning profiles** tab: Upload your `.mobileprovision` file

These are used by Codemagic to sign your app during the build.

---

## 5. Build Configuration (codemagic.yaml)

Create `codemagic.yaml` in your project root:

```yaml
workflows:
  ios-build:
    name: iOS Build
    max_build_duration: 30
    instance_type: mac_mini_m2
    integrations:
      app_store_connect: pradeepdevkey
    environment:
      ios_signing:
        distribution_type: app_store
        bundle_identifier: com.temptracker.app
      vars:
        XCODE_PROJECT: "ios/App/App.xcodeproj"
        XCODE_SCHEME: "App"
      node: 22
      xcode: latest
    scripts:
      - name: Install dependencies
        script: |
          npm install
      - name: Build web assets
        script: |
          npm run build
      - name: Sync Capacitor iOS
        script: |
          npx cap sync ios
      - name: Increment build number
        script: |
          cd ios/App
          agvtool new-version -all $(($(app-store-connect get-latest-testflight-build-number "$APP_STORE_CONNECT_APP_APPLE_ID") + 1))
      - name: Set up code signing
        script: |
          xcode-project use-profiles
      - name: Build iOS app
        script: |
          xcode-project build-ipa \
            --project "$XCODE_PROJECT" \
            --scheme "$XCODE_SCHEME"
    artifacts:
      - build/ios/ipa/*.ipa
      - /tmp/xcodebuild_logs/*.log
    publishing:
      app_store_connect:
        auth: integration
        submit_to_testflight: true
```

Key things in this config:
- `integrations.app_store_connect` must reference the exact API key name you added in Codemagic
- `ios_signing` tells Codemagic to use your certificate and provisioning profile
- `submit_to_testflight: true` auto-uploads the IPA to TestFlight after build
- `agvtool` auto-increments the build number so each upload is unique
- Build runs on Apple Silicon Mac mini (M2) in the cloud

Commit and push:

```bash
git add codemagic.yaml
git commit -m "Add Codemagic CI/CD config"
git push
```

---

## 6. First Build & Fixing Issues

### 6a. Trigger the Build

In Codemagic dashboard → select your app → **Start new build** → choose the `ios-build` workflow → Start.

### 6b. Common Build Failures We Encountered

**Problem: "No matching provisioning profiles found"**
- Cause: The App ID wasn't registered in Apple Developer Portal, or the provisioning profile bundle ID didn't match `capacitor.config.json`
- Fix: Make sure the bundle ID in Apple Developer Portal, provisioning profile, and `capacitor.config.json` all match exactly

**Problem: Build number conflict**
- Cause: TestFlight rejects duplicate build numbers
- Fix: The `agvtool` script in codemagic.yaml auto-increments this. For the first build, it defaults to 1.

**Problem: Missing app icon**
- Cause: Capacitor's default project has no 1024x1024 icon
- Fix: Add your icon to `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

### 6c. Successful Build

When the build succeeds, Codemagic:
1. Builds the IPA
2. Uploads it to App Store Connect
3. TestFlight processes it (takes 5-15 minutes)
4. You get an email when it's ready for testing

---

## 7. TestFlight

After a successful Codemagic build, the app appears in TestFlight automatically.

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → your app → **TestFlight**
2. The build shows up under **iOS Builds**
3. If you see "Missing Compliance" — click it and select "None of the algorithms mentioned above" (for standard HTTPS-only apps)
4. **Internal Testing**: You can install it on your device immediately via the TestFlight app
5. Test everything works on your actual iPhone

---

## 8. App Store Connect — Create the App

### 8a. Create New App

1. Go to [App Store Connect](https://appstoreconnect.apple.com) → **Apps** → **+** → **New App**
2. Fill in:
   - **Platform**: iOS
   - **Name**: `TempTracker India` (must be unique on the App Store)
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: Select `com.temptracker.app` from dropdown
   - **SKU**: `temptracker-india-2026` (any unique string)
3. Click **Create**

This creates the App Store listing with Apple ID (ours was `6758897079`).

---

## 9. App Store Metadata

Go to your app → **Distribution** → **iOS App** → **1.0 Prepare for Submission**.

### 9a. Promotional Text (170 chars max)

```
Track real-time temperatures across 14 Indian cities with beautiful weather maps, hourly forecasts, and 16-day outlooks.
```

### 9b. Description (4000 chars max)

```
TempTracker India is your premium weather companion for tracking temperatures across India.

Features:
- Real-time temperatures for 14 cities displayed on an interactive India map
- Detailed city weather: current conditions, hourly forecast, and 16-day outlook
- Beautiful animated weather icons for sun, clouds, rain, snow, and thunderstorms
- Comprehensive weather details: humidity, UV index, wind, air quality, pressure, and more
- City list view with search and custom city support
- Temperature trend charts with historical data from January 2026
- Dark theme with premium glassmorphism design
- Zone-based summary view grouping cities by Indian geographic regions
- Works offline after first load

Perfect for travelers, weather enthusiasts, and anyone who wants to stay informed about weather conditions across India.
```

### 9c. Keywords (100 chars max, comma-separated)

```
weather,temperature,India,forecast,tracker,cities,map,hourly,climate,monsoon
```

### 9d. Support URL

A valid URL (GitHub repo, website, or support page):

```
https://github.com/pradeeppeddineni/weather-app
```

### 9e. Version & Copyright

- Version: `1.0`
- Copyright: `2026 Pradeep Peddineni`

### 9f. Build

Select the build uploaded from Codemagic/TestFlight (Build 2 in our case).

---

## 10. Screenshots

Apple requires screenshots for:
- **iPhone 6.5" Display** (1284x2778 or 1242x2688) — **Required**
- **iPad 13" Display** (2048x2732 or 2064x2752) — **Required if app supports iPad**

### 10a. Take Screenshots on Your iPhone

1. Open the app on your iPhone
2. Navigate to each screen you want to showcase
3. Take screenshots (Side button + Volume Up)
4. We captured 6 screenshots:
   - City detail view (main weather screen)
   - Zone summary view
   - Weather news tab
   - Cities list view
   - Temperature heatmap/map view
   - Cities map default view

### 10b. Transfer Screenshots to Your Computer

Transfer via AirDrop, iCloud, or cable. We saved them to `~/Downloads/temptracker ss/` folder.

### 10c. Resize for iPhone 6.5" (1284x2778)

Our iPhone 15 Pro screenshots were 1179x2556 (cropped without status bar). We resized using `sips` (macOS built-in tool):

```bash
mkdir -p screenshots/iphone

# For each screenshot:
# 1. Copy and convert to PNG
sips -s format png "~/Downloads/temptracker ss/IMG_2801.jpg" --out screenshots/iphone/IMG_2801.png

# 2. Scale proportionally to width 1284
sips -Z 2778 --resampleWidth 1284 screenshots/iphone/IMG_2801.png

# 3. Pad height to exactly 2778 with dark background
sips --padToHeightWidth 2778 1284 --padColor 0B0D14 screenshots/iphone/IMG_2801.png
```

Repeat for all 6 screenshots (IMG_2801 through IMG_2806).

The `--padColor` matches your app's background color so the padding is invisible.

### 10d. Resize for iPad 13" (2048x2732)

Same screenshots, different dimensions:

```bash
mkdir -p screenshots/ipad

# For each screenshot:
# 1. Copy and convert to PNG
sips -s format png "~/Downloads/temptracker ss/IMG_2801.jpg" --out screenshots/ipad/IMG_2801.png

# 2. Scale proportionally to height 2732
sips -Z 2732 screenshots/ipad/IMG_2801.png

# 3. Pad width to exactly 2048 with dark background
sips --padToHeightWidth 2732 2048 --padColor 0B0D14 screenshots/ipad/IMG_2801.png
```

### 10e. Upload Screenshots

1. In App Store Connect → Previews and Screenshots
2. **iPhone tab** → Click "Choose File" → Select all 6 iPhone PNGs (1284x2778)
3. **iPad tab** → Click "Choose File" → Select all 6 iPad PNGs (2048x2732)
4. You can upload up to 10 screenshots per device. Only the first 3 appear on the install sheet.

---

## 11. Pricing & Availability

1. Go to **Pricing and Availability** in the left sidebar
2. Click **Set Up Pricing** → Set price to **$0.00 (Free)**
3. Confirm for all 175 countries
4. Go to **App Availability** → Select **All Countries or Regions**
5. Confirm — all countries show "Available on App Release"

---

## 12. Privacy Policy

Apple requires a privacy policy URL. We created `PRIVACY.md` and hosted it (you can use GitHub pages, your website, or any public URL).

Key points to include:
- What data you collect (we collect none)
- What third-party services you use (Open-Meteo API for weather data)
- No analytics, no tracking, no login required
- Contact email

In App Store Connect → **App Privacy**:
- Select data collection practices (we selected "No data collected")
- Enter privacy policy URL

---

## 13. Age Rating & Content Rights

### Age Rating

1. Go to **App Information** → **Age Rating** → **Edit**
2. Answer the questionnaire (violence, adult content, etc.)
3. For a weather app, answer "No" to everything
4. This gives you a **4+** rating

### Content Rights

1. In the version page, you'll be asked: "Does this app contain, show, or access third-party content?"
2. Select **Yes** (we show weather data from Open-Meteo)
3. Confirm you have the rights to use this content (Open-Meteo is a free, open API)

---

## 14. App Review Information

### Contact Info

Provide reviewer contact details:
- First name, Last name
- Phone number
- Email

### Sign-In Info

- If your app has no login: leave "Sign-in required" unchecked

### Notes (Optional)

Any notes for the reviewer about how to test your app.

---

## 15. Submit for Review

1. Click **Save** on the version page
2. Click **Add for Review**
   - This validates all required fields. If anything is missing, it'll show errors.
   - Status changes to **"Ready for Review"**
3. A "Draft Submission" dialog appears → Click **Submit for Review**
   - Status changes to **"Waiting for Review"**
4. Apple reviews within 24-48 hours
5. You'll get an email when approved (or if they request changes)
6. If set to "Automatically release", the app goes live immediately after approval

---

## 16. Common Issues & Fixes

### White space at bottom on iPhone

The native WebView can show a white gap at the bottom of the screen.

**Fix in CSS (`style.css`):**
```css
html {
  background: var(--bg);
  height: 100%;
}
```

**Fix in Capacitor config (`capacitor.config.json`):**
```json
{
  "ios": {
    "backgroundColor": "#0b0d14"
  }
}
```

### Screenshot resolution too low

iPhone screenshots must be exact pixel dimensions. If your phone screenshots are a different resolution:
- Use `sips` on macOS to resize and pad
- Match the padding color to your app's background
- Required: 1284x2778 (iPhone 6.5") and 2048x2732 (iPad 13")

### Build number conflicts

Each upload to App Store Connect needs a unique build number. The `agvtool` line in `codemagic.yaml` handles this automatically by querying the latest TestFlight build number and incrementing it.

### "Missing Compliance" on TestFlight

After upload, Apple asks about encryption. If your app only uses HTTPS (standard web traffic), select "No" for custom encryption. Adding this to `Info.plist` skips the question:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

### Codemagic can't find provisioning profile

Make sure:
1. The App ID is registered in Apple Developer Portal
2. The provisioning profile's bundle ID matches exactly
3. Both the `.p12` certificate AND `.mobileprovision` are uploaded to Codemagic team settings
4. The API key name in `codemagic.yaml` matches the one in Codemagic integrations

### After code changes, trigger a new build

1. Make your code changes locally
2. `npm run build && npx cap sync ios`
3. `git add . && git commit -m "Your changes" && git push`
4. Go to Codemagic → Start new build
5. New build uploads to TestFlight → then update the build in App Store Connect

---

## Quick Reference

| Item | Value |
|------|-------|
| Bundle ID | `com.temptracker.app` |
| App Store ID | *(find in App Store Connect → App Information)* |
| Apple Team ID | *(find in developer.apple.com → Membership)* |
| Codemagic App ID | *(find in Codemagic dashboard → App settings)* |
| API Key Name | *(the name you chose when creating the key)* |
| API Key ID | *(shown in App Store Connect → Integrations)* |
| Distribution Cert | *(the name you gave your certificate)* |
| Provisioning Profile | *(the name you gave your profile)* |

---

## Total Cost

- **Apple Developer Program**: $99/year
- **Codemagic**: Free tier (500 build minutes/month)
- **Open-Meteo API**: Free
- **Everything else**: Free

## Time from Start to App Store

PWA to "Waiting for Review" — done in a few sessions, with most time spent on fixing build configs and preparing screenshots. No Xcode needed at any point.
