# INTERNPULSE — PHASE 19F: MOBILE SECURITY AUDIT REPORT
## Flutter Codebase Security Review, Native Android/iOS Scaffolding & Device Integrity Assessment

**Document Reference:** `docs/phase19f/PHASE19F_MOBILE_SECURITY_REPORT.md`  
**Audit Standard:** OWASP Mobile Application Security Verification Standard (MASVS v2.0), OWASP Mobile Top 10 (2024)  
**Target Application:** InternPulse Mobile Application (`InternPulse-main/lib/`, `android/`, `ios/`)  
**Target Operating Systems:** Android 10+ (API 29–34), iOS 15–18  
**Audit Status:** Completed Read-Only Inspection  
**Mobile Security Verdict:** **NO-GO FOR DEVICE COMPILATION & APP STORE DISTRIBUTION**  

---

## 1. Executive Summary

A comprehensive mobile security review of the Flutter codebase was conducted, covering authentication tokens, hardware permissions, location anti-spoofing, local caching, native platform scaffolding, and device integrity.

### Critical Audit Findings:
1. **Fatal Compilation Scaffolding Gap:** The mobile application cannot compile to a native Android APK or iOS IPA. Native platform entrypoints ([`MainActivity.kt`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/android/app/src/main/), [`AppDelegate.swift`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/ios/Runner/), Xcode project files, and Android resources) are completely missing from the repository.
2. **Missing Hardware Security Plugins in `pubspec.yaml`:** Hardware GPS (`geolocator`), root/jailbreak detection (`safe_device`), push messaging (`firebase_messaging`), and background execution (`workmanager`) are absent from the dependency manifest.
3. **Hardcoded Mock Telemetry:** [`mobile_location_service.dart`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/core/geolocation/mobile_location_service.dart#L101-L111) returns static coordinates (`12.8284, 80.2198` — Siruseri IT Park) with `isMockLocation: false`, bypassing real sensor anti-tamper logic.
4. **Unencrypted SharedPreferences Token Storage:** `supabase_flutter` stores GoTrue session tokens in standard Android `SharedPreferences` and iOS `UserDefaults` without utilizing hardware-backed Android Keystore or iOS Keychain encryption.
5. **Foreground Service Class Missing:** `AndroidManifest.xml` declares `GeolocationForegroundService`, but zero Kotlin or Java class file exists, causing immediate runtime crashes upon service initialization.

---

## 2. Native Platform Scaffolding Forensic Audit

### 2.1 Android Scaffolding Forensic Breakdown:
In `InternPulse-main/android/app/`:
```
android/app/
├── build.gradle                          [PRESENT]
└── src/main/
    └── AndroidManifest.xml               [PRESENT]
```

#### Fatal Scaffolding Gaps:
- **Missing `MainActivity`:** There is no `MainActivity.kt` or `MainActivity.java`. Android OS has no Activity class to instantiate when the user taps the app icon.
- **Missing Service Implementation:** Line 54 of `AndroidManifest.xml` states:
  ```xml
  <service
      android:name="com.smvec.internpulse.GeolocationForegroundService"
      android:enabled="true"
      android:exported="false"
      android:foregroundServiceType="location" />
  ```
  Zero Java/Kotlin source file exists under `src/main/java/` or `src/main/kotlin/`. If invoked, Android OS throws `ClassNotFoundException`.
- **Missing Resource Assets:** The directory `src/main/res/` does not exist. References to `@mipmap/ic_launcher`, `@style/LaunchTheme`, and `@style/NormalTheme` in `AndroidManifest.xml` fail compilation (`AAPT: error: resource not found`).

### 2.2 iOS Scaffolding Forensic Breakdown:
In `InternPulse-main/ios/`:
```
ios/
├── Podfile                               [PRESENT]
└── Runner/
    └── Info.plist                        [PRESENT]
```

#### Fatal Scaffolding Gaps:
- **Missing `AppDelegate`:** There is no `AppDelegate.swift` or `main.m` to handle iOS application lifecycle, push notification delegates, or background fetch callbacks.
- **Missing Xcode Project:** There is no `Runner.xcodeproj` or `Runner.xcworkspace`. The project cannot be opened in Xcode, signed with an Apple Developer Team ID, or built with `xcodebuild`.
- **Missing `Assets.xcassets`:** No iOS AppIcon or LaunchImage sets exist.

---

## 3. Dependency Manifest Security Audit (`pubspec.yaml`)

### 3.1 Inspection of `InternPulse-main/pubspec.yaml`:
```yaml
dependencies:
  flutter:
    sdk: flutter
  supabase_flutter: ^2.8.0
  flutter_riverpod: ^2.5.1
  go_router: ^14.0.1
  freezed_annotation: ^2.4.1
  json_annotation: ^4.9.0
  equatable: ^2.0.5
  google_fonts: ^6.2.1
  intl: ^0.19.0
  percent_indicator: ^4.2.3
```

### 3.2 Security Impact of Absent Plugins:

| Security Capability | Required Plugin | Present? | Security Vulnerability / Impact |
| :--- | :--- | :---: | :--- |
| **Real Hardware GPS** | `geolocator: ^12.0.0` | **NO** | App cannot query physical GPS chips. |
| **Anti-Spoofing & Root Detection**| `safe_device: ^1.1.4` | **NO** | Cannot detect Magisk root, Frida hooks, emulator environments, or Fake GPS spoofing apps. |
| **Secure Token Storage** | `flutter_secure_storage: ^9.2.0` | **NO** | Session JWT tokens stored in plain XML / plist without hardware encryption. |
| **Push Notification Receiver** | `firebase_messaging: ^15.0.0` | **NO** | App cannot receive silent background verification triggers or window alerts. |
| **Background Execution Worker** | `workmanager: ^0.5.2` | **NO** | App killed by OEM battery savers when minimized; cannot perform scheduled checks. |

---

## 4. Location Spoofing, Tampering & Mock Location Defense

### 4.1 Mock Location Architecture in Code:
In [`geolocationVerificationEngine.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/geolocation/geolocationVerificationEngine.ts#L70-L78):
```typescript
// 0. Mock Location / GPS Spoofing Check (Anti-Tampering Guard)
if (measurement.isMockLocation) {
  return {
    ...baseResult,
    distanceFromAssignedLocation: null,
    verificationResult: 'LOCATION_UNAVAILABLE',
    remarks: 'Verification rejected: Mock location provider detected. Physical GPS sensor telemetry is required.',
  };
}
```
- **Architectural Design:** Cleanly maps mock location attempts to `LOCATION_UNAVAILABLE` rather than immediately issuing a disciplinary absence penalty.

### 4.2 The Client-Side Implementation Gap:
In [`mobile_location_service.dart`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/core/geolocation/mobile_location_service.dart#L101-L111):
```dart
return DeviceLocationReading(
  latitude: 12.8284,
  longitude: 80.2198,
  accuracyMeters: 8.5,
  timestamp: DateTime.now(),
  gpsAvailable: _gpsAvailable,
  permissionStatus: _currentPermission,
  connectivityStatus: _currentConnectivity,
  batteryOptimizationStatus: _batteryOptimization,
  isMockLocation: false, // HARDCODED TO FALSE
);
```
- **Finding:** Because `isMockLocation` is hardcoded to `false` in Dart, real student devices running Mock Mock Locations (Xposed framework) or Android Developer Mode Mock Providers will completely bypass detection until hardware GPS integration is completed.

---

## 5. Token Persistence & Local Cache Security

### 5.1 Storage Mechanism:
- `supabase_flutter: ^2.8.0` defaults to standard `SharedPreferences` on Android (`/data/data/com.smvec.internpulse/shared_prefs/`) and `NSUserDefaults` on iOS.
- On rooted Android devices or jailbroken iPhones, standard shared preferences are readable by any process with root access or via backup extraction (`adb backup`).
- **Remediation:** Configure `supabase_flutter` to use `flutter_secure_storage` backed by Android Keystore (KeyStore provider: `AndroidKeyStore`) and iOS Keychain Services (`kSecClassGenericPassword`).

---

## 6. Actionable Mobile Security Findings Register

### Finding MOB-01: Fatal Missing Native Android Scaffolding & Activity Entrypoints
- **Severity:** **CRITICAL**
- **Affected Component:** `InternPulse-main/android/app/`
- **Evidence:** `MainActivity.kt` / `MainActivity.java` and `res/` are missing. Only `build.gradle` and `AndroidManifest.xml` exist.
- **Potential Impact:** Application cannot compile to an Android Package Kit (APK) or Android App Bundle (AAB). Mobile distribution is completely halted.
- **Remediation:** Run `flutter create --org com.smvec --project-name internpulse .` inside `InternPulse-main` to generate clean native platform bindings.
- **Verification Criteria:** Executing `flutter build apk --debug` completes with exit code 0.
- **Status:** **OPEN / CONFIRMED**

### Finding MOB-02: Missing iOS Xcode Project & AppDelegate Lifecycle Bindings
- **Severity:** **CRITICAL**
- **Affected Component:** `InternPulse-main/ios/`
- **Evidence:** `Runner.xcodeproj`, `AppDelegate.swift`, and `Assets.xcassets` do not exist.
- **Potential Impact:** Application cannot be compiled for iOS devices, archived for TestFlight, or distributed on the Apple App Store.
- **Remediation:** Recreate iOS scaffolding via Flutter CLI and generate a valid CocoaPods `Podfile.lock`.
- **Verification Criteria:** `flutter build ios --no-codesign` generates a valid `build/ios/iphoneos/Runner.app`.
- **Status:** **OPEN / CONFIRMED**

### Finding MOB-03: Hardcoded GPS Telemetry Bypassing Physical Location Sensors
- **Severity:** **HIGH**
- **Affected Component:** `InternPulse-main/lib/core/geolocation/mobile_location_service.dart`
- **Evidence:** Lines 101–111 return hardcoded coordinates (`12.8284, 80.2198`).
- **Potential Impact:** Students anywhere in the world will always be recorded as physically present at Siruseri IT Park with 8.5m accuracy. Real attendance verification is completely inoperative on mobile.
- **Remediation:** Integrate `geolocator: ^12.0.0` and bind `Geolocator.getCurrentPosition()` to populate `DeviceLocationReading`.
- **Verification Criteria:** Changing physical GPS coordinates on a real device reflects accurate latitude and longitude in telemetry readings.
- **Status:** **OPEN / CONFIRMED**

### Finding MOB-04: Unencrypted Authentication Token Storage
- **Severity:** **MEDIUM**
- **Affected Component:** `InternPulse-main/lib/core/auth/supabase_auth_service.dart`
- **Evidence:** Uses default unencrypted SharedPreferences storage without Android Keystore / iOS Keychain encryption.
- **Potential Impact:** Malicious apps on compromised/rooted devices can extract bearer JWT tokens from disk and impersonate students or mentors.
- **Remediation:** Configure `Supabase.initialize()` with `localStorage: SecureLocalStorage()` using `flutter_secure_storage`.
- **Verification Criteria:** Tokens stored in Keychain / Keystore; absent from plain XML in `shared_prefs`.
- **Status:** **OPEN / CONFIRMED**

### Finding MOB-05: Missing Root & Mock Location Detection Plugins
- **Severity:** **HIGH**
- **Affected Component:** `InternPulse-main/pubspec.yaml`, `mobile_location_service.dart`
- **Evidence:** `safe_device` or `trust_fall` packages are absent from `pubspec.yaml`.
- **Potential Impact:** Students can utilize standard Play Store mock GPS applications (e.g. "Fake GPS Location") to spoof presence at industrial internship sites without detection.
- **Remediation:** Add `safe_device: ^1.1.4`, query `SafeDevice.isMockLocation` and `SafeDevice.isJailBroken`, and map positive detections to `LOCATION_UNAVAILABLE`.
- **Verification Criteria:** Enabling developer mock location provider in Android settings forces `isMockLocation: true`.
- **Status:** **OPEN / CONFIRMED**

