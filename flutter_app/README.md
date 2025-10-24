# Intelligent Ambient Beam (Flutter)

This directory contains a Flutter reimplementation of the Intelligent Ambient Beam scooter lighting controller prototype. The app mirrors the layout and behavior of the original Vite/React experience, providing:

- Controls for turn indicators, low beam, high beam and brake lights with RGB and intensity sliders.
- Animation studio panel with selectable scenarios.
- Command log that records the generated AT-style commands (mirroring the original command generator logic).
- Mock Bluetooth connection workflow to simulate device connectivity when testing on desktop or the web.

## Getting started

1. Ensure you have Flutter 3.3 or newer installed and configured (`flutter doctor`).
2. Fetch dependencies:

   ```bash
   flutter pub get
   ```

3. Run the app on your desired platform:

   ```bash
   flutter run
   ```

The command log limits itself to the 50 most recent entries, matching the behavior of the reference implementation.
