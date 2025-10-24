# Intelligent Ambient Beam (Flutter)

This directory contains a Flutter reimplementation of the Intelligent Ambient Beam scooter lighting controller prototype. The app mirrors the layout and behavior of the original Vite/React experience, providing:

- Controls for turn indicators, low beam, high beam and brake lights with RGB and intensity sliders.
- Animation studio panel with selectable scenarios.
- Command log that records the generated AT-style commands (mirroring the original command generator logic).
- Native Bluetooth Low Energy workflow that mirrors the Web Bluetooth/HC-05 integration from the React app.

## Getting started

1. Ensure you have Flutter 3.3 or newer installed and configured (`flutter doctor`).
2. Fetch dependencies:

   ```bash
   flutter pub get
   ```

3. (Android only) Update `android/app/src/main/AndroidManifest.xml` with the required Bluetooth permissions if you plan to sideload the build. The `flutter_blue_plus` documentation lists the minimal set for each API level.

4. Run the app on your desired platform:

   ```bash
   flutter run
   ```

## Connecting to a scooter controller

1. Tap **Connect** to open the discovery sheet. The Flutter app scans for HM-10/HC-05 style controllers using the default UUIDs (`0000ffe0` service, `0000ffe1` characteristic).
2. Select your controller from the list. The app will pair, discover the writable characteristic and acknowledge the connection in the log.
3. Adjust light or animation controls. Each change emits the AT command over BLE and records the exact bytes in the command log.
4. If your hardware uses different UUIDs, update the values in the sheet before pairing. The inputs persist for the next session.

The command log limits itself to the 50 most recent entries, matching the behavior of the reference implementation.
