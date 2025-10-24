
  # Scooter Smartlight Control App

  This is a code bundle for Scooter Smartlight Control App. <br>
  The application is available at [Scooter-Smartlight-Control-App](https://i-ab.vercel.app/).

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

## Flutter reimplementation

The repository now also contains a Flutter port of the application in [`flutter_app/`](flutter_app/). To explore the Flutter version:

1. Install Flutter 3.3 or newer and run `flutter doctor` to verify your setup.
2. Navigate to `flutter_app/` and run `flutter pub get`.
3. Launch the application with `flutter run` on your desired target (web, desktop, or mobile).
4. Use the Connect button in the Flutter UI to pair with your scooter's BLE controller. The app now uses `flutter_blue_plus` to send the same AT commands as the web experience.
  
