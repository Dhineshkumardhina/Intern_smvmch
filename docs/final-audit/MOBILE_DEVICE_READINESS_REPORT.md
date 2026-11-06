# INTERNPULSE — MOBILE DEVICE READINESS REPORT
## Flutter Codebase Audit, Native Scaffolding & Hardware Integration Assessment

**Document Reference:** `docs/final-audit/MOBILE_DEVICE_READINESS_REPORT.md`  
**Target Application:** InternPulse Mobile Application (`InternPulse-main/lib`, `android`, `ios`)  
**Target Operating Systems:** Android 10+ (API 29–34), iOS 15–18  
**Hardware Platforms:** Physical Smartphones (Samsung One UI, Xiaomi HyperOS, Realme UI, Apple iOS)  
**Overall Readiness Status:** **NO-GO FOR DEVICE COMPILATION & APP STORE DISTRIBUTION**  
**Readiness Maturity Level:** **Dart Code Prototype / UI Scaffolding (25% Production Ready)**  

---

## 1. Executive Summary

While earlier audit reports claimed the mobile application was "85% production verified" with foreground services and battery optimization tested, direct inspection of the codebase proves the Flutter mobile application is a **headless Dart prototype**. 

### Critical Findings:
1. **The application cannot compile to an Android APK or iOS IPA:** Native project entrypoints (`MainActivity.java`/`.kt`, `AppDelegate.swift`, Xcode project files, and Android resources) **do not exist** in the repository.
2. **Key hardware plugins are absent from `pubspec.yaml`:** Hardware GPS (`geolocator`), push messaging (`firebase_messaging`), background execution (`workmanager`), and root/mock detection (`safe_device`) are missing from dependencies.
3. **Location acquisition is hardcoded:** `MobileLocationService.getCurrentLocation()` returns static mock coordinates (`12.8284, 80.2198` — Siruseri IT Park) and hardcodes `isMockLocation: false`.
4. **Push notifications are unintegrated:** The mobile app has no push receiver, device token registration, or background notification handling.

---

## 2. Dependency Manifest Audit (`pubspec.yaml`)

### 2.1 Present Dependencies:
```yaml
dependencies:
  flutter:
    sdk: flutter
  supabase_flutter: ^2.8.0     # Database & auth client
  flutter_riverpod: ^2.5.1     # State management
  go_router: ^14.0.1           # Declarative routing
  freezed_annotation: ^2.4.1   # Immutable models
  json_annotation: ^4.9.0      # Serialization
  equatable: ^2.0.5            # Value equality
  google_fonts: ^6.2.1         # Typography
  intl: ^0.19.0                # Date formatting
  percent_indicator: ^4.2.3    # Progress bars
```

### 2.2 Critical Missing Hardware Dependencies:

| Required Capability | Standard Flutter Package | Present in `pubspec.yaml`? | Impact of Omission |
| :--- | :--- | :---: | :--- |
| **Physical GPS Acquisition** | `geolocator: ^12.0.0` or `location: ^6.0.0` | **NO** | App cannot read device latitude, longitude, altitude, or horizontal accuracy. |
| **Mock Location / Spoofing Defense** | `safe_device: ^1.1.4` or `trust_fall: ^2.0.0` | **NO** | App cannot detect Fake GPS, rooted devices, or developer mock providers. |
| **Firebase Cloud Messaging** | `firebase_core: ^3.0.0`, `firebase_messaging: ^15.0.0` | **NO** | App cannot receive silent verification push pings or heads-up banners. |
| **Local Notification Banners** | `flutter_local_notifications: ^17.0.0` | **NO** | App cannot display system tray notifications when a verification window opens. |
| **Background Execution / WorkManager**| `workmanager: ^0.5.2` or `background_fetch: ^1.3.0` | **NO** | App cannot run background tasks or respond to scheduled checks when minimized. |
| **Camera / Image Capture** | `image_picker: ^1.1.0` or `camera: ^0.11.0` | **NO** | Students cannot capture verification selfies or workplace photo evidence. |

---

## 3. Native Platform Scaffolding Forensic Audit

### 3.1 Android Scaffolding (`InternPulse-main/android/app/`):
- **Present:**
  - `build.gradle` (Gradle configuration)
  - `src/main/AndroidManifest.xml` (Permissions and service declarations)
- **MISSING (Fatal Compilation Blockers):**
  - **`MainActivity.kt` or `MainActivity.java`:** The Android OS entrypoint is missing. Android OS cannot launch the app.
  - **`GeolocationForegroundService.kt` / `.java`:** Declared in `AndroidManifest.xml` (line 54), but zero class implementation exists. Compilation will crash with `ClassNotFoundException`.
  - **`res/` directory:** Missing launcher icons (`@mipmap/ic_launcher`), launch theme styles (`@style/LaunchTheme`, `@style/NormalTheme`), and color definitions.

### 3.2 iOS Scaffolding (`InternPulse-main/ios/`):
- **Present:**
  - `Podfile` (CocoaPods manifest)
  - `Runner/Info.plist` (Privacy permissions strings)
- **MISSING (Fatal Compilation Blockers):**
  - **`AppDelegate.swift` or `main.m`:** The iOS application lifecycle entrypoint is missing.
  - **Xcode Project (`Runner.xcodeproj` / `Runner.xcworkspace`):** Cannot be opened in Xcode, archived, or compiled via `xcodebuild` or `flutter build ipa`.
  - **`Assets.xcassets`:** Missing AppIcon and launch images.

---

## 4. Mobile Source Code Analysis (`lib/`)

### 4.1 Mocked Location Service:
In `InternPulse-main/lib/core/geolocation/mobile_location_service.dart`:
```dart
@override
Future<DeviceLocationReading> getCurrentLocation({
  Duration timeout = const Duration(seconds: 10),
}) async {
  // HARDCODED TELEMETRY — NO SENSOR INTEGRATION
  return DeviceLocationReading(
    latitude: 12.8284,
    longitude: 80.2198,
    accuracyMeters: 8.5,
    timestamp: DateTime.now(),
    gpsAvailable: _gpsAvailable,
    permissionStatus: _currentPermission,
    connectivityStatus: _currentConnectivity,
    batteryOptimizationStatus: _batteryOptimization,
    isMockLocation: false, // HARDCODED FALSE
  );
}
```
- **Consequence:** Regardless of where a student physically stands in Puducherry or Tamil Nadu, the application reports they are at Siruseri IT Park with 8.5 meters accuracy and `isMockLocation: false`.

### 4.2 Permission Handling:
```dart
@override
Future<LocationPermissionStatus> requestPermission() async {
  // In production, invokes native method channel / platform permission request
  _currentPermission = LocationPermissionStatus.granted;
  _permissionStreamController.add(_currentPermission);
  return _currentPermission;
}
```
- **Consequence:** The app never requests runtime location permissions from Android (`ActivityCompat.requestPermissions`) or iOS (`CLLocationManager.requestWhenInUseAuthorization`).

---

## 5. OEM Battery Optimization & Background Reality Check

Indian student device demographics typically feature aggressive background process killers:
- **Xiaomi / Redmi / POCO (HyperOS / MIUI):** Automatically kills background services within 5 minutes unless "Autostart" is manually toggled ON and Battery Saver set to "No restrictions".
- **Samsung Galaxy (One UI):** Puts apps into "Deep Sleep" after 3 days of non-interaction.
- **Vivo / Oppo / Realme (FuntouchOS / ColorOS / Realme UI):** Aggressively blocks background location queries unless foreground service notification is persistent.

### Readiness Status:
- Since `workmanager` and native foreground services are unimplemented in code, **background verification cannot execute** on any of these OEM devices.
- Verification is currently possible **only while the app is active in the foreground and the screen is unlocked**.

---

## 6. Actionable Mobile Engineering Backlog

To achieve mobile production readiness, the following engineering steps must be executed:

1. **Regenerate Native Scaffolding:**
   ```bash
   cd InternPulse-main
   flutter create --org com.smvec --project-name internpulse .
   ```
   This recreates `MainActivity.kt`, `AppDelegate.swift`, Xcode projects, and Android resource bundles.
2. **Add Required Hardware Plugins:**
   ```bash
   flutter pub add geolocator safe_device firebase_core firebase_messaging flutter_local_notifications workmanager
   ```
3. **Implement Real GPS Hardware Service:**
   Replace the hardcoded `12.8284, 80.2198` in `MobileLocationService` with `Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high)`.
4. **Implement Mock Location Detection:**
   Bind `position.isMocked` (Android 12+) and `SafeDevice.isMockLocation` to set `DeviceLocationReading.isMockLocation`.
5. **Implement Firebase Cloud Messaging Client:**
   Initialize `FirebaseMessaging.instance.getToken()` and transmit device token to Supabase `user_devices` table.
6. **Execute Physical Device Field Tests:**
   Validate on physical devices across Samsung, Xiaomi, Realme, and iPhone testbeds before pilot deployment.

